# Tasks — 022 Canal de TikTok

## Datos

- [ ] T001 `tiktok` en `Channel`; tabla `tiktokCredentials` en `schema.ts`
- [ ] T002 `pnpm db:generate` → `0018_canal_tiktok`; migrar una base en `0017`

## Núcleo

- [ ] T003 Capacidades: `maxTextChars`, `maxOutboundPerWindow`, ventana de 48 h
- [ ] T004 La ventana se pregunta por canal (`window.ts` y quienes la usan)
- [ ] T005 `outbound-cap.ts`: salientes desde el último entrante

## Adaptador

- [ ] T006 `tiktok/credentials.ts`
- [ ] T007 `tiktok/ingest.ts`: normalizar el evento de Zernio e ingerir
- [ ] T008 `tiktok/send.ts` y la rama de TikTok en `inbox/send.ts` (`message_limit`)
- [ ] T009 `zernio/`: reparto y secreto por plataforma; `data.messageId`
- [ ] T010 El agente incluido calla ante `message_limit`; el despacho lleva el canal

## Superficie

- [ ] T011 Webhook `/api/webhooks/tiktok/[token]`
- [ ] T012 `/api/settings/tiktok` y `tiktokUrl`
- [ ] T013 Ajustes → TikTok, distintivo, compositor

## Pruebas y documentación

- [ ] T014 Unitarias (`tests/unit/tiktok.test.ts`, nav, contrato)
- [ ] T015 Guion `tests/e2e/us-tiktok.md` y arnés `scripts/e2e-tiktok.mjs`
- [ ] T016 `AGENTS.md`, README, `.env.example`, CHANGELOG, `specs/README.md`, `ci.yml`
- [ ] T017 Gates en las dos configuraciones y E2E (tiktok, messenger, despacho, selftest)
- [ ] T018 Prueba en vivo y bitácora
