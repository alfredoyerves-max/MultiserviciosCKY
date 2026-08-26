import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getCotizacion } from "@/lib/data/cotizaciones";
import { getSystemConfig } from "@/lib/data/config";
import { listCuentasBancariasActivas } from "@/lib/data/cuentasBancarias";
import { buildCotizacionExportData } from "@/lib/export/cotizacionData";
import { generarCotizacionDocx } from "@/lib/export/cotizacionDocx";
import { generarCotizacionPdf } from "@/lib/export/cotizacionPdf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();

  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "docx";

  const [cotizacion, config, cuentasBancarias] = await Promise.all([
    getCotizacion(id),
    getSystemConfig(),
    listCuentasBancariasActivas(),
  ]);
  const data = buildCotizacionExportData(cotizacion, config, cuentasBancarias);

  if (format === "pdf") {
    const buffer = await generarCotizacionPdf(data);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${data.folio}.pdf"`,
      },
    });
  }

  const buffer = await generarCotizacionDocx(data);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${data.folio}.docx"`,
    },
  });
}
