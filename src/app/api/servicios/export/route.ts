import ExcelJS from "exceljs";
import { requireSession } from "@/lib/auth/session";
import { listServicios } from "@/lib/data/servicios";
import { getSystemConfigConCeav } from "@/lib/data/config";
import { calcularCostoReal } from "@/lib/costEngine";
import { sueldoMensualEfectivo } from "@/lib/servicioCosto";
import { SERVICIO_CATEGORIA_LABELS, type ServicioCategoria } from "@/lib/enums";
import { styleHeaderRow, workbookToBuffer, xlsxResponse } from "@/lib/export/excel";

export async function GET() {
  await requireSession();

  const [servicios, config] = await Promise.all([listServicios(), getSystemConfigConCeav()]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Servicios");
  sheet.columns = [
    { header: "Nombre", key: "nombre", width: 30 },
    { header: "Categoría", key: "categoria", width: 18 },
    { header: "Descripción", key: "descripcion", width: 40 },
    { header: "Costo real mensual", key: "costoMensual", width: 18, style: { numFmt: "$#,##0.00" } },
    { header: "Costo real por hora", key: "costoHora", width: 18, style: { numFmt: "$#,##0.00" } },
    { header: "Activo", key: "activo", width: 10 },
  ];

  for (const s of servicios) {
    const costo = calcularCostoReal(config, {
      sueldoMensualPuesto: sueldoMensualEfectivo(s),
      incluyeUniforme: s.incluyeUniforme,
      costoUniforme: s.costoUniforme,
      vidaUtilUniformeMeses: s.vidaUtilUniformeMeses,
      incluyeMaterial: s.incluyeMaterial,
      costoMaterial: s.costoMaterial,
      vidaUtilMaterialMeses: s.vidaUtilMaterialMeses,
    });
    sheet.addRow({
      nombre: s.nombre,
      categoria: SERVICIO_CATEGORIA_LABELS[s.categoria as ServicioCategoria],
      descripcion: s.descripcion ?? "",
      costoMensual: costo.costoRealMensual,
      costoHora: costo.costoRealHora,
      activo: s.activo ? "Sí" : "No",
    });
  }
  styleHeaderRow(sheet);

  const buffer = await workbookToBuffer(workbook);
  return xlsxResponse(buffer, "servicios.xlsx");
}
