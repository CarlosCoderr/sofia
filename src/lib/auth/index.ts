import { AsyncLocalStorage } from "node:async_hooks";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, organization } from "better-auth/plugins";
import { getDb, schema } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { AUTH_RATE_LIMIT, checkRateLimit, clientIp } from "@/lib/rate-limit";
import {
  onUserCreated,
  resolveActiveOrganizationId,
} from "@/server/auth/on-signup";
import {
  isBlockedEmailOtpPath,
  REQUEST_RESET_PATH,
  RESET_CODE_LENGTH,
  RESET_CODE_MAX_ATTEMPTS,
  RESET_CODE_TTL_SECONDS,
  RESET_PASSWORD_PATH,
  sendResetCode,
} from "@/server/auth/password-reset";
import { isPublicSignupAllowed } from "@/server/auth/registration";
import { passwordResetAvailable } from "@/server/email/config";

/**
 * Contexto interno del proceso: permite que el alta de cuentas de equipo
 * (owner → API) atraviese el gate de registro cerrado. No es alcanzable
 * desde fuera: solo envuelve llamadas server-side.
 */
const globalForSignup = globalThis as unknown as {
  __voceroInternalSignup?: AsyncLocalStorage<boolean>;
};

// En globalThis: los módulos pueden evaluarse más de una vez (una por ruta en
// dev) y todas las copias deben compartir el mismo contexto.
function internalSignupContext(): AsyncLocalStorage<boolean> {
  if (!globalForSignup.__voceroInternalSignup) {
    globalForSignup.__voceroInternalSignup = new AsyncLocalStorage<boolean>();
  }
  return globalForSignup.__voceroInternalSignup;
}

export function runInternalSignup<T>(fn: () => Promise<T>): Promise<T> {
  return internalSignupContext().run(true, fn);
}

function isInternalSignup(): boolean {
  return internalSignupContext().getStore() === true;
}

const RATE_LIMITED_PATHS = new Set([
  "/sign-in/email",
  "/sign-up/email",
  REQUEST_RESET_PATH,
  RESET_PASSWORD_PATH,
]);

/** Pedir el código: pocos por correo, para no usar el CRM como bomba de correo. */
const RESET_REQUEST_PER_EMAIL = { windowMs: 10 * 60 * 1000, max: 3 };

function createAuth() {
  const env = getEnv();
  return betterAuth({
    baseURL: env.APP_BASE_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        organization: schema.organization,
        member: schema.member,
        invitation: schema.invitation,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      // Quien restablece la contraseña es porque alguien más pudo tenerla: se
      // cierran las sesiones abiertas.
      revokeSessionsOnPasswordReset: true,
    },
    plugins: [
      organization({ creatorRole: "owner" }),
      // Restablecer la contraseña con un código por correo. El código se guarda
      // hasheado, vence y se invalida tras unos intentos. Solo se exponen las dos
      // rutas del restablecimiento (ver el hook de abajo).
      emailOTP({
        otpLength: RESET_CODE_LENGTH,
        expiresIn: RESET_CODE_TTL_SECONDS,
        allowedAttempts: RESET_CODE_MAX_ATTEMPTS,
        storeOTP: "hashed",
        disableSignUp: true,
        sendVerificationOTP: sendResetCode,
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // Rate limit por IP en login/registro (FR-062): 10 / 10 min → 429.
        if (RATE_LIMITED_PATHS.has(ctx.path)) {
          const ip = clientIp(ctx.headers);
          const result = checkRateLimit(`${ctx.path}:${ip}`, AUTH_RATE_LIMIT);
          if (!result.allowed) {
            throw new APIError("TOO_MANY_REQUESTS", {
              message: "Demasiados intentos; espera unos minutos",
            });
          }
        }
        // El plugin de códigos trae rutas que nadie pidió (entrar solo con un
        // código, verificar o cambiar el correo): 404.
        if (isBlockedEmailOtpPath(ctx.path)) {
          throw new APIError("NOT_FOUND", { message: "No existe" });
        }
        if (ctx.path === REQUEST_RESET_PATH) {
          // Sin un servidor de correo no hay a dónde mandar el código.
          if (!passwordResetAvailable()) {
            throw new APIError("SERVICE_UNAVAILABLE", {
              message: "El restablecimiento por correo no está configurado",
            });
          }
          const email = String(
            (ctx.body as { email?: unknown } | undefined)?.email ?? ""
          ).toLowerCase();
          const byEmail = checkRateLimit(`reset-request:${email}`, RESET_REQUEST_PER_EMAIL);
          if (!byEmail.allowed) {
            throw new APIError("TOO_MANY_REQUESTS", {
              message: "Demasiados intentos; espera unos minutos",
            });
          }
        }
        // Registro por HTTP cerrado: las cuentas se crean por backend (FR-060).
        if (ctx.path === "/sign-up/email") {
          if (!isInternalSignup() && !(await isPublicSignupAllowed())) {
            throw new APIError("FORBIDDEN", {
              message:
                "El registro está deshabilitado: las cuentas las crea quien administra el servidor",
            });
          }
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await onUserCreated(user.id, user.name);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const organizationId = await resolveActiveOrganizationId(
              session.userId
            );
            return {
              data: { ...session, activeOrganizationId: organizationId },
            };
          },
        },
      },
    },
  });
}

type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { __voceroAuth?: Auth };

export function getAuth(): Auth {
  if (!globalForAuth.__voceroAuth) globalForAuth.__voceroAuth = createAuth();
  return globalForAuth.__voceroAuth;
}
