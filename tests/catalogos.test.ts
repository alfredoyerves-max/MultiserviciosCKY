// Prueba de los catálogos editables: búsqueda de claves SAT, validaciones y la regla de categorías en uso
// (esta última lee la base, sin escribir). Correr con: npm run test:catalogos
import "dotenv/config";
import { buscarClavesSat } from "../src/lib/claveSatBusqueda";
import { categoriaSchema, unidadSchema, claveSatCatalogoSchema } from "../src/lib/schemas/catalogos";
import { etiquetaCategoriaServicio } from "../src/lib/enums";
import { prisma } from "../src/lib/prisma";

let fallos = 0;
function ok(n: string, c: boolean, detalle = "") {
  if (!c) fallos++;
  console.log(`${c ? "OK   " : "FALLA"} ${n}${detalle ? " — " + detalle : ""}`);
}

const claves = [
  { clave: "47121701", descripcion: "Bolsas de basura", palabrasSimilares: null },
  { clave: "47131503", descripcion: "Gamuzas o cueros para lavar", palabrasSimilares: "microfibra" },
  { clave: "47131805", descripcion: "Limpiadores de propósito general", palabrasSimilares: "cloro multiusos" },
  { clave: "47121807", descripcion: "Émbolo del lavaplatos o inodoro", palabrasSimilares: null },
];

ok("buscar por clave exacta", buscarClavesSat(claves, "47131805")[0]?.clave === "47131805");
ok("buscar por inicio de clave", buscarClavesSat(claves, "471318").length === 1);
ok("buscar por descripción", buscarClavesSat(claves, "bolsas")[0]?.clave === "47121701");
ok("buscar sin acentos (embolo → Émbolo)", buscarClavesSat(claves, "embolo")[0]?.clave === "47121807");
ok("buscar por palabras similares", buscarClavesSat(claves, "cloro")[0]?.clave === "47131805");
ok("buscar varias palabras", buscarClavesSat(claves, "cueros lavar")[0]?.clave === "47131503");
ok("sin coincidencias", buscarClavesSat(claves, "zzz").length === 0);
ok("texto vacío no sugiere nada", buscarClavesSat(claves, "  ").length === 0);

ok("categoría vacía rechaza", !categoriaSchema.safeParse({ nombre: "  " }).success);
ok("categoría válida acepta", categoriaSchema.safeParse({ nombre: "Velador" }).success);
ok("unidad con clave de 3 caracteres acepta (y pasa a mayúsculas)", (() => { const r = unidadSchema.safeParse({ nombre: "Rollo", claveSat: "xro" }); return r.success && r.data.claveSat === "XRO"; })());
ok("unidad con clave de 2 caracteres rechaza", !unidadSchema.safeParse({ nombre: "Lote", claveSat: "LO" }).success);
ok("unidad sin clave acepta", unidadSchema.safeParse({ nombre: "Lote" }).success);
ok("clave SAT de 7 dígitos rechaza", !claveSatCatalogoSchema.safeParse({ clave: "4713180", descripcion: "x" }).success);
ok("clave SAT sin descripción rechaza", !claveSatCatalogoSchema.safeParse({ clave: "47131805", descripcion: " " }).success);
ok("clave SAT válida acepta", claveSatCatalogoSchema.safeParse({ clave: "47131805", descripcion: "Limpiadores" }).success);

ok("código histórico → etiqueta", etiquetaCategoriaServicio("LIMPIEZA") === "Limpieza");
ok("nombre propio se queda igual", etiquetaCategoriaServicio("Velador") === "Velador");

async function main() {
  // Regla de eliminación de categorías: se bloquea si algún servicio la usa (por nombre o código histórico).
  const [servicios, categorias] = await Promise.all([
    prisma.servicio.findMany({ select: { categoria: true } }),
    prisma.categoria.findMany({ where: { ambito: "SERVICIO" } }),
  ]);
  const enUso = categorias.filter((c) => servicios.some((s) => etiquetaCategoriaServicio(s.categoria).toLowerCase() === c.nombre.toLowerCase()));
  const libres = categorias.filter((c) => !enUso.includes(c));
  ok("las categorías que usan servicios se detectan en uso", servicios.every((s) => enUso.some((c) => c.nombre.toLowerCase() === etiquetaCategoriaServicio(s.categoria).toLowerCase())), `en uso: ${enUso.map((c) => c.nombre).join(", ")}`);
  ok("las pedidas «Servicios de Limpieza» y «Velador» no están en uso (se pueden eliminar)", ["Servicios de Limpieza", "Velador"].every((n) => libres.some((c) => c.nombre === n)));
  await prisma.$disconnect();
  console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLA(S)`);
  process.exit(fallos === 0 ? 0 : 1);
}
main();
