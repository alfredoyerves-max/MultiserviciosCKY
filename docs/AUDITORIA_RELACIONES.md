# Auditoría de relaciones y acciones (solo lectura)

Estado: **propuesta, pendiente de confirmación de Luis.** No se implementó nada de la sección d) ni e); no se tocó esquema ni datos. Fecha: 2026-11-12, rama `fase-7`.
Fuentes: `prisma/schema.prisma`, `src/lib/data/*`, menús "⋯" de cada pantalla, migración `20261110120000_cxc_solo_cotizacion_aceptada`.

## a) Relaciones padre → hijo y `onDelete` actual

"Restrict (implícito)" = el esquema no declara `onDelete`; en Prisma una relación obligatoria sin `onDelete` es Restrict (la BD rechaza el borrado del padre con hijos).

| Padre | Hijo | Campo | onDelete | Efecto real hoy |
|---|---|---|---|---|
| Cliente | Cotización | `clienteId` | Restrict (implícito) | Un cliente con cotizaciones no se puede borrar. No existe pantalla para borrar clientes. |
| Cotización | Línea de servicio | `cotizacionId` | **Cascade** | Al borrar la cotización se borran sus líneas. |
| Cotización | Línea de material | `cotizacionId` | **Cascade** | Igual. |
| Cotización | Cuenta por cobrar | `cotizacionId` (único) | Restrict (implícito) + triggers | No se borra una cotización con cuenta. Los triggers de la BD además impiden que exista cuenta sobre una cotización no Aceptada y que una Aceptada con cuenta cambie de estado. |
| Cuenta por cobrar | Abono por cobrar | `cuentaPorCobrarId` | **Cascade** | Borrar la cuenta borra sus abonos (la app solo la borra sin abonos). |
| Cuenta por pagar | Abono por pagar | `cuentaPorPagarId` | **Cascade** | Igual: la app solo borra sin abonos (comprobado también en la transacción, commit `b63f2e1`). |
| Producto | Movimiento | `productoId` | **Cascade** | Borrar un producto borraría todo su historial de movimientos. No hay acción de borrar producto (solo Desactivar), pero la protección es solo de interfaz. |
| Producto | Línea de material | `productoId` (opcional) | SetNull | Si se borrara el producto, la línea conserva su texto (descripción, unidad, precio son copia) y pierde el atajo. |
| Servicio | Línea de servicio | `servicioId` | Restrict (implícito) | Un servicio usado en cotizaciones no se puede borrar. No hay acción de borrar servicio (solo Activar/Desactivar). |
| Puesto | Servicio | `puestoId` (opcional) | SetNull | Si se borrara un puesto, los servicios quedarían sin puesto y con sueldo propio. Hoy la app lo evita con una revisión previa (ver b). |
| Activo | Evento de activo | `activoId` | **Cascade** | Borrar un activo borraría su historial. No hay acción de borrar activo (solo "Dar de baja"). |
| Usuario | Sesión | `usuarioId` | Cascade | Fuera del alcance del negocio. |

Sin relación (no hay llave foránea): **Cuenta bancaria** (no depende de ni la usa ninguna tabla por llave), **Configuración**, **Folio**.

## b) Acciones por pantalla: existen, faltan y bloqueos

