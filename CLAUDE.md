@AGENTS.md

# Reglas permanentes de Quotly

## Seguridad: autenticación (no negociable)
- **Toda página y toda función de datos llama a `requireSession()`** (`src/lib/auth/session.ts`). Nunca depender solo del layout: Next no re-renderiza los layouts en navegaciones del cliente ni detiene el render de la página, y sin esto el sistema devolvió datos de negocio sin sesión (incidente 2026-11-11, ver `docs/MAPEO_SISTEMA.md` sección 8, donde se detalla qué páginas se comprobaron por código). La exposición pasada (desde 2026-08-25) no es determinable: Vercel Hobby retiene pocos logs.
- Páginas nuevas: `await requireSession()` como primera línea. Funciones nuevas en `src/lib/data/*`: igual (excepto `usuarios.ts`, que sirve al login y al setup).
- `requireSession()` va envuelta en `cache()`: llamarla varias veces en una petición cuesta una sola verificación.
- Al agregar rutas, repetir la prueba sin cookie (petición normal y petición RSC con `RSC: 1` y `Next-Router-State-Tree`) contra un servidor local: debe dar 0 páginas con datos de negocio.
- Cierre por inactividad: 15 min (`INACTIVITY_MS` en `src/lib/auth/sessionRules.ts`).

## Datos y pruebas: el `.env` local apunta a la base de producción
- **El `.env` local apunta a la base de producción. Todo dato creado en pruebas es dato real: prefijo PRUEBA y limpiar al terminar.** Desde `localhost` se lee y escribe en la misma base de Supabase que usa la app publicada.
- No crear datos de prueba sobre registros reales (por ejemplo la cuenta por cobrar de COT-2026-0001). Las verificaciones automáticas solo leen o escriben dentro de transacciones con ROLLBACK forzado.

## Conexión a la base (`src/lib/db/pool.ts`, usada por `src/lib/prisma.ts`)
- Pool de `pg`: `max` 5, `idleTimeoutMillis` 10 s, `keepAlive`. `connectionTimeoutMillis`: **10 s en producción y 30 s en desarrollo** (por `NODE_ENV`), porque en desarrollo la máquina compila y la conexión puede tardar más. Fuera de producción, el mensaje "Connection terminated due to connection timeout" significa que se agotó ese límite.
- **Un único reintento, solo al adquirir la conexión** (`PoolConReintento`): ocurre antes de enviar cualquier consulta, así que no puede duplicar escrituras. Cubre `pool.connect()` (promesa, la usa Prisma para abrir transacciones) y `pool.connect(callback)` (la usa `pool.query()` en las consultas sueltas). Un error dentro de una consulta o de una transacción interactiva (`$transaction`) NO se reintenta: se propaga.
- Prueba: `npm run test:pool` (lecturas y transacciones con ROLLBACK; no deja datos).
- Prisma tiene su propio límite para abrir una transacción interactiva (`maxWait`, 2 s por defecto): con una conexión nueva lenta puede dar `P2028`. Es independiente de este reintento.

## Totales fiscales de la cotización (`src/lib/fiscalEngine.ts`)
- Subtotal, IVA y retención se redondean cada uno a 2 decimales (centavos, mitad hacia arriba) y el total es `subtotal + IVA − retención` de esos importes ya redondeados. Pruebas: `npm run test:fiscal`.
- Las cotizaciones y cuentas ya guardadas **no se recalculan**: COT-2026-0001, 0023 y 0028 conservan sus totales de antes (difieren en ±1 centavo de la suma de sus partes redondeadas).
