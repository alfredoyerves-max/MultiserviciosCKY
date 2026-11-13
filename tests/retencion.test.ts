// Prueba de la casilla de retención: la lógica de valor efectivo y que el cálculo (motor sin tocar) la respete.
// Correr con: npm run test:retencion
import { retencionEfectiva, retencionInicial, tipoParaCalculoFiscal } from "../src/lib/retencion";
import { calcularTotalesFiscales } from "../src/lib/fiscalEngine";
import { leyendaRetencion } from "../src/lib/export/cotizacionData";

let fallos = 0;
function ok(n: string, c: boolean) { if (!c) fallos++; console.log(`${c ? "OK   " : "FALLA"} ${n}`); }
const IVA = 0.16, RET = 0.0125;
const calc = (sub: number, aplica: boolean) => calcularTotalesFiscales(sub, tipoParaCalculoFiscal(aplica), IVA, RET);

ok("valor inicial: moral marcada", retencionInicial("PERSONA_MORAL") === true);
ok("valor inicial: física, gobierno y sin cliente desmarcadas", !retencionInicial("PERSONA_FISICA") && !retencionInicial("GOBIERNO") && !retencionInicial(null));
ok("efectivo: null deriva del cliente (moral sí, física no)", retencionEfectiva(null, "PERSONA_MORAL") === true && retencionEfectiva(null, "PERSONA_FISICA") === false && retencionEfectiva(undefined, "GOBIERNO") === false);
ok("efectivo: lo decidido manda sobre el tipo", retencionEfectiva(false, "PERSONA_MORAL") === false && retencionEfectiva(true, "PERSONA_FISICA") === true);

const con = calc(650, true), sin = calc(650, false);
ok("650 con retención: IVA 104.00, retención 8.13, neto 745.87", con.iva === 104 && con.retencionIsr === 8.13 && con.netoARecibir === 745.87);
ok("650 sin retención: neto = total a pagar = 754.00", sin.retencionIsr === 0 && sin.netoARecibir === 754 && sin.totalAPagar === 754);
ok("150 con retención: 172.12", calc(150, true).netoARecibir === 172.12);
ok("con casilla = lo que daba el motor para Persona Moral (sin cambios en cotizaciones nuevas de moral)", JSON.stringify(con) === JSON.stringify(calcularTotalesFiscales(650, "PERSONA_MORAL", IVA, RET)));
ok("sin casilla = lo que daba el motor para Persona Física", JSON.stringify(sin) === JSON.stringify(calcularTotalesFiscales(650, "PERSONA_FISICA", IVA, RET)));

ok("leyenda para Persona Moral conserva «al ser usted Persona Moral»", leyendaRetencion(1.25, "PERSONA_MORAL").includes("al ser usted Persona Moral"));
ok("leyenda para otro tipo no afirma que sea Persona Moral", !leyendaRetencion(1.25, "PERSONA_FISICA").includes("Persona Moral") && leyendaRetencion(1.25, "PERSONA_FISICA").includes("Artículo 113-J"));
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLA(S)`);
process.exit(fallos === 0 ? 0 : 1);
