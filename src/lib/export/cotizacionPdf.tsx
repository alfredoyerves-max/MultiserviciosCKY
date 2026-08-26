import fs from "fs";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CotizacionExportData } from "./cotizacionData";

const GRAY = "#6b7280";
const DARK = "#1a1a1a";
const BORDER = "#e5e7eb";

// Monograma "CK" recortado, fondo blanco intencional (se funde con la
// página) — ver public/branding/logo-icon.png. Para cambiar el logotipo
// después, basta con reemplazar ese archivo (o apuntar esta ruta a otro).
// Se lee una sola vez al cargar el módulo, no en cada render.
const LOGO_PATH = path.join(process.cwd(), "public", "branding", "logo-icon.png");
const LOGO_DATA_URI = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString("base64")}`;

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: DARK, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 40, height: 43 },
  brandName: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 8 },
  tagline: { fontSize: 8, color: GRAY, fontStyle: "italic", marginTop: 2 },
  folioLabel: { fontSize: 8, color: GRAY, textAlign: "right" },
  folioValue: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoCol: { width: "48%" },
  infoTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  infoLine: { fontSize: 9, marginBottom: 3 },
  infoLineLabel: { color: GRAY },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 20, marginBottom: 8 },
  table: { borderWidth: 1, borderColor: BORDER },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f3f4f6" },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER },
  th: { padding: 6, fontSize: 9, fontFamily: "Helvetica-Bold" },
  td: { padding: 6, fontSize: 9 },
  right: { textAlign: "right" },
  fiscalBlock: { marginTop: 16, alignItems: "flex-end" },
  fiscalRow: { flexDirection: "row", marginBottom: 4 },
  fiscalLabel: { fontSize: 9, marginRight: 6 },
  fiscalValue: { fontSize: 9 },
  totalLabel: { fontSize: 12, marginRight: 6 },
  totalValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  netoLabel: { fontSize: 8, color: GRAY, marginRight: 6 },
  netoValue: { fontSize: 8, color: GRAY },
  footer: { marginTop: 32, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 },
  footerText: { fontSize: 8, color: GRAY },
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
        <View style={styles.tableRow} key={i}>
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
        <View style={styles.tableRow} key={i}>
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

function CotizacionPdfDocument({ data }: { data: CotizacionExportData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Logo />
            <Text style={styles.brandName}>Carlos Yerves Multiservicios</Text>
            <Text style={styles.tagline}>Limpieza · Seguridad · Mantenimiento · Fumigación</Text>
          </View>
          <View>
            <Text style={styles.folioLabel}>FOLIO</Text>
            <Text style={styles.folioValue}>{data.folio}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoTitle}>Prestador de servicio</Text>
            <Text style={styles.infoLine}>{data.prestador.nombre}</Text>
            <InfoLine label="RFC" value={data.prestador.rfc} />
            <InfoLine label="Régimen fiscal" value={data.prestador.regimenFiscal} />
            <InfoLine label="Dirección" value={data.prestador.direccion} />
            <InfoLine label="Teléfono" value={data.prestador.telefono} />
            <InfoLine label="Correo" value={data.prestador.email} />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoTitle}>Cliente</Text>
            <Text style={styles.infoLine}>{data.cliente.nombre}</Text>
            <InfoLine label="Tipo" value={data.cliente.tipoLabel} />
            <InfoLine label="RFC" value={data.cliente.rfc} />
            <InfoLine label="Contacto" value={data.cliente.contacto} />
            <InfoLine label="Proyecto" value={data.proyecto} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {data.tipo === "SERVICIO" ? "Servicios cotizados" : "Materiales cotizados"}
        </Text>
        {data.tipo === "SERVICIO" ? <LineasServicioTable data={data} /> : <LineasMaterialTable data={data} />}

        <View style={styles.fiscalBlock}>
          <View style={styles.fiscalRow}>
            <Text style={styles.fiscalLabel}>Subtotal:</Text>
            <Text style={styles.fiscalValue}>{formatCurrency(data.subtotal)}</Text>
          </View>
          <View style={styles.fiscalRow}>
            <Text style={styles.fiscalLabel}>IVA (16%):</Text>
            <Text style={styles.fiscalValue}>{formatCurrency(data.iva)}</Text>
          </View>
          {data.retencionIsr > 0 && (
            <View style={styles.fiscalRow}>
              <Text style={styles.fiscalLabel}>Retención ISR (1.25%):</Text>
              <Text style={styles.fiscalValue}>- {formatCurrency(data.retencionIsr)}</Text>
            </View>
          )}
          <View style={styles.fiscalRow}>
            <Text style={styles.totalLabel}>Total a pagar:</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.totalAPagar)}</Text>
          </View>
          <View style={styles.fiscalRow}>
            <Text style={styles.netoLabel}>Neto a recibir:</Text>
            <Text style={styles.netoValue}>{formatCurrency(data.netoARecibir)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Fecha de emisión: {formatDate(data.fechaEmision)}  ·  Vigente hasta: {formatDate(data.fechaVigencia)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generarCotizacionPdf(data: CotizacionExportData): Promise<Buffer> {
  return renderToBuffer(<CotizacionPdfDocument data={data} />);
}
