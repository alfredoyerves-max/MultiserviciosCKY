import fs from "fs";
import path from "path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CotizacionExportData } from "./cotizacionData";

const GRAY = "6b7280";
const DARK = "1a1a1a";
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

// Monograma "CK" recortado, fondo blanco intencional (se funde con la
// hoja) — ver public/branding/logo-icon.png. Para cambiar el logotipo
// después, basta con reemplazar ese archivo (o apuntar esta ruta a otro).
const LOGO_PATH = path.join(process.cwd(), "public", "branding", "logo-icon.png");

function logoBlock(): Paragraph {
  const data = fs.readFileSync(LOGO_PATH);
  return new Paragraph({
    children: [
      new ImageRun({
        data,
        type: "png",
        transformation: { width: 56, height: 61 },
      }),
    ],
  });
}

function headerBlock(data: CotizacionExportData): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              logoBlock(),
              new Paragraph({
                spacing: { before: 120 },
                children: [new TextRun({ text: "Carlos Yerves Multiservicios", bold: true, size: 28 })],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Limpieza · Seguridad · Mantenimiento · Fumigación",
                    italics: true,
                    size: 18,
                    color: GRAY,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "FOLIO", size: 16, color: GRAY })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: data.folio, bold: true, size: 28, color: DARK })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function infoLine(label: string, value: string | null): Paragraph | null {
  if (!value) return null;
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${label}: `, size: 18, color: GRAY }),
      new TextRun({ text: value, size: 18 }),
    ],
  });
}

function prestadorClienteBlock(data: CotizacionExportData): Table {
  const prestadorLineas = [
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: "Prestador de servicio", bold: true, size: 20 })],
    }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: data.prestador.nombre, size: 18 })] }),
    infoLine("RFC", data.prestador.rfc),
    infoLine("Régimen fiscal", data.prestador.regimenFiscal),
    infoLine("Dirección", data.prestador.direccion),
    infoLine("Teléfono", data.prestador.telefono),
    infoLine("Correo", data.prestador.email),
  ].filter((p): p is Paragraph => p !== null);

  const clienteLineas = [
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Cliente", bold: true, size: 20 })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: data.cliente.nombre, size: 18 })] }),
    infoLine("Tipo", data.cliente.tipoLabel),
    infoLine("RFC", data.cliente.rfc),
    infoLine("Contacto", data.cliente.contacto),
    data.proyecto ? infoLine("Proyecto", data.proyecto) : null,
  ].filter((p): p is Paragraph => p !== null);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, children: prestadorLineas }),
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, children: clienteLineas }),
        ],
      }),
    ],
  });
}

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb" };
const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "f3f4f6" },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18 })] })],
  });
}

function dataCell(text: string, width: number, alignRight = false): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, size: 18 })],
      }),
    ],
  });
}

function lineasServicioTable(data: CotizacionExportData): Table {
  const cols = [34, 18, 12, 12, 24];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell("Servicio", cols[0]),
          headerCell("Modalidad", cols[1]),
          headerCell("Personas", cols[2]),
          headerCell("Duración", cols[3]),
          headerCell("Importe", cols[4]),
        ],
      }),
      ...data.lineasServicio.map(
        (l) =>
          new TableRow({
            children: [
              dataCell(l.servicioNombre, cols[0]),
              dataCell(l.modalidadLabel, cols[1]),
              dataCell(String(l.personas), cols[2]),
              dataCell(String(l.duracion), cols[3]),
              dataCell(formatCurrency(l.precioVenta), cols[4], true),
            ],
          })
      ),
    ],
  });
}

function lineasMaterialTable(data: CotizacionExportData): Table {
  const cols = [40, 15, 20, 25];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell("Producto", cols[0]),
          headerCell("Cantidad", cols[1]),
          headerCell("Precio unitario", cols[2]),
          headerCell("Importe", cols[3]),
        ],
      }),
      ...data.lineasMaterial.map(
        (l) =>
          new TableRow({
            children: [
              dataCell(l.productoNombre, cols[0]),
              dataCell(`${l.cantidad} ${l.unidadLabel}`, cols[1]),
              dataCell(formatCurrency(l.precioUnitario), cols[2], true),
              dataCell(formatCurrency(l.importe), cols[3], true),
            ],
          })
      ),
    ],
  });
}

function fiscalRow(label: string, value: string, opts: { bold?: boolean; size?: number; color?: string } = {}): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${label}  `, size: opts.size ?? 18, color: opts.color ?? DARK }),
      new TextRun({ text: value, bold: opts.bold ?? false, size: opts.size ?? 18, color: opts.color ?? DARK }),
    ],
  });
}

function fiscalBlock(data: CotizacionExportData): Paragraph[] {
  const rows = [
    fiscalRow("Subtotal:", formatCurrency(data.subtotal)),
    fiscalRow("IVA (16%):", formatCurrency(data.iva)),
  ];
  if (data.retencionIsr > 0) {
    rows.push(fiscalRow("Retención ISR (1.25%):", `- ${formatCurrency(data.retencionIsr)}`));
  }
  rows.push(fiscalRow("Total a pagar:", formatCurrency(data.totalAPagar), { bold: true, size: 22 }));
  rows.push(fiscalRow("Neto a recibir:", formatCurrency(data.netoARecibir), { size: 16, color: GRAY }));
  return rows;
}

export async function generarCotizacionDocx(data: CotizacionExportData): Promise<Buffer> {
  const lineasTable = data.tipo === "SERVICIO" ? lineasServicioTable(data) : lineasMaterialTable(data);
  const tituloTabla = data.tipo === "SERVICIO" ? "Servicios cotizados" : "Materiales cotizados";

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          headerBlock(data),
          new Paragraph({ spacing: { before: 300, after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "e5e7eb" } }, children: [] }),
          prestadorClienteBlock(data),
          new Paragraph({ spacing: { before: 300, after: 120 }, children: [new TextRun({ text: tituloTabla, bold: true, size: 22 })] }),
          lineasTable,
          new Paragraph({ spacing: { before: 300 }, children: [] }),
          ...fiscalBlock(data),
          new Paragraph({
            spacing: { before: 500 },
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb" } },
            children: [],
          }),
          new Paragraph({
            spacing: { before: 120 },
            children: [
              new TextRun({
                text: `Fecha de emisión: ${formatDate(data.fechaEmision)}  ·  Vigente hasta: ${formatDate(data.fechaVigencia)}`,
                size: 16,
                color: GRAY,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
