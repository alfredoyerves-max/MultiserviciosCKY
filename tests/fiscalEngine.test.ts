// Pruebas del motor fiscal. Correr con: npm run test:fiscal (no necesita base de datos ni sesión).
import { calcularTotalesFiscales, redondearCentavos } from "../src/lib/fiscalEngine";
let f = 0;
function igual(nombre: string, obtenido: unknown, esperado: unknown) {
  const ok = Object.is(obtenido, esperado) || obtenido === esperado;
  if (!ok) f++;
  console.log(`${ok ? "OK   " : "FALLA"} ${nombre}: ${obtenido}${ok ? "" : ` (esperado ${esperado})`}`);
}
const IVA = 0.16, RET = 0.0125;

// Caso pedido por Luis (COT-0028): 650.00 -> IVA 104.00, retención 8.13, total 745.87
const a = calcularTotalesFiscales(650, "PERSONA_MORAL", IVA, RET);
igual("650 subtotal", a.subtotal, 650); igual("650 IVA", a.iva, 104); igual("650 retención", a.retencionIsr, 8.13);
igual("650 totalAPagar", a.totalAPagar, 754); igual("650 total (neto)", a.netoARecibir, 745.87);

// Casos del audit verificados a mano
const b = calcularTotalesFiscales(500, "PERSONA_MORAL", IVA, RET); // 500 + 80 - 6.25 = 573.75
igual("500 retención", b.retencionIsr, 6.25); igual("500 total", b.netoARecibir, 573.75);
const c = calcularTotalesFiscales(14016.32, "PERSONA_MORAL", IVA, RET); // COT-0024: 2,242.61 y 175.20 -> 16,083.73
igual("COT-0024 IVA", c.iva, 2242.61); igual("COT-0024 retención", c.retencionIsr, 175.2); igual("COT-0024 total", c.netoARecibir, 16083.73);
const d = calcularTotalesFiscales(16885.84, "PERSONA_MORAL", IVA, RET); // Limpieza/Mes: 2,701.73 y 211.07 -> 19,376.50
igual("Limpieza IVA", d.iva, 2701.73); igual("Limpieza retención", d.retencionIsr, 211.07); igual("Limpieza total", d.netoARecibir, 19376.5);

// Persona Física / Gobierno: sin retención
const e = calcularTotalesFiscales(69.43, "PERSONA_FISICA", IVA, RET);
igual("PF retención", e.retencionIsr, 0); igual("PF total", e.netoARecibir, 80.54);
igual("Gobierno retención (sin cambio de regla)", calcularTotalesFiscales(1000, "GOBIERNO", IVA, RET).retencionIsr, 0);

// Subtotal con muchos decimales: se redondea a centavos y las partes SUMAN el total
for (const sub of [14230.3431952804, 16040.3699782365, 69.4319197280401, 38053.3800128438, 0.005, 0.004, 1.005, 123456.785]) {
  const t = calcularTotalesFiscales(sub, "PERSONA_MORAL", IVA, RET);
  const suma = Math.round(t.subtotal * 100) + Math.round(t.iva * 100) - Math.round(t.retencionIsr * 100);
  igual(`partes suman total (sub ${sub})`, suma, Math.round(t.netoARecibir * 100));
  igual(`   2 decimales (sub ${sub})`, [t.subtotal, t.iva, t.retencionIsr, t.netoARecibir].every((x) => Math.round(x * 100) === x * 100 || Math.abs(Math.round(x * 100) - x * 100) < 1e-6), true);
}

// Mitad hacia arriba
igual("8.125 -> 8.13", redondearCentavos(8.125), 8.13); igual("1.005 -> 1.01", redondearCentavos(1.005), 1.01);
igual("0.004 -> 0", redondearCentavos(0.004), 0); igual("2.675 -> 2.68", redondearCentavos(2.675), 2.68); igual("0 -> 0", redondearCentavos(0), 0);

console.log(f === 0 ? "\nTODO OK" : `\n${f} FALLOS`); process.exit(f ? 1 : 0);
