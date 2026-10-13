# Tasks — 025 El despacho recuerda qué debe

## Datos

- [ ] T001 Columna `dispatch.messageIds` en `schema.ts`
- [ ] T002 `pnpm db:generate` → `0017_dispatch_message_ids`
- [ ] T003 Migrar una base vacía y una en `0016` con un despacho pendiente

## Despacho

- [ ] T004 `ingest.ts` → `trigger.ts` → `encolar.ts`: el id del entrante llega al outbox
- [ ] T005 `outbox.ts`: `encolarDespacho` anota ids (fila viva, en vuelo, carrera del índice) y `mensajesAnotados`
- [ ] T006 `deliver.ts`: `rafagaDe` con debidos, `sinDespachar`, `construirEvento` sin mensajes
- [ ] T007 `worker.ts`: descartar el despacho vacío y releer lo anotado tras entregar

## Agente incluido

- [ ] T008 `orden-turno.ts`: `ordenarParaElTurno` y `debidosVigentes`
- [ ] T009 `pipeline.ts`: debidos en el coalesce, `runAgentTurn` devuelve lo que leyó

## Pruebas y documentación

- [ ] T010 Unitarias: `sinDespachar`, `ordenarParaElTurno`, `debidosVigentes`
- [ ] T011 Mock de IA: demora y registro de peticiones
- [ ] T012 Arnés y guion: «mientras piensa», «persona en la ventana», «agente incluido», y la espera del #116
- [ ] T013 Contrato del despacho, `AGENTS.md`, `specs/README.md`, CHANGELOG
- [ ] T014 Gate técnico y E2E en los dos modos; `pnpm test:e2e` sin la variable
- [ ] T015 Prueba en vivo (local con túnel y Coolify) y bitácora
