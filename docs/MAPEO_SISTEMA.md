# Quotly — Mapeo del sistema (post-reingeniería)

Actualizado: 2026-11-11 · Base: código en `main` (`a6bbf7f` desplegado; `3b0981a` y `e53efd0` pendientes de push) + BD de producción (Supabase Postgres) con las 20 migraciones aplicadas. Reemplaza al mapa diagnóstico previo (que describía el acoplamiento Material⇢Inventario, ya eliminado).

Stack: Next.js 16.3.4 (App Router), React 19, Prisma 7 + `@prisma/adapter-pg`, Zod 4, Postgres en **Supabase** (pooler 6543 para la app, conexión directa 5432 para migraciones). Auth propia (bcrypt + tabla `Session`, 1 sesión por usuario, 30 min deslizantes).

---

## 1. Módulos y rutas

Todo `(app)/*` exige sesión. **Regla (ver sección 8): `requireSession()` se llama en el layout, al inicio de CADA página y en CADA función de `lib/data/*`** (excepto `usuarios.ts`, que sirve al login/setup, y `locks.ts`); además cada Server Action y cada `api/*/export` la exige. Nunca se depende solo del layout.

| Módulo | Ruta(s) | Qué hace |
|---|---|---|
| Dashboard | `/` | KPIs mensual/anual: cotizado, aceptado, por cobrar; tabla de cotizaciones del periodo (filtrada por mes/año). |
| Cotizaciones | `/cotizaciones` | Kanban Borrador/Enviada + histórico Aceptadas/Rechazadas; filtro mes/tipo/soporte. |
| | `/cotizaciones/nueva` | Selector de tipo (Servicio / Material). |
| | `/cotizaciones/nueva/servicio` | Wizard de servicio (costo real + margen). |
| | `/cotizaciones/nueva/material` | Wizard de material: líneas de captura libre (clave SAT, descripción, unidad, cantidad, precio); producto guardado = atajo opcional. |
| | `/cotizaciones/[id]` | Detalle, estado, desglose de costo (solo servicio), exportar Word/PDF. |
| Servicios | `/servicios` | Pestañas Servicios y Puestos; desglose del costo real. |
| Inventario y Activos | `/inventario`, `/inventario/[id]`, `/inventario/activos/[id]` | Productos (stock = Σ movimientos), entradas/salidas **manuales**, activos y su historial. **Independiente de Cotizaciones.** |
| Pagos y Cobros | `/pagos`, `/pagos/cobrar/[id]`, `/pagos/pagar/[id]` | Cuentas por cobrar (nacen al aceptar una cotización) y por pagar (independientes), con abonos. |
| Configuración | `/configuracion` | Parámetros globales, tabla CEAV, prestador, cuentas bancarias, Condiciones y Términos; secciones bajo candado. |
| Auth | `/login`, `/setup`, `/api/auth/heartbeat` | Login con anti-fuerza-bruta (`LoginAttempt`), alta del primer usuario, renovación por actividad. |
| Exportaciones | `/api/cotizaciones/[id]/export`, `/api/servicios/export`, `/api/inventario/{productos,movimientos}/export`, `/api/pagos/export` | Word/PDF de cotización; Excel del resto. |

