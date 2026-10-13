# Bitácora — Vocero 1.6 y 2.0

Qué se hizo, cómo se probó y dónde vive cada cosa. Una entrada por spec.
Nunca valores de secretos: como mucho, sus últimos 4. El plan está en
`PLAN-2.0.md` del espacio de trabajo del autor; las specs, en `specs/`.

## 2026-10-13 — 025: el despacho recuerda qué debe

**PR**: [#111](https://github.com/kevinrivm/vocero-crm/pull/111), rama
`feat/025-despacho-recuerda`. Spec antes del código (`94e5457`); la
implementación en `c083037`; un arreglo del selftest en `b91e0dc`.

### Qué quedó

- Puerto de Vocero Cloud #111 (`439386e`), #116 (`5325273`, `2fdeff2`) y #117
  (`2624262`). La raíz ya traía el #111 desde el 021 (`hayMensajesSinDespachar`):
  faltaba la memoria.
- Migración `0017_dispatch_message_ids`: una columna `jsonb` nula.
- Con cerebro externo, el despacho anota qué entrantes debe y los entrega
  aunque después haya una respuesta del agente. Un despacho sin mensajes se
  descarta («sin mensajes por despachar»).
- **Diferencia con cloud, decidida aquí**: en la raíz el agente incluido no
  pasa por el outbox. Lleva la misma cuenta en su coalesce (en memoria, como su
  `pending`), lee lo debido después de su propia respuesta y devuelve qué
  leyó.
- **Decisión que Kevin no ha revisado para la raíz**: si el operador contesta
  desde la bandeja dentro de la ventana de agrupado, el agente incluido ya no
  contesta encima (spec, AC5b). En cloud lo confirmó el 12-oct; con el
  despacho la raíz ya se comportaba así.

### Cómo se probó

| Qué | Resultado |
|---|---|
| `typecheck`, `lint`, `test`, `build` | Verdes con banderas apagadas y con `CHANNELS` + `AGENDA`. 1 017 unitarias. CI del PR: 3 de 3. |
| `scripts/e2e-despacho.mjs` con cerebro | 89/89, tres corridas. Sin el arreglo, 84/89: las rojas son las de «mientras piensa». La de «persona en la ventana» ya pasaba en la raíz: queda como regresión. |
| `scripts/e2e-despacho.mjs` con el agente incluido | 14/14, tres corridas. Sin el arreglo, 11/14: el orden del turno y las dos de «no contesta encima». |
| `scripts/e2e-selftest.mjs` sin `BRAIN_DISPATCH_URL` | 213/213 en frío sobre una base nueva; `dispatch` queda vacía. |
| Migración | Base vacía; y base en `0016` con un despacho pendiente: `0017` en dos pasadas, la fila queda con `message_ids` nulo y se entrega igual. |
| En vivo, local | Ver abajo. |
| En vivo, Coolify | Ver abajo. |

Tres carreras de los guiones contra la ingesta salieron al repetir corridas, y
ninguna era del producto: la ráfaga de cinco mensajes (se guardaban en otro
orden), la ventana de 24 h tras un botón, y la pausa tras un eco. Las tres se
arreglaron esperando el hecho en vez de un tiempo fijo. El mock de WhatsApp
repetía ids al reiniciar su bandeja dentro del mismo proceso; ya no.

Queda apuntado, fuera de esta spec: el producto ordena los mensajes por hora
de inserción, no por la hora del canal. Dos webhooks de la misma conversación
procesados a la vez pueden guardarse en otro orden.

### Prueba en vivo

Número «Soporte» (…9518, coexistencia) y línea cliente (…9768) por Evolution.
Contesta el agente incluido con el negocio demo y `openai/gpt-4o-mini` por
OpenRouter. Nea contra la raíz por despacho llega con nea-agent#37.

**La raíz no tiene lista de permitidos** (`ALLOWED_WA_IDS` es de Nea). Para que
el agente de pruebas solo le contestara a la línea cliente, el override apuntó
a un relevo local detrás de un túnel de Cloudflare: lo de la línea cliente va
al CRM de pruebas y todo lo demás se reenvía, crudo y con su firma, a donde
apuntaba el override. En las dos ventanas solo pasó tráfico de la línea
cliente.

| | Local (`next start`, commit `b91e0dc`) | Coolify (`vocero-16`, commit `b91e0dc`) |
|---|---|---|
| Override movido (UTC) | 18:48:05 | 18:54:18 |
| Override devuelto (UTC) | 18:49:28 | 18:54:46 |
| Intento 1 | 2.º mensaje a los 4.0 s: misma ventana, una respuesta a los 15.4 s que contesta las dos preguntas | 2.º mensaje a los 7.0 s, con el modelo pensando; respuestas a los 9.1 s (horario) y 12.8 s (envíos) |
| Intento 2 | 2.º mensaje a los 7.0 s, con el modelo pensando; respuestas a los 10.3 s y 14.0 s | — |

El override del número apuntaba a un demo de la clase
(`nea-comida.177.7.62.92.sslip.io`) y ahí volvió las dos veces; se comprobó
antes de moverlo que contesta el reto de verificación, y después de devolverlo
que lo sigue contestando. El de la WABA (`vocero-clase.kevinbelier.cloud`) y el
webhook de la app no se tocaron: al guardar la conexión, el CRM de pruebas vio
el override de la WABA y no registró el suyo.

Seis mensajes de la línea cliente y cinco respuestas del agente en total. El
gasto de OpenRouter no se midió: cinco turnos de `gpt-4o-mini` con el prompt
del demo, del orden de una fracción de centavo. El Laboratorio no se corrió.

**En Coolify el webhook llegó por el relevo, no directo de Meta.** Lo que queda
sin probar es solo ese salto; la verificación de Meta (`hub.challenge`) sí la
contestó la instancia.

### Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Proyecto Coolify `vocero-16` | `cz6ssrdhn2pfuzkkmjwm0drq`, entorno `production` (`qnk5mqg4pzxzbfolg95vnmfq`) |
| Servicio `vocero16-crm` (app + Postgres) | `rwzjzhsi5boaujr25snbjuxe`; app `zit4a8bggjnhuwympeonvera`, base `jrur7xgv1oluirvyhlqfpedu` |
| URL | `https://vocero16.177.7.62.92.sslip.io` (healthcheck de Coolify apagado en el compose) |
| Servidor | `sd6cdcmljjxi5sufn6d0bzey`, el único del panel. **`COOLIFY_SERVER_UUID` de la bóveda trae otro valor y no existe en ese panel**: hay que corregirlo. |
| Secretos de la instancia (`BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, verify token, contraseña de Postgres) | Los generó Coolify (`SERVICE_PASSWORD_*`, `SERVICE_REALBASE64_*`); viven solo en el servicio. No pasaron por el chat. |
| Llave de OpenRouter de la instancia | Cifrada en su base (Ajustes → IA). Sale de `LLM_API_KEY` de la bóveda. |
| Token de WhatsApp de la instancia | Cifrado en su base. Sale de `WA_TOKEN` de la bóveda. |
| Dueño de la instancia | Correo `OWNER_EMAIL` de la bóveda; contraseña en `.env.vocero16` del espacio de trabajo. |
| Override original del número | `.override-soporte.json` del espacio de trabajo (su último tramo es un secreto). |
| Guiones de la prueba en vivo | `ops/` del espacio de trabajo: `override.mjs`, `relay.mjs`, `evolution.mjs`, `vivo.mjs`. Fuera de este repo. |
| Local | Postgres propio en Docker (`vocero-20-pg`, puerto 5433): bases `vocero_025_*`. `.env.e2e-*` y `.env.vivo` en el clon, ignorados por git. |

Al levantar el compose de desarrollo, Docker recreó el contenedor del Postgres
compartido de la máquina (`vocero-dev-postgres-1`) sobre su mismo volumen: sus
bases siguen ahí y no se usó (tiene otra contraseña). Las pruebas corrieron en
el Postgres propio.

El agente incluido de la instancia de Coolify quedó **apagado** y su número
conectado. Se reutiliza para las pruebas en vivo de 022 a 028.

Para repetir la prueba: `node ops/relay.mjs 3281 <url>`, túnel a `:3281`,
`node ops/override.mjs mover <túnel> <env> [url]`,
`node ops/vivo.mjs dos-mensajes <url> <env>`, `node ops/override.mjs devolver`.

### Qué sigue

022, canal TikTok por Zernio.

## 2026-10-13 — 1.5.1, la clase multicanal y el starter 2.2.0

Escrito después de los hechos: fue un día de clase y la bitácora quedó para el
final.

### Versión 1.5.1

PR #113 (`dad742f`), tag `v1.5.1`, imagen `ghcr.io/kevinrivm/vocero-crm:1.5.1`
y release en GitHub. Saca la 025 antes que la 1.6.0, junto con el despacho al
cerebro que ya estaba en `main`.

### 022, TikTok

PR #112 abierto, sin mergear. Verde con simuladores (`e2e-tiktok` 52/52, dos
corridas). **Pendiente de verificación humana:** `@kevin.belier` es cuenta
personal y TikTok solo entrega mensajes por API a cuentas Business; la
solicitud de Kevin está en revisión.

### Demo de la clase (instancia `vocero16-crm`, ya borrada)

- La instancia de pruebas pasó a la imagen `1.5.1` con
  `CHANNELS=whatsapp,instagram,messenger` y el agente incluido encendido.
- **Dominio:** con permiso expreso de Kevin, `vocero-clase.kevinbelier.cloud`
  se le quitó a la app `vocero-crm` del proyecto `vocero` (instalación anterior
  del starter) y se le dio a la demo. Después de la demo se liberó para la
  instalación del starter.
- **WhatsApp «Soporte»:** el override del número se movió de la Nea del demo de
  comida a la demo (20:58 UTC) y se reapuntó al cambiar el dominio (~21:03
  UTC). **No se devolvió**: al terminar se quitó (~22:15 UTC) porque el número
  pasó a la instalación de la clase, por decisión de Kevin. El original sigue
  en `.override-soporte.json`.
- **Zernio:** webhook `vocero-16-clase` (`6ace9b814a6701990705765e`), limitado
  al Instagram y a la página de Kevin; desactivado al terminar.
- **Probado en vivo:** WhatsApp, entrada y respuesta del agente en 11 s.
  Instagram y Messenger: conexión y evento de prueba de Zernio en 200; los DM
  reales los mandó Kevin en la clase, no quedaron medidos aquí.
- Observado y sin investigar: con dos preguntas seguidas por WhatsApp, el
  modelo las leyó en el mismo turno y contestó solo la primera.

### Starter 2.2.0

Repo local `Vocero-cloud astra/vocero-starter-v2` (sin remoto), commit
`a7b8de7`, tag `v2.2.0`, zip al lado. Agrega `CHANNELS` y `AGENTE` al `.env`,
las skills `conectar-canales` y `agente-incluido` y el guion `canales.mjs`.
Ensayado contra Zernio real y una instancia aparte (`ensayo-starter-crm`, ya
borrada). Kevin lo corrió completo en la clase: de ahí salió la instalación
que queda.

### Qué queda en Coolify

| Qué | Dónde |
|---|---|
| Instalación de la clase (se queda como instancia de pruebas) | Proyecto `vocero-clase` (`yyojx68tpzqbyrlfglhstbbn`): app `vocero-crm` (`3jinuviignszpotzzmvs6nrf`), base `vocero-clase-db` (`apppb0cmt0hwzzyoe8z6a699`). `https://vocero-clase.kevinbelier.cloud`, imagen `1.5.1`, tres canales |
| Sus secretos | En el `.env` del starter de Kevin (`Downloads/vocero-starter-v2`) y en las variables de la app. La bóveda del espacio no los tiene |
| WhatsApp «Soporte» | Override de la WABA hacia `vocero-clase…`; sin override en el número |
| Proyectos `vocero-16` y `vocero` | Vacíos |

**Borrado (noche del 13 al 14, hora UTC; con volúmenes):** servicios `vocero16-crm` y
`ensayo-starter-crm`; del proyecto `vocero`, las apps `vocero-crm`
(`anhoehhz…`) y `nea` y las bases `vocero-db` y `nea-db`. Se hizo **por la API
de Coolify y no por el MCP**, con autorización expresa de Kevin: el MCP
devolvía «el usuario rechazó» sin mostrarle el diálogo. Guion
`ops/borrar-coolify.mjs`, de lista cerrada. Los tres demos multinicho no se
tocaron.

El demo de comida se quedó sin WhatsApp: su número es ahora el de la
instalación de la clase.

### Qué sigue

Poner la 022 al día con `main` y empezar la 023 (Ajustes → Canales).
