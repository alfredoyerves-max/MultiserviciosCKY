// Semillas de los catálogos editables (Configuración › Catálogos). Idempotente: no duplica ni pisa nada
// (los nombres se comparan sin distinguir mayúsculas). Correr con: npm run db:seed:catalogos
//
// Las claves SAT y de unidad de abajo se validaron el 2026-11-13 contra el catálogo oficial del SAT
// (catCFDI.xls, hojas c_ClaveProdServ y c_ClaveUnidad, http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/catCFDI.xls):
// todas existen y su descripción es la oficial. Por eso nacen con verificada = true.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { SERVICIO_CATEGORIA_LABELS, UNIDAD_MEDIDA_LABELS } from "../src/lib/enums";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

/** Categorías de Servicio pedidas; además se crean las que hoy usan los servicios existentes. */
const CATEGORIAS_SERVICIO = ["Servicios de Limpieza", "Velador"];

/** [nombre, clave SAT de unidad (c_ClaveUnidad) o null]. "Lote" queda sin clave: el SAT tiene dos ("LO" y "XLT"). */
const UNIDADES: [string, string | null][] = [
  ["Pieza", "H87"],
  ["Caja", "XBX"],
  ["Unidad de servicio", "E48"],
  ["Uno", "C62"],
  ["Lote", null],
];
/** Claves de unidad oficiales de las que ya se usan en productos/cotizaciones (nombre idéntico al del SAT). */
const CLAVE_UNIDAD_VALIDADA: Record<string, string> = { Litro: "LTR", Kilogramo: "KGM", Paquete: "XPK" };

/** [clave, descripción oficial c_ClaveProdServ]. */
const CLAVES_SAT: [string, string][] = [
  ["47121701", "Bolsas de basura"],
  ["47121702", "Contenedores de desperdicios o revestimientos rígidos"],
  ["47121501", "Carritos de portero"],
  ["47121801", "Plumeros para limpiar el polvo"],
  ["47121803", "Esponjas o esponjillas"],
  ["47121804", "Baldes para limpieza"],
  ["47121806", "Escurridor de trapero"],
  ["47121807", "Émbolo del lavaplatos o inodoro"],
  ["47131501", "Trapos"],
  ["47131502", "Pañitos o toallas para limpiar"],
  ["47131503", "Gamuzas o cueros para lavar"],
  ["47131601", "Cepillos o recogedores para polvo"],
  ["47131602", "Almohadillas para restregar"],
  ["47131603", "Esponjas"],
  ["47131604", "Escobas"],
  ["47131605", "Cepillos de limpieza"],
  ["47131608", "Cepillos de baño"],
  ["47131609", "Manijas de escobas o traperos"],
  ["47131611", "Recogedor de basura"],
  ["47131617", "Traperos para polvo"],
  ["47131618", "Traperos húmedos"],
  ["47131619", "Cabezas de traperos"],
  ["47131800", "Soluciones de limpieza y desinfección"],
  ["47131801", "Limpiadores de pisos"],
  ["47131802", "Terminados o ceras para pisos"],
  ["47131803", "Desinfectantes para uso doméstico"],
  ["47131805", "Limpiadores de propósito general"],
  ["47131806", "Pulidores o ceras para muebles"],
  ["47131807", "Blanqueadores"],
  ["47131810", "Productos para el lavaplatos"],
  ["47131811", "Productos de lavandería"],
  ["47131812", "Refrescador de aire"],
  ["47131815", "Limpiador de drenajes"],
  ["47131816", "Desodorantes"],
  ["47131819", "Limpiadores cáusticos"],
  ["47131821", "Compuestos desengrasantes"],
  ["47131824", "Limpiadores de vidrio o ventanas"],
  ["53131608", "Jabones"],
  ["14111704", "Papel higiénico"],
  ["14111703", "Toallas de papel"],
  ["46181504", "Guantes de protección"],
  ["46181541", "Guantes resistentes a los químicos"],
  ["76111500", "Servicios de limpieza y mantenimiento de edificios generales y de oficinas"],
  ["76111501", "Servicios de limpieza de edificios"],
  ["70111703", "Servicios de plantación o mantenimiento de jardines"],
];

async function main() {
  const informe = { categoriasCreadas: [] as string[], unidadesCreadas: [] as string[], clavesCreadas: 0 };

  // Categorías de servicio: las pedidas + las que usan los servicios existentes (código histórico → etiqueta).
  const usadas = await prisma.servicio.findMany({ select: { categoria: true }, distinct: ["categoria"] });
  const nombresCategoria = [
    ...CATEGORIAS_SERVICIO,
    ...usadas.map((s) => (SERVICIO_CATEGORIA_LABELS as Record<string, string>)[s.categoria] ?? s.categoria),
  ];
  const existentesCat = await prisma.categoria.findMany({ where: { ambito: "SERVICIO" } });
  const vistasCat = new Set(existentesCat.map((c) => c.nombre.toLowerCase()));
  for (const nombre of nombresCategoria) {
    if (vistasCat.has(nombre.toLowerCase())) continue;
    await prisma.categoria.create({ data: { nombre, ambito: "SERVICIO" } });
    vistasCat.add(nombre.toLowerCase());
    informe.categoriasCreadas.push(nombre);
  }

  // Unidades: las pedidas + las que ya usan productos y líneas de cotización (para no perder opciones).
  const [dePro, deLin] = await Promise.all([
    prisma.producto.findMany({ select: { unidadMedida: true }, distinct: ["unidadMedida"] }),
    prisma.lineaCotizacionMaterial.findMany({ select: { unidadMedida: true }, distinct: ["unidadMedida"] }),
  ]);
  const enUso = [...dePro, ...deLin]
    .map((u) => (UNIDAD_MEDIDA_LABELS as Record<string, string>)[u.unidadMedida] ?? u.unidadMedida)
    .map((n): [string, string | null] => [n, CLAVE_UNIDAD_VALIDADA[n] ?? null]);
  const existentesUni = await prisma.unidadMedida.findMany();
  const vistasUni = new Set(existentesUni.map((u) => u.nombre.toLowerCase()));
  for (const [nombre, claveSat] of [...UNIDADES, ...enUso]) {
    if (vistasUni.has(nombre.toLowerCase())) continue;
    await prisma.unidadMedida.create({ data: { nombre, claveSat } });
    vistasUni.add(nombre.toLowerCase());
    informe.unidadesCreadas.push(claveSat ? `${nombre} (${claveSat})` : nombre);
  }

  // Claves SAT oficiales.
  const existentesClaves = new Set((await prisma.claveSat.findMany({ select: { clave: true } })).map((c) => c.clave));
  for (const [clave, descripcion] of CLAVES_SAT) {
    if (existentesClaves.has(clave)) continue;
    await prisma.claveSat.create({ data: { clave, descripcion, verificada: true } });
    informe.clavesCreadas++;
  }

  console.log("Categorías creadas:", informe.categoriasCreadas.join(", ") || "(ninguna)");
  console.log("Unidades creadas:", informe.unidadesCreadas.join(", ") || "(ninguna)");
  console.log("Claves SAT creadas:", informe.clavesCreadas);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
