# Quotly — Mapeo del sistema (post-reingeniería)

Actualizado: 2026-11-11 · Base: código en `main` (`e36bb15`) + BD de producción (Supabase Postgres) con las 19 migraciones aplicadas. Reemplaza al mapa diagnóstico previo (que describía el acoplamiento Material⇢Inventario, ya eliminado).

Stack: Next.js 16.3.4 (App Router), React 19, Prisma 7 + `@prisma/adapter-pg`, Zod 4, Postgres en **Supabase** (pooler 6543 para la app, conexión directa 5432 para migraciones). Auth propia (bcrypt + tabla `Session`, 1 sesión por usuario, 30 min deslizantes).

---

## 1. Módulos y rutas

Todo `(app)/*` exige sesión (`requireSession()` en el layout; cada Server Action y cada `api/*/export` la vuelve a exigir).

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

## 7. Pendientes detectados (fuera de alcance, sin corregir)

- `/cotizaciones/[id]` muestra rótulos fijos "IVA trasladado (16%)" y "Retención ISR (1.25%)" aunque los montos vienen de lo guardado; si cambia `ivaPct` o `retencionIsrPct`, el rótulo de una cotización vieja sería incorrecto.
- El Dashboard dice "Visión general de Multiservicios Yerves" en texto fijo, y el membrete de la app usa otra razón comercial.
- Las 12 columnas obsoletas de `SystemConfig` siguen en la BD.
- La documentación del repo padre (`e:\CLAUDE CODE\CLAUDE.md`, proyecto FiscalDesk) menciona "Neon Postgres"; no pertenece a este repositorio. `AGENTS.md` y `schema.prisma` de Quotly no mencionan Neon (la BD es Supabase).
