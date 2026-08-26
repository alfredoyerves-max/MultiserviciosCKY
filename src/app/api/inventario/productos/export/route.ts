import ExcelJS from "exceljs";
import { requireSession } from "@/lib/auth/session";
import { listProductosConMovimientos } from "@/lib/data/productos";
import { calcularStock } from "@/lib/inventario";
import { UNIDAD_MEDIDA_LABELS, type UnidadMedida } from "@/lib/enums";
import { styleHeaderRow, workbookToBuffer, xlsxResponse } from "@/lib/export/excel";

export async function GET() {
  await requireSession();

  const productos = await listProductosConMovimientos();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Productos");
  sheet.columns = [
    { header: "Nombre", key: "nombre", width: 30 },
    { header: "Unidad", key: "unidad", width: 14 },
    { header: "Descripción", key: "descripcion", width: 40 },
    { header: "Último costo de compra", key: "costo", width: 20, style: { numFmt: "$#,##0.00" } },
    { header: "Precio de venta sugerido", key: "precio", width: 20, style: { numFmt: "$#,##0.00" } },
    { header: "Stock actual", key: "stock", width: 14 },
    { header: "Activo", key: "activo", width: 10 },
  ];

  for (const p of productos) {
    sheet.addRow({
      nombre: p.nombre,
      unidad: UNIDAD_MEDIDA_LABELS[p.unidadMedida as UnidadMedida],
      descripcion: p.descripcion ?? "",
      costo: p.costoCompraReciente ?? null,
      precio: p.precioVentaSugerido ?? null,
      stock: calcularStock(p.movimientos),
      activo: p.activo ? "Sí" : "No",
    });
  }
  styleHeaderRow(sheet);

  const buffer = await workbookToBuffer(workbook);
  return xlsxResponse(buffer, "productos.xlsx");
}
