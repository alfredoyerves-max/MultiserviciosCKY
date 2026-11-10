# Quotly — Mapeo del sistema (diagnóstico, solo lectura)

Fecha: 2026-11-10 · Base: código real en `main` (`f6f9b1a`) + conteos reales contra la BD de producción (Supabase Postgres, solo `SELECT` en transacción de solo lectura). No se modificó código.

Stack: Next.js 16.3.4 (App Router), React 19, Prisma 7 + `@prisma/adapter-pg`, Zod 4, Postgres (Supabase). Auth propia (bcrypt + tabla `Session`). Un solo usuario operativo por sesión.

---

## 1. Módulos y rutas

Navegación en [app-shell.tsx](../src/components/layout/app-shell.tsx). Todo `(app)/*` exige sesión vía `requireSession()` en [layout.tsx](../src/app/(app)/layout.tsx); cada Server Action y cada `api/*/export` la vuelve a exigir.

| Módulo | Ruta(s) | Qué hace |
|---|---|---|
| Dashboard | `/` | KPIs mensual/anual de cotizaciones y cuentas por cobrar (usa `listCotizaciones`, `listCuentasPorCobrar`, `SystemConfig.createdAt` como límite de navegación). |
| Cotizaciones | `/cotizaciones` | Kanban Borrador/Enviada + histórico Aceptadas/Rechazadas, filtro mes/tipo/soporte. |
| | `/cotizaciones/nueva` | Selector de tipo (Servicio / Material). |
| | `/cotizaciones/nueva/servicio` | Wizard de cotización de servicio (costo real + margen). |
| | `/cotizaciones/nueva/material` | Wizard de cotización de material (productos del inventario, precio editable). |
| | `/cotizaciones/[id]` | Detalle, cambio de estado, desglose de costo, exportar Word/PDF. |
| Servicios | `/servicios` | Pestañas Servicios y Puestos; catálogo de servicios, puestos reutilizables, desglose del costo real. |
| Inventario y Activos | `/inventario` | Pestañas Productos y Activos. |
| | `/inventario/[id]` | Detalle de producto: movimientos, entradas y salidas. |
| | `/inventario/activos/[id]` | Detalle de activo: estado, baja, historial de eventos. |
| Pagos y Cobros | `/pagos` | Pestañas Por cobrar / Por pagar con KPIs. |
| | `/pagos/cobrar/[id]`, `/pagos/pagar/[id]` | Detalle de cuenta, abonos, cancelar/eliminar. |
| Configuración | `/configuracion` | Parámetros globales, tabla CEAV, datos del prestador, cuentas bancarias, leyendas; secciones bajo candado de contraseña. |
| Auth | `/login`, `/setup`, `/api/auth/heartbeat` | Login con anti-fuerza-bruta (`LoginAttempt`), alta del primer usuario, renovación de sesión por actividad (30 min). |
| Exportaciones | `/api/cotizaciones/[id]/export`, `/api/servicios/export`, `/api/inventario/{productos,movimientos}/export`, `/api/pagos/export` | Word/PDF de cotización y Excel de los demás. |

---

## 2. Modelos de datos ([schema.prisma](../prisma/schema.prisma))

Los "enums" son `String` validados con Zod (no enums de Postgres). El stock **no existe como columna**: se deriva de `MovimientoInventario`.

