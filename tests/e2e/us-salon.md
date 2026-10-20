# US — Módulo SALON: barberías, salones y manicure

Spec: [031](../../specs/031-modulo-salon/spec.md). Arnés:
`scripts/e2e-salon.mjs` (`pnpm test:e2e:salon`).

**Requiere**: app viva con `AGENDA=on` y `SALON=on`, base migrada y Playwright.
Úsalo **solo contra una instancia de pruebas**: espera una organización sin
profesionales activos ni citas en los días que usa; con `E2E_ALLOW_RESET=1`
desactiva a los previos y cancela esas citas. `E2E_SHOTS_DIR=<carpeta>` guarda
capturas de cada pantalla.

El arnés abre el navegador en **otra zona horaria** (Tokio) que la del negocio
(Lima) a propósito: todo debe pintarse en la del negocio.

## Historia 1 — Servicios y combos

El dueño mantiene lo que vende.

- Un servicio exige nombre, precio en centavos enteros ≥ 0, duración de 5 a 600
  min y comisión 0-100; lo inválido es `422` y el formulario lo dice junto a
  cada campo sin cerrar el diálogo.
- Crear, editar, activar/desactivar en línea y eliminar desde la pantalla.
- Una oferta lleva una palabra clave opcional que se guarda normalizada
  (`combo fresh` → `COMBO_FRESH`) y es única por negocio (`409 keyword_taken`,
  mostrado en el diálogo sin perder lo escrito); varios combos sin palabra clave
  conviven.
- Eliminar algo que ya tiene ventas responde `409 in_use`, el diálogo explica
  por qué y ofrece **Desactivar en su lugar**.

## Historia 2 — Equipo, horarios y comisiones

- Alta con nombre, teléfono opcional (rechaza letras) y comisión que nace en
  50 %; activar/desactivar; eliminar solo sin ventas.
- Horario semanal por día: sigue al negocio, día libre u horas propias; se
  guarda solo lo que cambia y el reemplazo es idempotente. Una salida antes de
  la entrada se rechaza.
- Comisión global y pactos por servicio; el guardado parcial no pisa lo ajeno.

## Historia 3 — Caja

- Reparto exacto en centavos con la regla de prioridad: la venta → pacto
  profesional × servicio → global del profesional → del servicio → 50 %.
  Ejemplo del arnés: 3333 al 50 % = 1667 + 1666 (suman 3333).
- Cliente del CRM, nombre suelto o «Cliente de mostrador».
- Cierre por rango en la zona del negocio: ingresos, comisiones, ganancia neta,
  a pagar a cada profesional (de más a menos), cuadre por método y tabla con
  fecha, cliente, profesional, servicio/combo, pago, monto, comisión y neto.
- Fechas inválidas, al revés o de más de 366 días: `422`.
- Anular una venta (dueño/administrador) recalcula todo; CSV con BOM, cabecera
  fija y celdas a prueba de fórmulas.

## Historia 4 — Agenda por sillas (multicupo)

- Una columna por profesional y una fila por franja del motor; la última
  columna muestra los cupos (`libres/total`) y un bloqueo apaga la franja.
- Con tres sillas caben tres citas a las 10:00 (cada una asignada a alguien);
  la cuarta responde `409 slot_taken`; asignar a quien ya está ocupado es
  `409 staff_busy`; el motor de disponibilidad deja de ofrecer lo que el tablero
  ve lleno y **sigue sin ofrecer lo bloqueado**.
- Días libres y horas propias del profesional cambian los cupos de ese día.
- Cobrar desde la cita: llega con cliente y profesional puestos, la marca
  «realizada» y «cobrada» y no se vuelve a cobrar (`409 already_sold`); una cita
  cancelada no se cobra y libera su silla.
- **Tiempo real**: una cita creada por otro canal (como la que agenda el
  agente) aparece en la agenda abierta sin recargar.

## Permisos

- Sin sesión: `401`. Con `SALON` apagada: todo `404` (rutas, pantallas y menú).
- Recepción (`member`): puede cobrar, leer las opciones (sin comisiones) y ver
  la agenda; **no** el reporte, el equipo con comisiones, el catálogo ni anular
  (`403`). En la interfaz solo ve «Agenda por sillas» y las demás rutas la
  mandan allí.

## Móvil (390 px)

Ninguna pantalla desborda a lo ancho y el diálogo de cobro cabe en el teléfono.
