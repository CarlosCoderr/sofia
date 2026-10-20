/**
 * Crear una cuenta POR BACKEND: `pnpm crear-usuario` (local) o
 * `node crear-usuario.mjs` dentro del contenedor.
 *
 * La app ya no tiene pantalla de registro ni acepta registros por HTTP: las
 * cuentas las crea quien administra el servidor, con este comando, o el
 * propietario desde Ajustes → Equipo. En una instancia vacía, la primera cuenta
 * crea la organización y queda como propietaria (con pipeline y perfil del
 * agente sembrados); las siguientes se unen a esa organización.
 *
 * Uso (bash):
 *   NEW_PASSWORD='contraseña-segura' pnpm crear-usuario correo@ejemplo.com "Nombre Apellido" [propietario|administrador|equipo]
 * Uso (PowerShell):
 *   $env:NEW_PASSWORD='contraseña-segura'; pnpm crear-usuario correo@ejemplo.com "Nombre Apellido" [rol]
 *
 * La contraseña va por variable de entorno y no por argumento: un argumento
 * queda en el historial del shell y es visible en `ps`. El rol solo aplica
 * cuando ya existe una organización; la primera cuenta siempre es propietaria.
 *
 * Se bundlea con esbuild (alias @ → ./src), igual que el seed.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { PG_CONNECTION_OPTIONS } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import * as schema from "@/lib/db/schema";
import { onUserCreated } from "@/server/auth/on-signup";

const MIN_PASSWORD_LENGTH = 8;

const ROLES = {
  propietario: "owner",
  owner: "owner",
  administrador: "admin",
  admin: "admin",
  equipo: "member",
  member: "member",
} as const;

function loadEnvVar(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const env = readFileSync(".env", "utf8");
    const line = env.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

function fail(message: string): never {
  console.error(`[crear-usuario] ${message}`);
  process.exit(1);
}

const [emailArg, nameArg, roleArg] = process.argv.slice(2);
const password = process.env.NEW_PASSWORD;

if (!emailArg || !nameArg || !password) {
  fail(
    "Faltan datos.\n" +
      "  bash:       NEW_PASSWORD='...' pnpm crear-usuario correo@ejemplo.com \"Nombre Apellido\" [propietario|administrador|equipo]\n" +
      "  PowerShell: $env:NEW_PASSWORD='...'; pnpm crear-usuario correo@ejemplo.com \"Nombre Apellido\" [rol]"
  );
}

const email = z.string().trim().toLowerCase().email().safeParse(emailArg);
if (!email.success) fail("El correo no es válido.");
const name = nameArg.trim();
if (name.length < 2 || name.length > 80) fail("El nombre lleva entre 2 y 80 caracteres.");
if (password.length < MIN_PASSWORD_LENGTH) {
  fail(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
}
const requestedRole = roleArg ? ROLES[roleArg.toLowerCase() as keyof typeof ROLES] : undefined;
if (roleArg && !requestedRole) fail("El rol es propietario, administrador o equipo.");

const url = loadEnvVar("DATABASE_URL");
if (!url) fail("DATABASE_URL no está definida (ni en el entorno ni en .env).");

const sql = postgres(url, { max: 1, ...PG_CONNECTION_OPTIONS });
const db = drizzle(sql, { schema });

try {
  const [existing] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email.data))
    .limit(1);
  if (existing) fail("Ya existe una cuenta con ese correo.");

  // El mismo hash con el que el inicio de sesión verifica (ver reset-password.mjs).
  const hash = await hashPassword(password);
  const userId = randomBytes(16).toString("hex");

  await db.insert(schema.user).values({
    id: userId,
    name,
    email: email.data,
    emailVerified: false,
  });
  await db.insert(schema.account).values({
    id: randomBytes(16).toString("hex"),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hash,
  });

  // En una instancia vacía crea la organización y deja a esta cuenta como
  // propietaria; si ya hay una, no hace nada y se une como miembro.
  await onUserCreated(userId, name, db);

  const [membership] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(eq(schema.member.userId, userId))
    .limit(1);

  let role = membership?.role;
  if (!role) {
    const [org] = await db.select({ id: schema.organization.id }).from(schema.organization).limit(1);
    if (!org) fail("No hay organización a la que unir la cuenta.");
    role = requestedRole ?? "member";
    await db.insert(schema.member).values({
      id: newId("member"),
      organizationId: org.id,
      userId,
      role,
    });
  } else if (requestedRole && requestedRole !== role) {
    console.warn(
      "[crear-usuario] Es la primera cuenta de la instancia: queda como propietaria, sin importar el rol pedido."
    );
  }

  const etiqueta = role === "owner" ? "propietario" : role === "admin" ? "administrador" : "equipo";
  console.log(`[crear-usuario] Cuenta creada: ${email.data} (${etiqueta}). Ya puede iniciar sesión.`);
} finally {
  await sql.end();
}
