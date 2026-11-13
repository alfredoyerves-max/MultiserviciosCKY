// Prueba de la regla de fecha de abonos. Correr con: npm run test:abonofecha
import { errorFechaAbono } from "../src/lib/abonoFecha";
let fallos = 0;
function ok(n: string, c: boolean) { if (!c) fallos++; console.log(`${c ? "OK   " : "FALLA"} ${n}`); }
const hoy = "2026-11-12", cot = "2026-11-01";
ok("hoy es válida", errorFechaAbono("2026-11-12", cot, hoy) === null);
ok("el día de la cotización es válido", errorFechaAbono("2026-11-01", cot, hoy) === null);
ok("mañana se rechaza", /posterior a hoy \(12\/11\/2026\)/.test(errorFechaAbono("2026-11-13", cot, hoy) ?? ""));
ok("un día antes de la cotización se rechaza", /anterior a la fecha de la cotización \(01\/11\/2026\)/.test(errorFechaAbono("2026-10-31", cot, hoy) ?? ""));
ok("sin cotización (por pagar) solo exige no ser futura", errorFechaAbono("2020-01-01", undefined, hoy) === null && errorFechaAbono("2026-11-13", undefined, hoy) !== null);
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLA(S)`);
process.exit(fallos === 0 ? 0 : 1);