| Tabla | Campos clave | Referencia a |
|---|---|---|
| `SystemConfig` (fila única, id=1) | UMA diaria/mensual, `topeSbcUmas`, salario mínimo diario/mensual, `primaRiesgoPct`, `isnPct`, `impuestoAdicionalPct`, aguinaldo/vacaciones/prima vac., `ivaPct`, `retencionIsrPct`, horas/días, `margenUtilidadDefaultPct`, datos del prestador, `acepta{Efectivo,Transferencia,Cheque}`, 6 leyendas + 6 flags `mostrar*`, `createdAt` | — |
| `CuentaBancaria` | banco, clabe, numeroCuenta, titular, `activa` | — |
| `FolioSecuencia` | `anio` (PK), `siguiente` | — (contador atómico de folios) |
| `CeavBanda` | `anio`, `orden` 1–8, `unidadLimite` (SALARIO_MINIMO/UMA), `limiteSuperior`, `porcentajePatronal` | — |
| `Puesto` | nombre, `sueldoMensual` | ← `Servicio` |
| `Servicio` | nombre, categoría, `puestoId?`, `sueldoMensualInline?`, `nombrePuestoInline?`, `personalPorUnidad`, `modalidadesJson`, uniforme/material (costo + vida útil), `activo` | → `Puesto` (SetNull); ← `LineaCotizacion` |
| `Cliente` | nombreRazonSocial, rfc, contacto, `tipoCliente` | ← `Cotizacion` |
| `Cotizacion` | `folio` (único), `tipo` SERVICIO/MATERIAL, `clienteId`, `margenUtilidadPct?`, subtotal/iva/retencionIsr/totalAPagar/netoARecibir, `estado`, `fechaVigencia`, `esSoporte` | → `Cliente`; ← `LineaCotizacion`, `LineaCotizacionMaterial`, `CuentaPorCobrar` (1:1) |
| `LineaCotizacion` | `servicioId`, modalidad, personas, duracion, `costoRealUnitarioSnapshot`, `costoRealTotal`, `precioVenta` | → `Cotizacion` (Cascade), `Servicio` |
| `LineaCotizacionMaterial` | `productoId`, cantidad, `precioUnitario`, `importe` | → `Cotizacion` (Cascade), `Producto` |
| `CuentaPorCobrar` | `cotizacionId` (único), `montoTotal` (=`netoARecibir`), `fechaVencimiento`, `cancelada` | → `Cotizacion`; ← `AbonoPorCobrar` |
| `AbonoPorCobrar` | fecha, monto, nota | → `CuentaPorCobrar` (Cascade) |
| `CuentaPorPagar` | concepto, proveedor (texto libre), montoTotal, fechaVencimiento | ← `AbonoPorPagar` |
| `AbonoPorPagar` | fecha, monto, nota | → `CuentaPorPagar` (Cascade) |
| `Producto` | nombre, `unidadMedida`, `costoCompraReciente`, `precioVentaSugerido`, `activo` | ← `MovimientoInventario`, `LineaCotizacionMaterial` |
| `MovimientoInventario` | `productoId`, `tipo` ENTRADA/SALIDA, fecha, cantidad, proveedor, costoUnitario, `motivoSalida`, `referencia` (texto libre = folio) | → `Producto` (Cascade) |
| `Activo` | nombre, categoría, fechaAdquisicion, valorAdquisicion, factura, proveedor, `estado`, `fechaBaja` | ← `EventoActivo` |
| `EventoActivo` | fecha, tipo, descripción, estadoAnterior/Nuevo | → `Activo` (Cascade) |
| `Usuario` | email (único), `passwordHash`, nombre | ← `Session` (1:1) |
| `Session` | `token`, `usuarioId` (único), `expiresAt` | → `Usuario` (Cascade) |
| `LoginAttempt` | `email` (PK), intentos, `bloqueadoHasta` | — |

Notas de integridad:
- `MovimientoInventario.referencia` guarda el folio como **texto**, sin FK a `Cotizacion`. No hay vínculo relacional salida↔cotización.
- `Producto` ← `LineaCotizacionMaterial` sin `onDelete` (Restrict por defecto); `Producto` no se borra desde la UI, solo se desactiva (`activo`).
- No hay constraint de BD que impida mezclar `lineas` y `lineasMaterial` en una cotización; se garantiza solo en la capa de datos.

---

## 3. Conexiones reales entre módulos

### 3.1 Qué pasa al pasar una Cotización a "Aceptada"