| Pantalla / fila | Acciones hoy | Bloqueo por dependencias y mensaje | Falta |
|---|---|---|---|
| Cotizaciones (tablero y detalle, "⋯") | Ver detalle; cambiar estado (Borrador/Enviada/Aceptada/Rechazada); **Eliminar** | Cambiar estado de una Aceptada con abonos: opción desactivada con el texto "Ya tiene pagos registrados en su cuenta por cobrar." **Eliminar** no aparece (sin mensaje) si la cotización está Aceptada o tiene cuenta; el mensaje "…está Aceptada o tiene una cuenta por cobrar asociada" solo existe en el servidor y la interfaz nunca lo muestra. | Editar cotización (no existe). Avisar por qué no se puede eliminar, nombrando la cuenta con enlace. |
| Por cobrar (fila y detalle, "⋯") | Ver detalle; **Eliminar cuenta** (solo sin abonos) o **Cancelar cuenta** (con abonos); "Pagar saldo"; abono parcial | Eliminar con abonos: no se ofrece, se ofrece Cancelar. Abonar a cuenta cancelada: "No se pueden registrar abonos en una cuenta cancelada." | **Anular abono**; editar fecha/método de un abono; reabrir una cuenta cancelada. |
| Por pagar (fila y detalle, "⋯") | Ver detalle; **Eliminar cuenta** (solo sin abonos, con confirmación; punto 2 de este lote); "Pagar saldo"; abono parcial | Con abonos: opción desactivada "Eliminar (tiene abonos)", sin enlace ni lista. | Cancelar cuenta (el modelo no tiene `cancelada`); Anular abono; editar abono; editar la cuenta (concepto, proveedor, monto, vencimiento). |
| Servicios ("⋯") | Ver desglose; Editar; Activar/Desactivar | Ninguno (no hay borrado). | Eliminar servicio sin cotizaciones (hoy solo se desactiva; la BD ya lo protege con Restrict). |
| Puestos ("⋯") | Editar; **Eliminar** (con `confirm` del navegador) | Si hay servicios que lo usan: `alert` con "No se puede eliminar: N servicio(s) usan este puesto." No nombra los servicios ni da enlace; usa diálogos del navegador, no el modal de la app. | Mensaje con nombres y enlace; modal propio. |
| Productos ("⋯") | Movimientos; Editar; Activar/Desactivar | Ninguno (no hay borrado). | Eliminar producto sin movimientos ni líneas; hoy la BD no lo impediría por el Cascade. |
| Movimientos de un producto | Registrar entrada / salida | "Stock insuficiente: solo quedan N unidad(es) disponibles." | Editar o anular un movimiento (no existe; un error de captura no se corrige). |
| Activos ("⋯" y detalle) | Editar; cambiar estado (Funcional/En reparación); Dar de baja | Dado de baja: "no se puede reactivar desde aquí" / "ya está dado de baja". | Eliminar (por diseño no hay; el historial se conserva). Reactivar una baja hecha por error. |
| Cuentas bancarias (Configuración) | Activar/Desactivar; **Eliminar** (con contraseña fiscal y `alert` en error) | **Ninguna revisión de dependencias** en el código; no hay llave foránea, así que la BD tampoco bloquea. | Revisar si algún documento o configuración la usa antes de borrar. |
| Clientes | Se crean desde la cotización nueva; sin pantalla propia | Al crear: RFC repetido → "Ya existe un cliente con el RFC…". | Pantalla para editar o eliminar clientes (Fase 10). |

## c) Fechas de los abonos

| Abono | Campo | Qué es | ¿Editable hoy? |
|---|---|---|---|
| Por cobrar | `fecha` | Fecha del cobro que captura el usuario (en "Pagar saldo" se manda la de hoy). | **No.** No existe acción de editar abonos. |
| Por cobrar | `createdAt` | Momento en que se registró (sistema). | No (y no debe). |
| Por pagar | `fecha` | Fecha del pago que captura el usuario. | **No.** |
| Por pagar | `createdAt` | Momento en que se registró. | No. |
| Ambos | Método de pago | **No existe el campo.** Solo `nota` (texto libre). | — |
| Ambos | Quién lo registró | **No se guarda.** | — |

Hallazgo fuera de alcance (no corregido): el formulario "Registrar abono parcial" propone la fecha con `new Date().toISOString()`, que es la fecha en UTC. Por la tarde-noche en México propone el día siguiente. "Pagar saldo" sí usa fecha local. Conviene corregirlo con la misma función local.

## d) Propuesta: regla "se desmonta de la hoja a la raíz"

Orden de desmontaje (de la hoja a la raíz): **Abono → Cuenta → Cotización → Cliente**; **Movimiento → Producto**; **Evento → Activo**; **Servicio → Puesto**; **Línea → Cotización**.

