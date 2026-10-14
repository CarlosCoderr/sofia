# Tareas — 026 Eliminar una conversación

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md).

## Contrato

- [ ] T001 Enmendar `specs/021-despacho-estandar/contracts/despacho.md`: evento `conversation.deleted` y la red de seguridad
- [ ] T002 `src/server/brains/contract.ts`: `EventoOlvido`, `TIPO_OLVIDO`, `construirEventoOlvido`
- [ ] T003 `src/lib/db/ids.ts`: prefijo `olv`
- [ ] T004 `tests/unit/olvido-contrato.test.ts`: cuerpo y firma gemelos de nea-agent

## Servidor

- [ ] T005 `src/server/bot/ficha.ts`: `vaciarFicha` dentro de una transacción
- [ ] T006 `src/server/inbox/eliminar.ts`: borrado transaccional, dos alcances, cita por venir, adjuntos y archivos
- [ ] T007 `src/server/brains/deliver.ts`: `avisarOlvido` (un intento, 8 s, sin cola)
- [ ] T008 `src/server/events/bus.ts` y `src/components/use-events.ts`: `conversation.deleted`
- [ ] T009 `DELETE /api/conversations/[id]`: permiso, 404, 409, aviso, SSE, log

## Interfaz

- [ ] T010 `src/components/inbox/delete-conversation-dialog.tsx`
- [ ] T011 `contact-panel.tsx`: «Eliminar conversación…» al fondo de Detalles, solo con permiso
- [ ] T012 `inbox-client.tsx` y la página: quitar la conversación al borrar y al recibir el evento

## Pruebas

- [ ] T013 `scripts/e2e-eliminar.mjs` con cerebro propio; modo cerebro y modo agente incluido
- [ ] T014 `tests/e2e/us-eliminar.md`
- [ ] T015 Guiones existentes en verde
- [ ] T016 Interfaz en local, claro y oscuro

## Cierre

- [ ] T017 `AGENTS.md`, `CHANGELOG.md`, `README.md`, `specs/README.md`
- [ ] T018 Prueba en vivo y bitácora
