// Prueba de la validación de la Clave SAT (8 dígitos; vacía = como antes). Correr con: npm run test:clavesat
import { lineaMaterialInputSchema } from "../src/lib/schemas/cotizacion";
import { claveSatValida, MENSAJE_CLAVE_SAT } from "../src/lib/claveSat";

let fallos = 0;
function ok(nombre: string, cond: boolean) {
  if (!cond) fallos++;
  console.log(`${cond ? "OK   " : "FALLA"} ${nombre}`);
}
const base = { descripcion: "x", unidadMedida: "PIEZA", cantidad: 1, precioUnitario: 1 };
const probar = (clave: string | undefined) => lineaMaterialInputSchema.safeParse({ ...base, ...(clave === undefined ? {} : { claveSat: clave }) });

ok('"45y5e6u" rechaza', !probar("45y5e6u").success && !claveSatValida("45y5e6u"));
ok('"4713180" (7 dígitos) rechaza', !probar("4713180").success);
ok('"471318055" (9 dígitos) rechaza', !probar("471318055").success);
ok('"47131805" acepta', probar("47131805").success);
ok('" 47131805 " (con espacios) acepta, recortada', (() => { const r = probar(" 47131805 "); return r.success && r.data.claveSat === "47131805"; })());
ok('vacía "" acepta como hoy', (() => { const r = probar(""); return r.success && r.data.claveSat === ""; })());
ok("sin el campo acepta como hoy (queda vacía)", (() => { const r = probar(undefined); return r.success && r.data.claveSat === ""; })());
ok("el mensaje es el pedido", (() => { const r = probar("abc"); return !r.success && r.error.issues[0].message === MENSAJE_CLAVE_SAT; })());
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLA(S)`);
process.exit(fallos === 0 ? 0 : 1);
