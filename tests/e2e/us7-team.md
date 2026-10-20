# Guion E2E — US7: Multi-usuario mínimo

> Conducido con Playwright (MCP) contra `pnpm dev` (org ya creada).

1. **Registro cerrado (FR-060)**: POST público a sign-up, también en instancia
   vacía. ✅ 403 con mensaje claro; no existe `/registro` (404) ni enlace a él.
2. **Backend**: `pnpm crear-usuario` crea la cuenta (la primera, propietaria) y
   esa cuenta inicia sesión.
3. **Escape solo para pruebas**: `ALLOW_SIGNUP=true` reabre el registro (unit test
   registration.test.ts; requiere reinicio con la variable).
4. **Cuenta de equipo (FR-061)**: el owner crea una cuenta desde
   Configuración → Equipo (email + contraseña temporal mostrada una vez).
   ✅ El nuevo miembro puede iniciar sesión y ve la bandeja de la organización.
   ✅ Un miembro (no owner) NO puede crear cuentas (403).
4. **Rate limit (FR-062)**: >10 logins fallidos desde la misma IP en 10 min.
   ✅ 429 "Demasiados intentos".
