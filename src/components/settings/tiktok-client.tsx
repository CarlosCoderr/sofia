"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 022 — Conexión del canal de TikTok.
 *
 * Una sola fuente: Zernio (TikTok no entrega mensajes a una app propia). Misma
 * forma que los demás canales: la llave se prueba contra la plataforma ANTES
 * de guardar, se cifra, y hacia fuera solo se enseña su cola. La pantalla solo
 * existe si el canal está encendido con `CHANNELS` (ADR-001).
 *
 * TikTok impone reglas que ningún otro canal tiene. Se dicen aquí, antes de
 * conectar, para que nadie las descubra con un mensaje rechazado.
 */

type Connection = {
  accountRef: string;
  username: string | null;
  status: "connected" | "reconnect_required";
  tokenLast4: string;
  hasWebhookSecret: boolean;
};

type WebhookInfo = { tiktokUrl: string | null };

const PASOS = [
  "La cuenta se vincula en el panel de Zernio, no desde aquí. Copia de ahí el accountId de la cuenta de TikTok conectada.",
  "La API key se crea en Zernio → Settings → API Keys y se muestra una sola vez (empieza con sk_).",
  "El secreto del webhook es opcional pero recomendado: con él se verifica la firma de cada entrega.",
];

const REGLAS = [
  "La cuenta tiene que ser TikTok Business, registrada fuera de la Unión Europea, Suiza y Reino Unido, y con los mensajes directos abiertos.",
  "Tú no puedes iniciar una conversación: solo contestar a quien te escribió.",
  "Después del último mensaje del cliente puedes mandar hasta 10 mensajes, durante 48 horas. Para seguir, el cliente tiene que volver a escribir.",
  "Cada mensaje es texto, de hasta 6,000 caracteres. Todavía no se envían imágenes desde aquí.",
];

export function TiktokClient() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [webhook, setWebhook] = useState<WebhookInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [accountRef, setAccountRef] = useState("");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refetch = useCallback(async () => {
    const [c, w] = await Promise.all([
      fetch("/api/settings/tiktok").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/settings/webhook").then((r) => (r.ok ? r.json() : null)),
    ]).catch(() => [null, null]);
    if (c) {
      setConnection(c.connection);
      if (c.connection) {
        setAccountRef(c.connection.accountRef);
        if (c.connection.username) setUsername(c.connection.username);
      }
    }
    if (w) setWebhook(w);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(null);
    const res = await fetch("/api/settings/tiktok", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountRef: accountRef.trim(),
        username: username.trim() || null,
        token: token.trim(),
        webhookSecret: webhookSecret.trim() || null,
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo conectar la cuenta");
      return;
    }
    setToken("");
    setWebhookSecret("");
    setSaved("Conexión guardada");
    void refetch();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // sin portapapeles (contexto no seguro): el texto sigue visible
    }
  }

  if (!loaded) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  const canSave = token.trim().length > 0 && accountRef.trim().length > 0;

  return (
    <div className="max-w-3xl space-y-6">
      {connection?.status === "reconnect_required" && (
        <div className="flex items-start gap-2 rounded-lg border border-danger-soft bg-danger-tint p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-danger-text">
              La API key de Zernio expiró o fue revocada.
            </p>
            <p className="text-danger-text opacity-80">
              Los envíos por TikTok están pausados. Pega una nueva abajo para
              reconectar.
            </p>
          </div>
        </div>
      )}

      {connection?.status === "connected" && (
        <div className="flex items-center gap-3 rounded-lg border border-success-soft bg-success-tint p-4">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-success-text">
              Conectado por Zernio
              {connection.username ? `: @${connection.username}` : ""}
            </p>
            <p className="text-success-text opacity-80">
              Cuenta {connection.accountRef} · llave que termina en ····
              {connection.tokenLast4}
              {connection.hasWebhookSecret ? " · firma del webhook activa" : ""}
            </p>
          </div>
          <Badge variant="success">TikTok activo</Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Antes de conectar: lo que TikTok exige</CardTitle>
          <CardDescription>
            No son límites de este CRM: los pone TikTok a los mensajes directos
            de una cuenta de negocio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-2">
            {REGLAS.map((regla, i) => (
              <li key={i}>{regla}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{connection ? "Reconectar TikTok" : "Conectar TikTok"}</CardTitle>
          <CardDescription>
            Los mensajes directos de tu cuenta entran a la misma bandeja que
            WhatsApp, con su distintivo de canal. Llegan por Zernio, con tu
            propia cuenta de Zernio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-xs text-text-2">
            {PASOS.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tt-account">accountId de Zernio</Label>
              <Input
                id="tt-account"
                value={accountRef}
                onChange={(e) => setAccountRef(e.target.value)}
                placeholder="665f1c2e8b3a4d0012345678"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tt-username">Usuario de TikTok (opcional)</Label>
              <Input
                id="tt-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tunegocio"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tt-token">API key de Zernio</Label>
              <Input
                id="tt-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="sk_…"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tt-secret">Secreto del webhook (opcional)</Label>
              <Input
                id="tt-secret"
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="el mismo que pusiste en Zernio"
                autoComplete="off"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-success-text">{saved} ✓</p>}

          <Button disabled={saving || !canSave} onClick={() => void save()}>
            {saving ? "Probando…" : "Probar y guardar"}
          </Button>
        </CardContent>
      </Card>

      {webhook?.tiktokUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook de TikTok</CardTitle>
            <CardDescription>
              En Zernio, da de alta este endpoint con el evento{" "}
              <code>message.received</code> y, si usas secreto, el mismo que
              pegaste arriba.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>URL de callback</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhook.tiktokUrl} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copiar la URL"
                  onClick={() => void copy(webhook.tiktokUrl!)}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="flex items-start gap-2 text-xs text-text-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Zernio entrega todas las cuentas de tu llave por el mismo
              webhook. Si ya tienes uno dado de alta para Instagram o
              Messenger, sirve también para TikTok: no hace falta otro. Si
              compartes la llave con otros negocios, limita el webhook a esta
              cuenta desde Zernio (accountIds).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
