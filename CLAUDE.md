@AGENTS.md

# Reglas permanentes de Quotly

## Seguridad: autenticación (no negociable)
- **Toda página y toda función de datos llama a `requireSession()`** (`src/lib/auth/session.ts`). Nunca depender solo del layout: Next no re-renderiza los layouts en navegaciones del cliente ni detiene el render de la página, y sin esto el sistema devolvió datos de negocio sin sesión (incidente 2026-11-11, ver `docs/MAPEO_SISTEMA.md` sección 8, donde se detalla qué páginas se comprobaron por código). La exposición pasada (desde 2026-08-25) no es determinable: Vercel Hobby retiene pocos logs.
- Páginas nuevas: `await requireSession()` como primera línea. Funciones nuevas en `src/lib/data/*`: igual (excepto `usuarios.ts`, que sirve al login y al setup).
- `requireSession()` va envuelta en `cache()`: llamarla varias veces en una petición cuesta una sola verificación.
- Al agregar rutas, repetir la prueba sin cookie (petición normal y petición RSC con `RSC: 1` y `Next-Router-State-Tree`) contra un servidor local: debe dar 0 páginas con datos de negocio.
- Cierre por inactividad: 15 min (`INACTIVITY_MS` en `src/lib/auth/sessionRules.ts`).
