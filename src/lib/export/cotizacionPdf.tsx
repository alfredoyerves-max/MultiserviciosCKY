import fs from "fs";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CotizacionExportData } from "./cotizacionData";

const ACCENT = "#00b8c9"; // versión ligeramente más saturada del cyan de marca (#00dbe9), para que el texto/bordes tengan suficiente contraste sobre blanco
const ACCENT_SOFT = "#e5fafc";
const GRAY = "#6b7280";
const GRAY_SOFT = "#9ca3af";
const DARK = "#16191c";
const BORDER = "#e2e5e9";
const ROW_ALT = "#f7f9fa";

// Monograma "CK" recortado, fondo blanco intencional (se funde con la
// página) — ver public/branding/logo-icon.png. Para cambiar el logotipo
// después, basta con reemplazar ese archivo (o apuntar esta ruta a otro).
// Se lee una sola vez al cargar el módulo, no en cada render.
const LOGO_PATH = path.join(process.cwd(), "public", "branding", "logo-icon.png");
const LOGO_DATA_URI = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString("base64")}`;

const styles = StyleSheet.create({
  page: { fontSize: 9.5, color: DARK, fontFamily: "Helvetica" },
  topBar: { height: 7, backgroundColor: ACCENT },
  body: { padding: 34, paddingTop: 24, paddingBottom: 20 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logoBrandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 38, height: 41 },
  brandName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK },
  tagline: { fontSize: 7.5, color: GRAY, fontStyle: "italic", marginTop: 2 },

  folioBox: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: "flex-end",
  },
  folioLabel: { fontSize: 7, color: GRAY, letterSpacing: 1 },
  folioValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: DARK, marginTop: 2 },
  folioTipo: { fontSize: 7, color: ACCENT, fontFamily: "Helvetica-Bold", marginTop: 3, letterSpacing: 0.5 },

  infoBox: {
    flexDirection: "row",
    marginTop: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
  },
  infoCol: { flex: 1, padding: 12 },
  infoColDivider: { borderLeftWidth: 1, borderLeftColor: BORDER },
  infoTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  infoName: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 4 },
  infoLine: { fontSize: 8.5, marginBottom: 3, color: DARK },
  infoLineLabel: { color: GRAY },

  sectionTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
  },

  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 3 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: DARK },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER },
  tableRowAlt: { backgroundColor: ROW_ALT },
  th: { padding: 7, fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  td: { padding: 7, fontSize: 8.5 },
  right: { textAlign: "right" },

  fiscalWrap: { marginTop: 18, flexDirection: "row", justifyContent: "flex-end" },
  fiscalBox: { width: "52%", borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: "hidden" },
  fiscalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  fiscalLabel: { fontSize: 8.5, color: GRAY },
  fiscalValue: { fontSize: 8.5, color: DARK },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: ACCENT_SOFT,
  },
  totalLabel: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: DARK, letterSpacing: 0.5 },
  totalValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK },

  legalBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    borderRadius: 2,
    padding: 10,
  },
  legalText: { fontSize: 7.5, color: GRAY, fontStyle: "italic", lineHeight: 1.5 },

  noteBlock: { marginTop: 13 },
  noteTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: ACCENT, letterSpacing: 0.8, marginBottom: 4 },
  noteText: { fontSize: 8.5, color: DARK, lineHeight: 1.5 },

  bankRow: { fontSize: 8.5, color: DARK, marginBottom: 3, lineHeight: 1.4 },
  bankLabel: { color: GRAY },
  methodsRow: { fontSize: 8.5, color: DARK, marginTop: 4 },

  signWrap: { marginTop: 22, flexDirection: "row", justifyContent: "space-between" },
  signCol: { width: "44%" },
  signSpacer: { height: 16 },
  signLine: { borderTopWidth: 1, borderTopColor: DARK, marginBottom: 6 },
  signLabel: { fontSize: 7, color: GRAY, letterSpacing: 0.8 },
  signValue: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: DARK, marginTop: 3 },

  footer: { marginTop: 18, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 },
  footerText: { fontSize: 7.5, color: GRAY_SOFT },
});

function Logo() {
  // eslint-disable-next-line jsx-a11y/alt-text -- <Image> de @react-pdf/renderer (genera un PDF, no HTML); no acepta `alt`.
  return <Image src={LOGO_DATA_URI} style={styles.logo} />;
}

function InfoLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <Text style={styles.infoLine}>
      <Text style={styles.infoLineLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

function LineasServicioTable({ data }: { data: CotizacionExportData }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.th, { width: "34%" }]}>Servicio</Text>
        <Text style={[styles.th, { width: "18%" }]}>Modalidad</Text>
        <Text style={[styles.th, { width: "12%" }]}>Personas</Text>
        <Text style={[styles.th, { width: "12%" }]}>Duración</Text>
        <Text style={[styles.th, styles.right, { width: "24%" }]}>Importe</Text>
      </View>
      {data.lineasServicio.map((l, i) => (
        <View style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : undefined]} key={i}>
          <Text style={[styles.td, { width: "34%" }]}>{l.servicioNombre}</Text>
          <Text style={[styles.td, { width: "18%" }]}>{l.modalidadLabel}</Text>
          <Text style={[styles.td, { width: "12%" }]}>{l.personas}</Text>
          <Text style={[styles.td, { width: "12%" }]}>{l.duracion}</Text>
          <Text style={[styles.td, styles.right, { width: "24%" }]}>{formatCurrency(l.precioVenta)}</Text>
        </View>
      ))}
    </View>
  );
}

function LineasMaterialTable({ data }: { data: CotizacionExportData }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.th, { width: "40%" }]}>Producto</Text>
        <Text style={[styles.th, { width: "15%" }]}>Cantidad</Text>
        <Text style={[styles.th, styles.right, { width: "20%" }]}>Precio unitario</Text>
        <Text style={[styles.th, styles.right, { width: "25%" }]}>Importe</Text>
      </View>
      {data.lineasMaterial.map((l, i) => (
        <View style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : undefined]} key={i}>
          <Text style={[styles.td, { width: "40%" }]}>{l.productoNombre}</Text>
          <Text style={[styles.td, { width: "15%" }]}>
            {l.cantidad} {l.unidadLabel}
          </Text>
          <Text style={[styles.td, styles.right, { width: "20%" }]}>{formatCurrency(l.precioUnitario)}</Text>
          <Text style={[styles.td, styles.right, { width: "25%" }]}>{formatCurrency(l.importe)}</Text>
        </View>
      ))}
    </View>
  );
}

const LEYENDA_RETENCION =
  "De conformidad con el Artículo 113-J de la Ley del ISR, al ser usted Persona Moral, se aplicará la retención obligatoria del 1.25% de ISR sobre el subtotal de esta operación. Dicho monto se reflejará descontado en el total neto de su factura para que proceda con su entero directo al SAT.";

function NoteBlock({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.noteBlock}>
      <Text style={styles.noteTitle}>{title}</Text>
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

function metodosPagoLabel(metodos: CotizacionExportData["metodosPago"]): string {
  const activos = [
    metodos.efectivo ? "Efectivo" : null,
    metodos.transferencia ? "Transferencia" : null,
    metodos.cheque ? "Cheque" : null,
  ].filter((m): m is string => m !== null);
  return activos.length > 0 ? activos.join(" · ") : "Consultar con el prestador de servicio";
}

function DatosBancariosBlock({ data }: { data: CotizacionExportData }) {
  return (
    <View style={styles.noteBlock}>
      <Text style={styles.noteTitle}>DATOS BANCARIOS Y MÉTODOS DE PAGO</Text>
      {data.cuentasBancarias.map((c, i) => (
        <Text style={styles.bankRow} key={i}>
          <Text style={styles.bankLabel}>{c.banco} — Titular: </Text>
          {c.titular}
          <Text style={styles.bankLabel}>  ·  CLABE: </Text>
          {c.clabe}
          {c.numeroCuenta && <Text style={styles.bankLabel}>  ·  Cuenta: </Text>}
          {c.numeroCuenta ?? ""}
        </Text>
      ))}
      <Text style={styles.methodsRow}>
        <Text style={styles.bankLabel}>Métodos de pago aceptados: </Text>
        {metodosPagoLabel(data.metodosPago)}
      </Text>
    </View>
  );
}

function FirmasBlock({ data }: { data: CotizacionExportData }) {
  return (
    <View style={styles.signWrap}>
      <View style={styles.signCol}>
        <View style={styles.signSpacer} />
        <View style={styles.signLine} />
        <Text style={styles.signLabel}>AUTORIZADO POR</Text>
        <Text style={styles.signValue}>{data.prestador.nombre}</Text>
      </View>
      <View style={styles.signCol}>
        <View style={styles.signSpacer} />
        <View style={styles.signLine} />
        <Text style={styles.signLabel}>ACEPTADO POR</Text>
        <Text style={[styles.signLabel, { marginTop: 16 }]}>FECHA</Text>
      </View>
    </View>
  );
}

function CotizacionPdfDocument({ data }: { data: CotizacionExportData }) {
  const esPersonaMoral = data.cliente.tipoCliente === "PERSONA_MORAL";

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.topBar} />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={styles.logoBrandRow}>
              <Logo />
              <View>
                <Text style={styles.brandName}>Carlos Yerves Multiservicios</Text>
                <Text style={styles.tagline}>Limpieza · Seguridad · Mantenimiento · Fumigación</Text>
              </View>
            </View>
            <View style={styles.folioBox}>
              <Text style={styles.folioLabel}>FOLIO</Text>
              <Text style={styles.folioValue}>{data.folio}</Text>
              <Text style={styles.folioTipo}>{data.tipo === "SERVICIO" ? "COTIZACIÓN DE SERVICIO" : "COTIZACIÓN DE MATERIAL"}</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoCol}>
              <Text style={styles.infoTitle}>PRESTADOR DE SERVICIO</Text>
              <Text style={styles.infoName}>{data.prestador.nombre}</Text>
              <InfoLine label="RFC" value={data.prestador.rfc} />
              <InfoLine label="Régimen fiscal" value={data.prestador.regimenFiscal} />
              <InfoLine label="Dirección" value={data.prestador.direccion} />
              <InfoLine label="Teléfono" value={data.prestador.telefono} />
              <InfoLine label="Correo" value={data.prestador.email} />
            </View>
            <View style={[styles.infoCol, styles.infoColDivider]}>
              <Text style={styles.infoTitle}>CLIENTE</Text>
              <Text style={styles.infoName}>{data.cliente.nombre}</Text>
              <InfoLine label="Tipo" value={data.cliente.tipoLabel} />
              <InfoLine label="RFC" value={data.cliente.rfc} />
              <InfoLine label="Contacto" value={data.cliente.contacto} />
              <InfoLine label="Proyecto" value={data.proyecto} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {data.tipo === "SERVICIO" ? "SERVICIOS COTIZADOS" : "MATERIALES COTIZADOS"}
          </Text>
          {data.tipo === "SERVICIO" ? <LineasServicioTable data={data} /> : <LineasMaterialTable data={data} />}

          <View style={styles.fiscalWrap}>
            <View style={styles.fiscalBox}>
              <View style={styles.fiscalRow}>
                <Text style={styles.fiscalLabel}>Subtotal</Text>
                <Text style={styles.fiscalValue}>{formatCurrency(data.subtotal)}</Text>
              </View>
              <View style={styles.fiscalRow}>
                <Text style={styles.fiscalLabel}>IVA trasladado (16%)</Text>
                <Text style={styles.fiscalValue}>{formatCurrency(data.iva)}</Text>
              </View>
              {data.retencionIsr > 0 && (
                <View style={styles.fiscalRow}>
                  <Text style={styles.fiscalLabel}>Retención ISR (1.25%)</Text>
                  <Text style={styles.fiscalValue}>- {formatCurrency(data.retencionIsr)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>{formatCurrency(data.netoARecibir)}</Text>
              </View>
            </View>
          </View>

          {esPersonaMoral && (
            <View style={styles.legalBox}>
              <Text style={styles.legalText}>{LEYENDA_RETENCION}</Text>
            </View>
          )}

          <NoteBlock title="CONDICIÓN DE PAGO" text={data.condicionPago} />
          <NoteBlock title="CONDICIONES COMERCIALES" text={data.condicionesComerciales} />
          <DatosBancariosBlock data={data} />
          <NoteBlock title="GARANTÍA Y CALIDAD" text={data.garantia} />

          <FirmasBlock data={data} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Fecha de emisión: {formatDate(data.fechaEmision)}  ·  Vigente hasta: {formatDate(data.fechaVigencia)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generarCotizacionPdf(data: CotizacionExportData): Promise<Buffer> {
  return renderToBuffer(<CotizacionPdfDocument data={data} />);
}