1. Eliminar solo existe cuando el registro **no tiene hijos**. Si tiene, la opción sigue visible pero desactivada.
2. El aviso **nombra al hijo y lleva enlace** a la pantalla donde se resuelve. Ejemplos de texto:
   - Cuenta por pagar con abonos: "Tiene 1 abono de 5,000.00. Anúlalo primero →" (enlace al detalle de la cuenta).
   - Puesto en uso: "Lo usan 3 servicios: Limpieza A, Limpieza B, Vigilancia. Cambia su puesto primero →" (enlace a cada uno).
   - Cotización Aceptada: "Tiene la cuenta por cobrar de 11,329.32. Elimina o cancela la cuenta primero →".
3. El servidor repite la misma comprobación en la misma transacción (ya se hace en cuentas por pagar y por cobrar) y devuelve el mismo mensaje con nombres; la interfaz no decide sola.
4. Un solo componente de aviso/diálogo para todas las pantallas; sustituir `confirm`/`alert` del navegador (Puestos, Cuentas bancarias).
5. No requiere migración: es lógica de interfaz y de capa de datos. Los `Cascade` de la BD se dejan como red de seguridad, no como mecanismo de borrado.

Decisión que necesito de Luis: ¿también se bloquea con **hijos inactivos** (p. ej. un servicio desactivado que aún usa un puesto)? Propuesta: sí, se bloquea.

## e) Propuesta mínima: anular abono y editar fecha/método

### Anular abono (no se borra; se conserva el historial)

| Campo nuevo (en `AbonoPorCobrar` y `AbonoPorPagar`) | Tipo | Para qué | ¿Migración? |
|---|---|---|---|
| `anuladoAt` | fecha y hora, opcional | Marca de anulación (vacío = vigente) | **Sí** |
| `anuladoMotivo` | texto, opcional | Motivo obligatorio al anular | **Sí** |
| `anuladoPor` | texto, opcional (nombre de usuario) | Quién anuló | **Sí** |

- El saldo, el estado (Pendiente/Parcial/Pagada) y los KPI **ignoran los abonos anulados**. Esto **cambia el cálculo de saldo** (`calcularSaldo`, `calcularEstadoCuenta`): por la regla 9, se hace solo con tu autorización expresa y con pruebas antes y después sobre los datos existentes (todos vigentes → resultado idéntico).
- Anular lleva confirmación y motivo; la fila anulada se muestra tachada con motivo, fecha y usuario.
- Interacción con cotizaciones: hoy una Aceptada con abonos no puede cambiar de estado. **Decisión pendiente:** ¿solo cuentan los abonos vigentes? Propuesta: sí, y si todos están anulados la cuenta puede eliminarse.
- Una cuenta Pagada a la que se anula un abono vuelve a Parcial/Pendiente (el estado es calculado, no guardado).

### Editar fecha y método sin recalcular saldo

| Cambio | Detalle | ¿Migración? |
|---|---|---|
| Editar `fecha` del abono | Acción nueva con validación; no toca `monto`, así que el saldo no cambia. | **No** |
| Registrar quién y cuándo editó | `editadoAt` y `editadoPor` (opcionales). Sin esto la edición no deja rastro. | **Sí** (opcional pero recomendado) |
| Método de pago (efectivo, transferencia, cheque…) | Campo `metodo` opcional en ambos abonos; hoy no existe. Se captura al abonar y se puede corregir. | **Sí** |
| Editar `monto` | **Fuera de la propuesta**: cambiaría el saldo. Para corregir un monto: anular y registrar uno nuevo. | — |

Resumen: sin migración se puede hacer la regla d) completa y editar solo la fecha. **Anular abono, método, y el rastro de quién/cuándo requieren migración** (columnas opcionales, sin tocar datos existentes).

## Esperando confirmación

1. ¿Apruebas la regla d) tal como está (incluido bloquear por hijos inactivos)?
2. ¿Autorizas el modelo de e) (3 columnas de anulación, `metodo`, `editadoAt/Por`) y el cambio de `calcularSaldo`/`calcularEstadoCuenta` para ignorar abonos anulados?
3. ¿Los abonos anulados dejan de contar para bloquear el cambio de estado de la cotización?