Seguridad HTTP (en `next.config.ts`, verificado en producción): HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`.

---

## 2. Modelos de datos ([schema.prisma](../prisma/schema.prisma))

"Enums" = `String` validados con Zod. El stock **no** es columna: se deriva de `MovimientoInventario`.

| Tabla | Campos clave | Referencia a |
|---|---|---|
| `SystemConfig` (fila única) | UMA, salario mínimo, tope SBC, `primaRiesgoPct`, ISN, prestaciones, `ivaPct`, `retencionIsrPct`, margen default, datos del prestador, métodos de pago, **`condicionesTerminosServicio/Material` + `mostrarCondicionesTerminos*`**, `createdAt` | — |
| `CuentaBancaria` | banco, clabe, titular, `activa` | — |
| `FolioSecuencia` | `anio` (PK), `siguiente` | — (folios atómicos, nunca se reutilizan) |
| `CeavBanda` | `anio`, `orden` 1–8, `unidadLimite`, `limiteSuperior`, `porcentajePatronal` | — |
| `Puesto` | nombre, `sueldoMensual` | ← `Servicio` |
| `Servicio` | nombre, categoría, `puestoId?`, `sueldoMensualInline?`, uniforme/material, `activo` | → `Puesto` (SetNull); ← `LineaCotizacion` |
| `Cliente` | nombreRazonSocial, rfc, `tipoCliente` | ← `Cotizacion` |
| `Cotizacion` | `folio`, `tipo` SERVICIO/MATERIAL, `clienteId`, margen?, subtotal/iva/retencionIsr/totalAPagar/netoARecibir, `estado`, `fechaVigencia`, `esSoporte` | → `Cliente`; ← líneas, `CuentaPorCobrar` (1:1) |
| `LineaCotizacion` | `servicioId`, modalidad, personas, duración, snapshot de costo, `precioVenta` | → `Cotizacion` (Cascade), `Servicio` |
| `LineaCotizacionMaterial` | **`productoId?`**, **`claveSat`**, **`descripcion`**, **`unidadMedida`**, cantidad, precioUnitario, importe | → `Cotizacion` (Cascade), `Producto` (SetNull, opcional) |
| `CuentaPorCobrar` | `cotizacionId` (único), `montoTotal` (=`netoARecibir`), `fechaVencimiento`, `cancelada` | → `Cotizacion`; ← `AbonoPorCobrar` |
| `AbonoPorCobrar` / `CuentaPorPagar` / `AbonoPorPagar` | abonos con fecha/monto; por pagar con proveedor en texto libre | cuentas ↔ abonos (Cascade) |
| `Producto` | nombre, `unidadMedida`, `costoCompraReciente`, `precioVentaSugerido`, `activo` | ← `MovimientoInventario`, `LineaCotizacionMaterial` (opcional) |
| `MovimientoInventario` | `tipo` ENTRADA/SALIDA, cantidad, proveedor/costo o motivo/`referencia` (texto libre) | → `Producto` (Cascade) |
| `Activo` / `EventoActivo` | control de activos y su historial | evento → activo (Cascade) |
| `Usuario` / `Session` / `LoginAttempt` | auth | sesión → usuario (Cascade) |

Columnas **obsoletas sin uso** en `SystemConfig` (Fase 4, se conservan; su borrado es limpieza aparte): `garantiaServicio/Material`, `condicionesComercialesServicio/Material`, `condicionesOperativasServicio/Material` y los 6 `mostrar*` correspondientes.

---

## 3. Conexiones reales entre módulos

### 3.1 Aceptar una cotización (Servicio y Material: un solo camino)

`confirmarAceptacionAction` → `aceptarCotizacion` ([lib/data/cotizaciones.ts](../src/lib/data/cotizaciones.ts), función `aceptarCotizacion`): **una transacción** con lock por cotización que (1) pone `estado = ACEPTADA` y (2) crea la `CuentaPorCobrar` (`netoARecibir`, vencimiento capturado en el modal). Si algo falla no queda nada a medias. **No hay ninguna diferencia entre Servicio y Material y no se toca Inventario.**

### 3.2 Dependencia de Inventario

Ninguna desde Cotizaciones. Inventario sigue conteniendo su propia lógica (`calcularStock`, `lockProducto`, `registrarSalida`, entradas) y se usa solo desde su módulo y sus exportaciones. `Producto` aparece en cotizaciones únicamente como atajo opcional del wizard de material para precargar descripción, unidad y precio; `LineaCotizacionMaterial.productoId` puede ser `NULL` y nunca se valida contra stock. `MovimientoInventario.referencia` es texto libre que el dueño escribe a mano.

### 3.3 Qué restringe el cambio de estado

| Regla | Dónde |
|---|---|
| Aceptada/Rechazada solo por modal de confirmación | `updateEstadoAction` rechaza esos dos destinos |
| **Invariante: una CxC existe solo mientras su cotización está ACEPTADA** | `cambiarEstadoCotizacion` (salir de Aceptada elimina la CxC en la misma transacción) **y** triggers de BD (migración `20261110120000`): bloquean crear una CxC sobre una cotización no Aceptada y sacar de Aceptada una cotización con CxC |
| Si la CxC ya tiene abonos, no se puede salir de Aceptada | `cambiarEstadoCotizacion` + opciones deshabilitadas en `EstadoSelect` |
| No se elimina una cotización Aceptada ni una con CxC | `puedeEliminarseCotizacion` ([cotizacionRules.ts](../src/lib/cotizacionRules.ts)) |
| Fecha de vencimiento obligatoria al aceptar | `confirmarAceptacionAction` |

### 3.4 Servicio → Puesto → motor de costo

```
Puesto.sueldoMensual / Servicio.sueldoMensualInline → sueldoMensualEfectivo()
 → calcularCostoReal(config, …)   [lib/costEngine.ts]
     SDI (tope UMA×topeSbcUmas) → base fiscal = max(SBC, salario mínimo)
     IMSS (prima de riesgo editable + ramos fijos de imssConstants.ts)
     RCV = retiro + CEAV (banda de CeavBanda)  ·  INFONAVIT  ·  ISN + adicional
 → × personalPorUnidad × personas × duración × (1 + margen) → LineaCotizacion.precioVenta
 → calcularTotalesFiscales()   [lib/fiscalEngine.ts]: IVA; retención ISR solo Persona Moral
