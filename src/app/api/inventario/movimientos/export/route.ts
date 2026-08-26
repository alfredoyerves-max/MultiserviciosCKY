import ExcelJS from "exceljs";
import { requireSession } from "@/lib/auth/session";
import { listMovimientosInventario } from "@/lib/data/movimientosInventario";
import { UNIDAD_MEDIDA_LABELS, MOTIVO_SALIDA_LABELS, type UnidadMedida, type MotivoSalida } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { styleHeaderRow, workbookToBuffer, xlsxResponse } from "@/lib/export/excel";

export async function GET() {
  await requireSession();

  const movimientos = await listMovimientosInventario();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Movimientos");
  sheet.columns = [
    { header: "Producto", key: "producto", width: 30 },
    { header: "Tipo", key: "tipo", width: 12 },
    { header: "Cantidad", key: "cantidad", width: 12 },
    { header: "Unidad", key: "unidad", width: 12 },
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Proveedor / Motivo", key: "detalle", width: 28 },
    { header: "Referencia", key: "referencia", width: 20 },
    { header: "Costo unitario", key: "costoUnitario", width: 16, style: { numFmt: "$#,##0.00" } },
  ];

  for (const m of movimientos) {
    sheet.addRow({
      producto: m.producto.nombre,
      tipo: m.tipo === "ENTRADA" ? "Entrada" : "Salida",
      cantidad: m.cantidad,
      unidad: UNIDAD_MEDIDA_LABELS[m.producto.unidadMedida as UnidadMedida],
      fecha: formatDate(m.fecha),
      detalle: m.tipo === "ENTRADA" ? (m.proveedor ?? "") : MOTIVO_SALIDA_LABELS[m.motivoSalida as MotivoSalida],
      referencia: m.referencia ?? "",
      costoUnitario: m.costoUnitario ?? null,
    });
  }
  styleHeaderRow(sheet);

  const buffer = await workbookToBuffer(workbook);
  return xlsxResponse(buffer, "movimientos-inventario.xlsx");
}
