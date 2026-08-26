import fs from "fs";
import path from "path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
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

const ACCENT = "00b8c9"; // versión ligeramente más saturada del cyan de marca (#00dbe9), para que texto/bordes tengan suficiente contraste sobre blanco
const ACCENT_SOFT = "e5fafc";
const GRAY = "6b7280";
const GRAY_SOFT = "9ca3af";
const DARK = "16191c";
const BORDER_COLOR = "e2e5e9";
const ROW_ALT = "f7f9fa";

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR };
const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };
const BOX_BORDER = { style: BorderStyle.SINGLE, size: 6, color: BORDER_COLOR };
const BOX_BORDERS = { top: BOX_BORDER, bottom: BOX_BORDER, left: BOX_BORDER, right: BOX_BORDER };

// Monograma "CK" recortado, fondo blanco intencional (se funde con la
// hoja) — ver public/branding/logo-icon.png. Para cambiar el logotipo
// después, basta con reemplazar ese archivo (o apuntar esta ruta a otro).
const LOGO_PATH = path.join(process.cwd(), "public", "branding", "logo-icon.png");

/** Barra de acento en todo el ancho de la página, arriba del membrete. */
function topBar(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        height: { value: 90, rule: HeightRule.EXACT },
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, color: "auto", fill: ACCENT },
            borders: NO_BORDERS,
            children: [new Paragraph({ children: [] })],
          }),
        ],
      }),
    ],
  });
}

function logoBlock(): Paragraph {
  const data = fs.readFileSync(LOGO_PATH);
  return new Paragraph({
    children: [
      new ImageRun({
        data,
        type: "png",
        transformation: { width: 50, height: 54 },
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
            width: { size: 62, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: NO_BORDERS,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ width: { size: 900, type: WidthType.DXA }, borders: NO_BORDERS, children: [logoBlock()] }),
                      new TableCell({
                        borders: NO_BORDERS,
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { left: 150 },
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: "Carlos Yerves Multiservicios", bold: true, size: 26, color: DARK })],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Limpieza · Seguridad · Mantenimiento · Fumigación",
                                italics: true,
                                size: 16,
                                color: GRAY,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            borders: BOX_BORDERS,
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFFFFF" },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "FOLIO", size: 14, color: GRAY, characterSpacing: 12 })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 20 },
                children: [new TextRun({ text: data.folio, bold: true, size: 26, color: DARK })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 40 },
                children: [
                  new TextRun({
                    text: data.tipo === "SERVICIO" ? "COTIZACIÓN DE SERVICIO" : "COTIZACIÓN DE MATERIAL",
                    bold: true,
                    size: 13,
                    color: ACCENT,
                  }),
                ],
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
      new TextRun({ text: `${label}: `, size: 17, color: GRAY }),
      new TextRun({ text: value, size: 17, color: DARK }),
    ],
  });
}

function prestadorClienteBlock(data: CotizacionExportData): Table {
  const prestadorLineas = [
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: "PRESTADOR DE SERVICIO", bold: true, size: 15, color: ACCENT, characterSpacing: 8 })],
    }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: data.prestador.nombre, bold: true, size: 20, color: DARK })] }),
    infoLine("RFC", data.prestador.rfc),
    infoLine("Régimen fiscal", data.prestador.regimenFiscal),
    infoLine("Dirección", data.prestador.direccion),
    infoLine("Teléfono", data.prestador.telefono),
    infoLine("Correo", data.prestador.email),
  ].filter((p): p is Paragraph => p !== null);

  const clienteLineas = [
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: "CLIENTE", bold: true, size: 15, color: ACCENT, characterSpacing: 8 })],
    }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: data.cliente.nombre, bold: true, size: 20, color: DARK })] }),
    infoLine("Tipo", data.cliente.tipoLabel),
    infoLine("RFC", data.cliente.rfc),
    infoLine("Contacto", data.cliente.contacto),
    data.proyecto ? infoLine("Proyecto", data.proyecto) : null,
  ].filter((p): p is Paragraph => p !== null);

  const CENTER_BORDER = { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BOX_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: CENTER_BORDER },
            margins: { top: 150, bottom: 150, left: 200, right: 200 },
            children: prestadorLineas,
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
            margins: { top: 150, bottom: 150, left: 200, right: 200 },
            children: clienteLineas,
          }),
        ],
      }),
    ],
  });
}

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: DARK },
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 16, color: "FFFFFF" })] })],
  });
}

function dataCell(text: string, width: number, alignRight = false, shaded = false): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    shading: shaded ? { type: ShadingType.CLEAR, color: "auto", fill: ROW_ALT } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, size: 18, color: DARK })],
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
          headerCell("SERVICIO", cols[0]),
          headerCell("MODALIDAD", cols[1]),
          headerCell("PERSONAS", cols[2]),
          headerCell("DURACIÓN", cols[3]),
          headerCell("IMPORTE", cols[4]),
        ],
      }),
      ...data.lineasServicio.map(
        (l, i) =>
          new TableRow({
            children: [
              dataCell(l.servicioNombre, cols[0], false, i % 2 === 1),
              dataCell(l.modalidadLabel, cols[1], false, i % 2 === 1),
              dataCell(String(l.personas), cols[2], false, i % 2 === 1),
              dataCell(String(l.duracion), cols[3], false, i % 2 === 1),
              dataCell(formatCurrency(l.precioVenta), cols[4], true, i % 2 === 1),
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
          headerCell("PRODUCTO", cols[0]),
          headerCell("CANTIDAD", cols[1]),
          headerCell("PRECIO UNITARIO", cols[2]),
          headerCell("IMPORTE", cols[3]),
        ],
      }),
      ...data.lineasMaterial.map(
        (l, i) =>
          new TableRow({
            children: [
              dataCell(l.productoNombre, cols[0], false, i % 2 === 1),
              dataCell(`${l.cantidad} ${l.unidadLabel}`, cols[1], false, i % 2 === 1),
              dataCell(formatCurrency(l.precioUnitario), cols[2], true, i % 2 === 1),
              dataCell(formatCurrency(l.importe), cols[3], true, i % 2 === 1),
            ],
          })
      ),
    ],
  });
}

function fiscalLineRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        borders: { top: NO_BORDER, bottom: CELL_BORDER, left: NO_BORDER, right: NO_BORDER },
        margins: { top: 70, bottom: 70, left: 150, right: 150 },
        children: [new Paragraph({ children: [new TextRun({ text: label, size: 17, color: GRAY })] })],
      }),
      new TableCell({
        borders: { top: NO_BORDER, bottom: CELL_BORDER, left: NO_BORDER, right: NO_BORDER },
        margins: { top: 70, bottom: 70, left: 150, right: 150 },
        children: [
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: value, size: 17, color: DARK })] }),
        ],
      }),
    ],
  });
}

/** Bloque de totales — tabla de ~50% de ancho, empujada a la derecha
 *  dentro de una tabla exterior de 2 columnas (patrón ya usado en
 *  headerBlock). La fila de Total lleva shading de acento y letra grande
 *  — es el único total que se muestra (subtotal + iva − retención), igual
 *  que el campo "Total" de un CFDI real con retención ya viene neto. */
function fiscalBlock(data: CotizacionExportData): Table {
  const rows = [fiscalLineRow("Subtotal", formatCurrency(data.subtotal)), fiscalLineRow("IVA trasladado (16%)", formatCurrency(data.iva))];
  if (data.retencionIsr > 0) {
    rows.push(fiscalLineRow("Retención ISR (1.25%)", `- ${formatCurrency(data.retencionIsr)}`));
  }

  const totalRow = new TableRow({
    children: [
      new TableCell({
        borders: NO_BORDERS,
        shading: { type: ShadingType.CLEAR, color: "auto", fill: ACCENT_SOFT },
        margins: { top: 120, bottom: 120, left: 150, right: 150 },
        children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true, size: 20, color: DARK, characterSpacing: 6 })] })],
      }),
      new TableCell({
        borders: NO_BORDERS,
        shading: { type: ShadingType.CLEAR, color: "auto", fill: ACCENT_SOFT },
        margins: { top: 120, bottom: 120, left: 150, right: 150 },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: formatCurrency(data.netoARecibir), bold: true, size: 26, color: DARK })],
          }),
        ],
      }),
    ],
  });

  const totalsBox = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BOX_BORDERS,
    rows: [...rows, totalRow],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 46, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, children: [new Paragraph({ children: [] })] }),
          new TableCell({ width: { size: 54, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, children: [totalsBox] }),
        ],
      }),
    ],
  });
}

const LEYENDA_RETENCION =
  'De conformidad con el Artículo 113-J de la Ley del ISR, al ser usted Persona Moral, se aplicará la retención obligatoria del 1.25% de ISR sobre el subtotal de esta operación. Dicho monto se reflejará descontado en el total neto de su factura para que proceda con su entero directo al SAT.';

function leyendaRetencionBlock(): Paragraph {
  return new Paragraph({
    spacing: { before: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 } },
    children: [new TextRun({ text: LEYENDA_RETENCION, italics: true, size: 15, color: GRAY })],
  });
}

export async function generarCotizacionDocx(data: CotizacionExportData): Promise<Buffer> {
  const lineasTable = data.tipo === "SERVICIO" ? lineasServicioTable(data) : lineasMaterialTable(data);
  const tituloTabla = data.tipo === "SERVICIO" ? "SERVICIOS COTIZADOS" : "MATERIALES COTIZADOS";
  const esPersonaMoral = data.cliente.tipoCliente === "PERSONA_MORAL";

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 0, bottom: 700, left: 700, right: 700 } } },
        children: [
          topBar(),
          new Paragraph({ spacing: { before: 260 }, children: [] }),
          headerBlock(data),
          new Paragraph({ spacing: { before: 260, after: 0 }, children: [] }),
          prestadorClienteBlock(data),
          new Paragraph({ spacing: { before: 300, after: 120 }, children: [new TextRun({ text: tituloTabla, bold: true, size: 19, color: DARK, characterSpacing: 6 })] }),
          lineasTable,
          new Paragraph({ spacing: { before: 260 }, children: [] }),
          fiscalBlock(data),
          ...(esPersonaMoral ? [leyendaRetencionBlock()] : []),
          new Paragraph({
            spacing: { before: 400 },
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
            children: [],
          }),
          new Paragraph({
            spacing: { before: 120 },
            children: [
              new TextRun({
                text: `Fecha de emisión: ${formatDate(data.fechaEmision)}  ·  Vigente hasta: ${formatDate(data.fechaVigencia)}`,
                size: 15,
                color: GRAY_SOFT,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