```
La cotización de Material usa únicamente `calcularTotalesFiscales`. Los wizards de ambos tipos calculan sus totales en pantalla con esa misma función (`ResumenCotizacionCard`).

### 3.5 Candado de contraseña (`PROTECTED_FISCAL_FIELDS`, [schemas/config.ts](../src/lib/schemas/config.ts))

El estado "desbloqueado" es de la UI, pero toda escritura que incluya un campo protegido re-verifica la contraseña en el servidor (`saveSystemConfigAction`).

| Grupo | Protegido |
|---|---|
| UMA / salario mínimo / tope | `umaDiaria`, `umaMensual`, `topeSbcUmas`, `salarioMinimoDiario`, `salarioMinimoMensual` |
| ISN | `isnPct`, `impuestoAdicionalPct` |
| **IVA y retención** | **`ivaPct`, `retencionIsrPct`** (agregados en la Fase 1) |
| CEAV | `CeavBanda.porcentajePatronal` (8 bandas, `ceavPct_1..8`) |
| Prestador | `prestadorNombre/Rfc/RegimenFiscal/Direccion/Telefono/Email` |
| Métodos de pago | `aceptaEfectivo/Transferencia/Cheque` |
| **Condiciones y Términos** | `condicionesTerminosServicio/Material`, `mostrarCondicionesTerminosServicio/Material` |
| Cuentas bancarias | alta / borrar / activar (cada acción re-verifica la contraseña) |

Sin candado: `primaRiesgoPct`, aguinaldo, vacaciones, prima vacacional, horas/días laborales, margen por defecto.

### 3.6 Documento exportado (Word/PDF)

Líneas de material con columna **Clave SAT** junto a la descripción; un bloque **CONDICIONES Y TÉRMINOS** (texto según el tipo, omitido si su interruptor está apagado o el texto está vacío); datos bancarios; leyenda de retención ISR (solo Persona Moral) y firmas **sin cambios**.

---

## 4. Acoplamiento Material ⇢ Inventario: estado actual

| Punto (diagnóstico previo) | Estado |
|---|---|
| FK obligatoria `productoId` en la línea | **Eliminado**: opcional, `ON DELETE SET NULL` |
| Wizard inutilizable sin productos | **Eliminado**: captura libre siempre disponible |
| Validación de stock al aceptar | **Eliminada** |
| Descuento automático de stock al aceptar | **Eliminado** |
| Lock por producto dentro de la aceptación | **Eliminado** (solo lo usa `registrarSalida` manual) |
| "Primera aceptación" inferida de la ausencia de CxC | **Eliminado** |
| Textos que prometían el descuento | **Eliminados** |
| `precioVentaSugerido` precarga el precio | Se conserva como atajo opcional, editable |

Los bugs "stock sin reversión" y "doble descuento" desaparecieron con el mecanismo que los causaba.

---

## 5. Datos reales en producción (2026-11-11)

| Tabla | Registros |
|---|---|
| Cliente | 5 |
| Cotizacion | 11 (8 servicio: 1 Aceptada, 1 Enviada, 6 Borrador · 3 material, todas Borrador) |
| LineaCotizacion / LineaCotizacionMaterial | 8 / 8 (las 8 de material con descripción y unidad respaldadas desde su producto; sin clave SAT) |
| Puesto / Servicio / Producto | 6 / 5 / 3 |
| MovimientoInventario | 6 (3 entradas y 3 salidas de prueba, anteriores a la reingeniería) |
| CuentaPorCobrar / AbonoPorCobrar | **1 / 1** (solo COT-2026-0001, Aceptada) |
| CuentaPorPagar | 0 |
| Activo / CuentaBancaria / Usuario | 1 / 1 / 2 |

Las dos CxC inconsistentes de COT-2026-0002 y COT-2026-0003 (datos de prueba) se eliminaron con autorización explícita.

---

## 6. Historial de la reingeniería

| Fase | Commit | Migración |
|---|---|---|
| 1 Integridad | `bd21825` | `20261110120000_cxc_solo_cotizacion_aceptada` (triggers) |
| 2 Desacople de Inventario | `d656469` | `20261110130000_linea_material_independiente` |
| 3 Clave SAT | `55f1d9d` | `20261110140000_linea_material_clave_sat` |
| 4 Condiciones y Términos | `19fd73e` | `20261111120000_condiciones_terminos_unificados` |
| 5 Duplicación / UI | `e36bb15` | — |
| Seguridad: auth por página y por función de datos | `75a37d3` | — |
| Sesión: 1 consulta, escritura cada 2 min | `d0c31c6` | — |
| Esqueletos de carga (`loading.tsx`) | `0958566` | — |
| Separa `lib/enums` (cliente) de esquemas zod (servidor) | `10e097e` | — |
| Eliminar cotización en 1 sentencia | `a6bbf7f` | — |
| Índices en 10 llaves foráneas | `3b0981a` | `20261111140000_indices_llaves_foraneas` |
| Cierre por inactividad a 15 min | `e53efd0` | — |

## 7. Pendientes detectados (fuera de alcance, sin corregir)

- `/cotizaciones/[id]` muestra rótulos fijos "IVA trasladado (16%)" y "Retención ISR (1.25%)" aunque los montos vienen de lo guardado; si cambia `ivaPct` o `retencionIsrPct`, el rótulo de una cotización vieja sería incorrecto.
- El Dashboard dice "Visión general de Multiservicios Yerves" en texto fijo, y el membrete de la app usa otra razón comercial.
- Las 12 columnas obsoletas de `SystemConfig` siguen en la BD.
- La documentación del repo padre (`e:\CLAUDE CODE\CLAUDE.md`, proyecto FiscalDesk) menciona "Neon Postgres"; no pertenece a este repositorio. `AGENTS.md` y `schema.prisma` de Quotly no mencionan Neon (la BD es Supabase).

---

## 8. Incidente de seguridad: autenticación solo en el layout (2026-11-11)

**Qué fallaba.** `requireSession()` se llamaba únicamente en `src/app/(app)/layout.tsx`; ninguna de las 14 páginas ni las funciones de `lib/data` la verificaban. Next.js no vuelve a renderizar los layouts en navegaciones del cliente y un layout tampoco detiene el render de la página (guía de autenticación de Next, "Layouts and auth checks"). Resultado, reproducido en local sin ninguna cookie de sesión:

| Petición sin cookie | Resultado antes de la corrección |
|---|---|
| RSC (`RSC: 1` + `Next-Router-State-Tree`) | `200` con datos de negocio en 9 de 14 páginas |
| Normal | `307 → /login`, pero con los datos de negocio dentro del cuerpo de la respuesta, en las mismas 9 páginas |

Las 28 Server Actions y las 5 rutas `api/*/export` siempre estuvieron protegidas (verificado: 28/28 acciones y 5/5 rutas llaman `requireSession()`).

**Las 5 páginas que no mostraron datos en la prueba local — qué se comprobó y cómo.** Que no devolvieran datos con mis marcadores no prueba que no filtraran. Se revisó el código de cada una en la versión vulnerable (`dd10a3c`, con `git show`) y se buscó `requireSession` en `src/lib/data` de esa versión (`git grep`: **0 archivos** la llamaban, y ninguna página). Resultado:

| Página | Datos de negocio que leía (por código) | ¿Pasaba por `requireSession()`? | Conclusión |
|---|---|---|---|
| `/` Dashboard | `listCotizaciones()` y `listCuentasPorCobrar()` (todas, con cliente y abonos) y `getSystemConfig()`; muestra solo el mes/año de `?mes=` y `?vista=` | No | **Podía exponer cualquier mes** cambiando el parámetro. La prueba solo cubrió el mes por defecto (noviembre), que está vacío. |
| `/cotizaciones` | `listCotizacionesKanban({ anio, mes, ... })` (cotizaciones con cliente, cuenta y abonos), filtradas por `?mes=` | No | Igual que el Dashboard: la prueba solo vio el mes por defecto. |
| `/cotizaciones/nueva` | Ninguno: textos fijos y enlaces; no importa `lib/data` ni Prisma | No aplica | **Sin exposición de datos.** |
| `/inventario/activos/[id]` | `getActivo(id)`: activo con su historial de eventos | No | Con un id válido exponía el activo. Mis marcadores no incluían datos de activos, así que la prueba no lo detectó. Los ids son `cuid` (no adivinables), lo que reduce el riesgo pero no lo elimina. |
| `/pagos/pagar/[id]` | `getCuentaPorPagar(id)`: concepto, proveedor, montos y abonos | No | La prueba usó un id inexistente (error de Prisma, sin datos). Con un id válido habría expuesto la cuenta; hoy no existe ninguna cuenta por pagar en la BD. |

Tras la corrección, la primera instrucción de `listCotizaciones`, `listCotizacionesKanban`, `listCuentasPorCobrar`, `getSystemConfig`, `getActivo` y `getCuentaPorPagar` es `await requireSession()`, y las 5 páginas también la llaman (revisado por código); además la prueba sin cookie dio 0 con datos en las 14 páginas.

**Desde cuándo.** El diseño existe desde el commit inicial (`528a73d`, 2026-08-25, primer deploy de producción registrado). Ninguna página llamó `requireSession()` hasta la corrección del 2026-11-11. **La exposición pasada (desde 2026-08-25) no es determinable:** el plan Hobby de Vercel retiene muy pocos logs, así que no hay forma de saber si alguien leyó datos sin sesión. Para leerlo hacía falta conocer las rutas; los detalles, además, un id `cuid`.

**Cómo se corrigió** (commit `75a37d3`, desplegado 2026-11-11):
- `requireSession()` envuelta en `cache()` de React (una verificación por petición) y con `await cookies()` primero, para que el build nunca prerenderice páginas ni consulte la BD.
- Se llama al inicio de cada página de `(app)` y de cada función exportada de `lib/data/*`.
- Prueba antes/después en local (14 páginas, normal y RSC, sin cookie): 9 → 0 páginas con datos. Prueba contra producción tras el deploy (sin cookie ni credenciales): 0 de 14.

**Regla permanente.** Toda página y toda función de datos llama a `requireSession()`. Nunca depender solo del layout. Toda página o función de datos nueva debe incluirla desde el primer commit; repetir la prueba sin cookie (peticiones normal y RSC) al agregar rutas.

**Otras mejoras de la misma entrega** (rendimiento): verificación de sesión de 4 a 1 consulta y escritura de `expiresAt` solo cada 2 min (`sessionRules.ts`); cierre por inactividad a 15 min; bundle del cliente sin zod (de ~340 KB a ~60-80 KB en 4 módulos); borrado de cotización en 1 sentencia; `loading.tsx` en las 6 rutas del menú; índices en las 10 llaves foráneas.

---

## 9. Pruebas, conexión y redondeo fiscal (2026-11-12)

- **El `.env` local apunta a la base de producción. Todo dato creado en pruebas es dato real: prefijo PRUEBA y limpiar al terminar.** Se constató en la revisión de la Fase 7: la cotización COT-2026-0028, el cliente "CLIENTE PRUEBA 2", un producto y un puesto de prueba creados desde `localhost` están en la base real (limpieza prevista en la Fase 9).
- **Conexión (`src/lib/db/pool.ts`).** Pool con `max` 5, `idleTimeoutMillis` 10 s y `keepAlive`; tiempo límite de conexión de 10 s en producción y 30 s en desarrollo; un único reintento solo al adquirir la conexión (antes de cualquier consulta, para `pool.connect()` y `pool.connect(callback)`). Las transacciones interactivas no se reintentan. Prueba: `npm run test:pool`. El error "Connection terminated due to connection timeout" visto en la revisión provenía del límite de 10 s del primer hotfix, que en desarrollo (compilando) se quedó corto.
- **Redondeo fiscal (`src/lib/fiscalEngine.ts`).** Subtotal, IVA y retención a 2 decimales (mitad hacia arriba) y total como suma de esos importes: para 650.00 → IVA 104.00, retención 8.13, total 745.87. Solo aplica a cotizaciones nuevas; las existentes no se recalcularon (COT-2026-0001 y 0023 difieren en 1 centavo de la suma de sus partes redondeadas, igual que 0028).
