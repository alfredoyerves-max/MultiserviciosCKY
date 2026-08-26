import ExcelJS from "exceljs";
import { requireSession } from "@/lib/auth/session";
import { listCuentasPorCobrar } from "@/lib/data/cuentasPorCobrar";
import { listCuentasPorPagar } from "@/lib/data/cuentasPorPagar";
import { calcularSaldo, calcularEstadoCuenta, ESTADO_CUENTA_LABELS_COBRAR, ESTADO_CUENTA_LABELS_PAGAR } from "@/lib/cuentas";
import { formatDate } from "@/lib/format";
import { styleHeaderRow, workbookToBuffer, xlsxResponse } from "@/lib/export/excel";

export async function GET() {
  await requireSession();

  const [cuentasPorCobrar, cuentasPorPagar] = await Promise.all([
    listCuentasPorCobrar(),
    listCuentasPorPagar(),
  ]);

  const workbook = new ExcelJS.Workbook();

  const cobrarSheet = workbook.addWorksheet("Por Cobrar");
  cobrarSheet.columns = [
    { header: "Cliente", key: "cliente", width: 30 },
    { header: "Folio cotización", key: "folio", width: 18 },
    { header: "Monto total", key: "montoTotal", width: 16, style: { numFmt: "$#,##0.00" } },
    { header: "Saldo pendiente", key: "saldo", width: 16, style: { numFmt: "$#,##0.00" } },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Fecha de vencimiento", key: "vencimiento", width: 18 },
  ];
  for (const c of cuentasPorCobrar) {
    const saldo = calcularSaldo(c.montoTotal, c.abonos);
    const estado = calcularEstadoCuenta(c.montoTotal, c.abonos, c.cancelada);
    cobrarSheet.addRow({
      cliente: c.cotizacion.cliente.nombreRazonSocial,
      folio: c.cotizacion.folio,
      montoTotal: c.montoTotal,
      saldo,
      estado: ESTADO_CUENTA_LABELS_COBRAR[estado],
      vencimiento: formatDate(c.fechaVencimiento),
    });
  }
  styleHeaderRow(cobrarSheet);

  const pagarSheet = workbook.addWorksheet("Por Pagar");
  pagarSheet.columns = [
    { header: "Concepto", key: "concepto", width: 30 },
    { header: "Proveedor", key: "proveedor", width: 26 },
    { header: "Monto total", key: "montoTotal", width: 16, style: { numFmt: "$#,##0.00" } },
    { header: "Saldo pendiente", key: "saldo", width: 16, style: { numFmt: "$#,##0.00" } },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Fecha de vencimiento", key: "vencimiento", width: 18 },
  ];
  for (const c of cuentasPorPagar) {
    const saldo = calcularSaldo(c.montoTotal, c.abonos);
    const estado = calcularEstadoCuenta(c.montoTotal, c.abonos);
    pagarSheet.addRow({
      concepto: c.concepto,
      proveedor: c.proveedor,
      montoTotal: c.montoTotal,
      saldo,
      estado: ESTADO_CUENTA_LABELS_PAGAR[estado],
      vencimiento: formatDate(c.fechaVencimiento),
    });
  }
  styleHeaderRow(pagarSheet);

  const buffer = await workbookToBuffer(workbook);
  return xlsxResponse(buffer, "cuentas-por-cobrar-y-pagar.xlsx");
}