Entrada única: `confirmarAceptacionAction` ([cotizaciones/actions.ts:175](../src/app/(app)/cotizaciones/actions.ts#L175)), disparada por el modal de confirmación (`EstadoSelect` → `ConfirmarAceptacionModal`). `updateEstadoAction` ([actions.ts:148](../src/app/(app)/cotizaciones/actions.ts#L148)) **rechaza** ACEPTADA y RECHAZADA; solo permite Borrador↔Enviada.

| Aspecto | SERVICIO | MATERIAL |
|---|---|---|
| Rama en `confirmarAceptacionAction` | `actions.ts:202-207` | `actions.ts:200-201` → `confirmarAceptacionMaterial` |
| Atomicidad | **No transaccional**: `updateEstadoCotizacion` y luego `generarCuentaPorCobrar` son dos escrituras separadas. Si la 2.ª falla, queda ACEPTADA sin CxC. | **Una sola `$transaction`** ([cotizaciones.ts:295](../src/lib/data/cotizaciones.ts#L295)): estado + salidas + CxC o nada. |
| Validación de stock | Ninguna | Sí (ver 3.2) |
| Movimientos de inventario | Ninguno | 1 `SALIDA` por línea, `motivoSalida=VENTA_CLIENTE`, `referencia=folio` |
| Cuenta por cobrar | Se crea si no existe (`monto = netoARecibir`, fecha de vencimiento del modal) | Igual, dentro de la transacción |
| Re-aceptación (ya hay CxC) | Solo cambia estado | Solo cambia estado; **no** re-descuenta (`esPrimeraAceptacion = !cuentaPorCobrar`) |
| Revalidate | `/cotizaciones`, `/cotizaciones/[id]`, `/pagos`, `/inventario`, `/` (iguales para ambos) | |

**Diferencia clave:** el único criterio que dispara el descuento de stock es "¿es la primera aceptación?", medido por la **ausencia de `CuentaPorCobrar`**, no por un registro de movimiento. Esto produce el hueco de reversión descrito en 3.3 y confirmado con datos reales (sección 5).

### 3.2 Dependencia de Inventario en la aceptación (archivo/función exacta)

| Responsabilidad | Archivo · función · línea |
|---|---|
| Cálculo de stock (Σ ENTRADA − Σ SALIDA) | [lib/inventario.ts:12](../src/lib/inventario.ts#L12) `calcularStock` (pura, importada también por el wizard cliente) |
| Lock por producto (advisory lock, orden determinístico) | [lib/data/locks.ts:15](../src/lib/data/locks.ts#L15) `lockProducto` → [lib/prisma.ts](../src/lib/prisma.ts) `advisoryLock`; llamado en [cotizaciones.ts:308-310](../src/lib/data/cotizaciones.ts#L308) |
| **Validación de stock al aceptar** | [cotizaciones.ts:339-347](../src/lib/data/cotizaciones.ts#L339) dentro de `confirmarAceptacionMaterial` (agrega cantidades por producto; error "Stock insuficiente de …") |
| **Descuento de stock al aceptar** | [cotizaciones.ts:353-363](../src/lib/data/cotizaciones.ts#L353) `tx.movimientoInventario.create` tipo SALIDA |
| Validación de stock en salida manual (módulo Inventario) | [movimientosInventario.ts](../src/lib/data/movimientosInventario.ts) `registrarSalida` |
| Advertencia informativa de stock (solo UI, no bloquea) | [nueva/material/wizard.tsx:68-80,174-176,236-238](../src/app/(app)/cotizaciones/nueva/material/wizard.tsx) |
| Texto de aviso en el modal | [confirm-modals.tsx:66](../src/app/(app)/cotizaciones/confirm-modals.tsx#L66) |

### 3.3 Qué bloquea o restringe el cambio de estado

| Regla | Dónde | Efecto |
|---|---|---|
| ACEPTADA/RECHAZADA solo por modal | `updateEstadoAction` [actions.ts:152-154](../src/app/(app)/cotizaciones/actions.ts#L152) | No se puede aceptar/rechazar por el camino rápido. |
| ACEPTADA con abonos → no puede cambiar a ningún otro estado | `asegurarCambioEstadoPermitido` [cotizaciones.ts:267](../src/lib/data/cotizaciones.ts#L267); llamada en `updateEstadoAction` y `confirmarRechazoAction` | Bloqueo servidor + opciones deshabilitadas en `EstadoSelect` ([estado-select.tsx](../src/app/(app)/cotizaciones/estado-select.tsx), `bloqueadoPorAbonos`). |
| Rechazar elimina la CxC (si no tiene abonos) | `confirmarRechazoAction` [actions.ts:228](../src/app/(app)/cotizaciones/actions.ts#L228) → `eliminarCuentaPorCobrarPorCotizacion` | Evita CxC huérfana. |
| Eliminar cotización: no si ACEPTADA ni si tiene CxC | `puedeEliminarseCotizacion` [cotizacionRules.ts:11](../src/lib/cotizacionRules.ts#L11), usada en `deleteCotizacion` y en kanban | — |
| Stock insuficiente (solo MATERIAL, primera aceptación) | `confirmarAceptacionMaterial` | Aborta la transacción completa. |
| Fecha de vencimiento obligatoria en primera aceptación | `confirmarAceptacionAction` [actions.ts:188-198](../src/app/(app)/cotizaciones/actions.ts#L188) | — |

**Huecos detectados (no corregidos, fuera de alcance de este diagnóstico):**
1. **Sin reversión de stock.** Material ACEPTADA → Borrador (sin abonos) o → Rechazada **no** genera entrada compensatoria. Las salidas `VENTA_CLIENTE` quedan. Confirmado en producción: `COT-2026-0003` (MATERIAL) está en BORRADOR, conserva su CxC y sus 3 salidas de inventario.
2. **Rechazar un Material aceptado borra la CxC pero deja las salidas de inventario.** Al volver a aceptarlo, `esPrimeraAceptacion` es `true` otra vez (ya no hay CxC) y **descuenta el stock una segunda vez**.
3. **Aceptación de Servicio no es atómica** (ver 3.1).
4. **Estado Enviada con CxC viva:** `COT-2026-0002` (SERVICIO) está ENVIADA con CxC vigente; es el mismo patrón (volver a Borrador/Enviada no limpia la CxC si no hay abonos).
5. `createCotizacionMaterial` no valida stock ni que el producto esté `activo` en el servidor; solo el wizard lo advierte.

### 3.4 Servicio → Puesto → motor de costo (IMSS/RCV/INFONAVIT)

```
Puesto.sueldoMensual ─┐
                      ├─ sueldoMensualEfectivo(servicio)   [lib/servicioCosto.ts:11]
Servicio.sueldoMensualInline ┘   (puesto tiene prioridad; si no hay ninguno → 0)
        │
        ▼
calcularCostoReal(config, {sueldoMensualPuesto, uniforme, material})   [lib/costEngine.ts:132]
   config = getSystemConfigConCeav()  [lib/data/config.ts:43]  → SystemConfig + CeavBanda
        │  SDI = sueldo diario + aguinaldo + prima vac. (tope = UMA × topeSbcUmas)
        │  baseCalculoFiscal = max(SBC, salarioMinimoMensual)       (piso Art. 28 LSS)
        │  IMSS  : primaRiesgo (editable) + 6 ramos con constantes de lib/imssConstants.ts
        │  RCV   : retiro (constante) + CEAV (banda por buscarBandaCeav, tabla CeavBanda)
        │  INFONAVIT: constante INFONAVIT_PCT
        │  + ISN e impuesto adicional (SystemConfig)
        ▼
costoRealPorModalidad(HORA|DIA|SEMANA|MES) × personalPorUnidad × personas × duracion
        ▼  × (1 + margen)  →  LineaCotizacion.precioVenta (+ snapshot del costo)
        ▼
calcularTotalesFiscales(subtotal, tipoCliente, ivaPct, retencionIsrPct)  [lib/fiscalEngine.ts]
        (retención ISR solo si cliente PERSONA_MORAL)
```

- Consumidores del motor: `createCotizacion` (guarda snapshot), `/cotizaciones/nueva/servicio/page.tsx`, `servicios-panel.tsx` (UI de desglose), `/api/servicios/export`.
- Las 7 cuotas IMSS fijas e INFONAVIT son **constantes de código** ([imssConstants.ts](../src/lib/imssConstants.ts)), no editables en BD. Editables: prima de riesgo, UMA, salario mínimo, tope SBC, ISN, impuesto adicional, tabla CEAV, prestaciones.
- Borrado de `Puesto`: bloqueado si algún `Servicio` lo usa (`deletePuesto`). Cambiar el sueldo de un Puesto afecta cotizaciones **nuevas**; las existentes conservan snapshot (`costoRealUnitarioSnapshot`).
- La cotización de Material **no usa** este motor: solo `calcularTotalesFiscales` (IVA/retención).

### 3.5 Qué protege el candado de contraseña

Mecanismo: `unlockFiscalAction` solo verifica la contraseña del usuario en sesión; el estado "desbloqueado" es React (`fiscalUnlocked` en [config-form.tsx](../src/app/(app)/configuracion/config-form.tsx)). Los campos bloqueados se renderizan **sin `name`**, y `saveSystemConfigAction` ([configuracion/actions.ts:74](../src/app/(app)/configuracion/actions.ts#L74)) re-verifica `fiscalPassword` en el servidor si el `FormData` trae cualquier campo protegido (`seccionFiscalDesbloqueada`). Lista única en `PROTECTED_FISCAL_FIELDS` ([schemas/config.ts:35](../src/lib/schemas/config.ts#L35)).

| Grupo | Campos / tabla protegidos |
|---|---|
| UMA, salario mínimo y tope | `SystemConfig`: `umaDiaria`, `umaMensual`, `topeSbcUmas`, `salarioMinimoDiario`, `salarioMinimoMensual` |
| ISN | `isnPct`, `impuestoAdicionalPct` |
| Tabla CEAV | `CeavBanda.porcentajePatronal` de las 8 bandas (`ceavPct_1..8`; solo se actualiza ese campo) |
| Identidad del prestador | `prestadorNombre`, `prestadorRfc`, `prestadorRegimenFiscal`, `prestadorDireccion`, `prestadorTelefono`, `prestadorEmail` |
| Métodos de pago | `aceptaEfectivo`, `aceptaTransferencia`, `aceptaCheque` |
| Leyendas (texto) | `garantiaServicio/Material`, `condicionesComercialesServicio/Material`, `condicionesOperativasServicio/Material` |
| Visibilidad de leyendas | `mostrarGarantiaServicio/Material`, `mostrarCondicionesComercialesServicio/Material`, `mostrarCondicionesOperativasServicio/Material` |
| Cuentas bancarias (tabla completa) | `CuentaBancaria`: alta (`addCuentaBancariaAction`), borrar (`deleteCuentaBancariaAction`), activar/desactivar (`toggleCuentaBancariaActivaAction`); cada una re-verifica la contraseña en servidor |

**No protegido (editable sin candado):** `primaRiesgoPct`, `diasAguinaldo`, `diasVacaciones`, `primaVacacionalPct`, **`ivaPct`**, **`retencionIsrPct`**, `horasPorDia`, `diasPorSemana`, `margenUtilidadDefaultPct`. Tampoco están protegidos `Puesto.sueldoMensual`, precios de `Producto`, ni ninguna tabla de Servicios/Inventario/Pagos. (`ivaPct` y `retencionIsrPct` son fiscales y quedaron fuera del candado.)

---

## 4. Puntos de acoplamiento fuerte: Cotización de Materiales ⇢ Inventario

| # | Acoplamiento | Ubicación | Tipo | Se puede desacoplar con… |
|---|---|---|---|---|
| A1 | `LineaCotizacionMaterial.productoId` **FK obligatoria** a `Producto`; `Producto.unidadMedida`, `nombre` se leen vía join para detalle y exportación | [schema.prisma:339-342](../prisma/schema.prisma); [cotizaciones/[id]/page.tsx:134-136](../src/app/(app)/cotizaciones/[id]/page.tsx); [export/cotizacionData.ts:128-130](../src/lib/export/cotizacionData.ts) | Datos, **obligatorio** | Líneas libres (descripción/unidad/precio) con `productoId` opcional. |
| A2 | `createCotizacionMaterial` exige que el producto exista en BD (`Producto ${id} no encontrado`) | [cotizaciones.ts:146-148](../src/lib/data/cotizaciones.ts#L146) | Datos, obligatorio | Idem A1. |
| A3 | Wizard de material **no funciona sin productos**: muestra "Da de alta al menos uno en Inventario y Activos" y no permite continuar | [wizard.tsx:124-130](../src/app/(app)/cotizaciones/nueva/material/wizard.tsx#L124) | UI, obligatorio | Permitir líneas libres. |
| A4 | Carga de productos y movimientos para el wizard | [nueva/material/page.tsx](../src/app/(app)/cotizaciones/nueva/material/page.tsx) → `listProductosActivosConMovimientos` | Datos | — |
| A5 | **Aceptar exige stock suficiente** y aborta toda la transacción si no alcanza | [cotizaciones.ts:339-347](../src/lib/data/cotizaciones.ts#L339) | **Regla de negocio, bloqueante** | Hacer la validación opcional/solo advertencia o condicionada a que la línea tenga `productoId`. |
| A6 | **Aceptar escribe `MovimientoInventario` SALIDA** por cada línea, en la misma transacción que estado y CxC | [cotizaciones.ts:353-363](../src/lib/data/cotizaciones.ts#L353) | Escritura cruzada, **bloqueante** | Separar en paso aparte/opcional (o evento posterior). |
| A7 | Advisory lock por producto dentro de la aceptación | [cotizaciones.ts:308-310](../src/lib/data/cotizaciones.ts#L308), `locks.ts` | Concurrencia | Cae junto con A5/A6. |
| A8 | Lógica "primera aceptación" atada a ausencia de CxC (une inventario con cobranza) | [cotizaciones.ts:330](../src/lib/data/cotizaciones.ts#L330) | Estado implícito | Marcar el descuento con un registro propio en vez de inferirlo. |
| A9 | Textos que prometen el acoplamiento | [confirm-modals.tsx:66](../src/app/(app)/cotizaciones/confirm-modals.tsx#L66); [nueva/page.tsx:35](../src/app/(app)/cotizaciones/nueva/page.tsx#L35); [nueva/material/page.tsx:18](../src/app/(app)/cotizaciones/nueva/material/page.tsx#L18) | Display | — |
| A10 | `precioUnitario` se precarga de `Producto.precioVentaSugerido` (editable; solo conveniencia) | [wizard.tsx:35,111,187](../src/app/(app)/cotizaciones/nueva/material/wizard.tsx) | Conveniencia, **no** obligatorio | — |

Lo que **no** depende de Inventario: totales fiscales, estados, CxC/abonos, kanban, folios y exportación (salvo A1 en el nombre/unidad de cada línea). El módulo de Inventario sí depende de Cotización solo de forma débil (texto `referencia`).

Acoplamiento inverso: `Producto` ← `MovimientoInventario` (Cascade). Borrar un Producto borraría su historial, pero la UI nunca borra productos.

---

## 5. Datos reales en producción (conteos al 2026-11-10)

BD: Supabase Postgres (la misma que usa `.env`). Consulta de solo lectura.

| Tabla | Registros | Detalle |
|---|---|---|
| Cliente | **5** | 4 Persona Moral, 1 Persona Física; los 5 tienen cotizaciones |
| Cotizacion | **11** | SERVICIO: 6 Borrador, 1 Enviada, 1 Aceptada · MATERIAL: 3 Borrador, 0 Aceptadas · `esSoporte`: 0 · rango 2026-08-22 → 2026-10-28 |
| LineaCotizacion / LineaCotizacionMaterial | 8 / 8 | |
| Puesto | **6** | |
| Servicio | **5** | 4 activos; 5 ligados a Puesto, 0 con sueldo inline |
| Producto | **3** | 3 activos (nombres tipo "PRUEBA F9 - …": datos de prueba) |
| MovimientoInventario | 6 | 3 ENTRADA + 3 SALIDA `VENTA_CLIENTE` (todas ref. `COT-2026-0003`, que está en Borrador) |
| CuentaPorCobrar / AbonoPorCobrar | **3** / 1 | Montos: 16,329.32 (COT-0001, Aceptada, 1 abono) · 79.67 (COT-0002, Enviada) · 2,036.81 (COT-0003, Material Borrador). Total 18,445.80; 0 canceladas |
| CuentaPorPagar / AbonoPorPagar | **0** / 0 | Módulo sin uso |
| Activo / EventoActivo | 1 / 0 | 1 Funcional |
| CuentaBancaria | 1 | |
| Usuario / Session | 2 / 2 | |
| CeavBanda / SystemConfig / FolioSecuencia | 8 / 1 / 1 | |
| LoginAttempt | 0 | |

Lectura del uso real:
- Se cotiza principalmente **Servicio** (8 de 11; es el único tipo que ha llegado a Aceptada con cobro). Material: 3 cotizaciones, ninguna Aceptada hoy; el inventario existente es de prueba.
- Solo **1 cotización Aceptada** y **1 abono** registrado. Cuentas por pagar: sin uso. Activos: 1 registro.
- Hay 5 clientes registrados (no 2); el "~2 activos" coincide con que solo COT-0001 llegó a cobro. Ningún folio se repite; el folio más alto es `COT-2026-0025` (hay cotizaciones eliminadas, la secuencia es atómica).
- Incoherencia de datos a revisar (efecto del hueco 3.3): 2 CxC viven sobre cotizaciones que ya no están Aceptadas (`COT-0002` Enviada, `COT-0003` Borrador) y `COT-0003` conserva sus salidas de inventario.

---

## 6. Resumen de hallazgos para decidir el desacople

1. El acoplamiento Material⇢Inventario es de **tres capas**: FK obligatoria de la línea (A1–A2), wizard inutilizable sin productos (A3), y la aceptación que valida y escribe inventario en la misma transacción que la CxC (A5–A8).
2. Servicio **no** toca inventario: desacoplar solo implica tocar la rama MATERIAL de `confirmarAceptacionMaterial`.
3. Cualquier desacople debe resolver primero la **no-reversión de stock** y el **doble descuento al re-aceptar tras rechazar** (3.3, puntos 1–2), porque hoy el sistema solo se protege por la presencia de la CxC.
4. El candado cubre la normativa de nómina y la identidad/leyendas del documento, pero **no** `ivaPct` ni `retencionIsrPct`.
