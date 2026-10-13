import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { MetaApiError } from "@/lib/meta/client";
import {
  channelDisabledResponse,
  isChannelEnabled,
} from "@/server/channels/enabled";
import {
  getTiktokCredentialsByOrg,
  saveTiktokCredentials,
  tokenLast4,
} from "@/server/tiktok/credentials";
import { verifyZernioToken } from "@/server/zernio";

export const dynamic = "force-dynamic";

/** 022 — Estado de la conexión de TikTok (la llave nunca sale entera). */
export const GET = withAuth(async (session) => {
  if (!isChannelEnabled("tiktok")) return channelDisabledResponse();
  const creds = await getTiktokCredentialsByOrg(session.organizationId);
  if (!creds) return Response.json({ connection: null });
  return Response.json({
    connection: {
      source: creds.source,
      accountRef: creds.accountRef,
      username: creds.username,
      status: creds.status,
      tokenLast4: tokenLast4(creds.token),
      hasWebhookSecret: Boolean(creds.webhookSecret),
    },
  });
});

const putSchema = z.object({
  /** `accountId` de la cuenta de TikTok en Zernio. */
  accountRef: z.string().trim().min(1),
  /** Usuario de TikTok, solo para enseñarlo: no enruta nada. */
  username: z.string().trim().min(1).max(100).nullish(),
  token: z.string().trim().min(1),
  webhookSecret: z.string().trim().min(1).nullish(),
});

/**
 * Guarda la conexión validando ANTES la llave contra Zernio, igual que los
 * demás canales: una llave que no sirve no llega a la base. Solo el
 * propietario de la organización puede hacerlo.
 */
export const PUT = withAuth(async (session, req: Request) => {
  if (!isChannelEnabled("tiktok")) return channelDisabledResponse();
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede conectar TikTok");
  }
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;

  try {
    await verifyZernioToken(body.data.token);
  } catch (err) {
    if (err instanceof MetaApiError) {
      if (err.status === 0 || err.status >= 500) {
        return apiError(
          503,
          "platform_unavailable",
          "No se pudo contactar a Zernio; intenta de nuevo"
        );
      }
      return apiError(422, "invalid_token", "La API key de Zernio no es válida");
    }
    throw err;
  }

  const username = body.data.username?.replace(/^@/, "") || null;
  await saveTiktokCredentials({
    organizationId: session.organizationId,
    accountRef: body.data.accountRef,
    username,
    token: body.data.token,
    webhookSecret: body.data.webhookSecret ?? null,
  });

  return Response.json({ ok: true, username });
});
