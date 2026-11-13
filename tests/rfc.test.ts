// Prueba del RFC (formato, fecha, tipo deducido) y del esquema de cliente nuevo. Correr con: npm run test:rfc
import { analizarRfc, tipoClienteEfectivo } from "../src/lib/rfc";
import { clienteSchema } from "../src/lib/schemas/cliente";

let fallos = 0;
function ok(n: string, c: boolean) { if (!c) fallos++; console.log(`${c ? "OK   " : "FALLA"} ${n}`); }
const est = (r: string) => analizarRfc(r).estado;
const tipo = (r: string) => { const a = analizarRfc(r); return a.estado === "valido" ? a.tipo : null; };

ok("moral válido (12) → Persona Moral", tipo("ABC850101AB1") === "PERSONA_MORAL");
ok("física válido (13) → Persona Física", tipo("ABCD850101AB1") === "PERSONA_FISICA");
ok("con Ñ y & válido", est("Ñ&C850101AB1") === "valido");
ok("minúsculas se normalizan", tipo("abc850101ab1") === "PERSONA_MORAL");
ok("vacío = sin RFC", est("") === "vacio" && est("   ") === "vacio");
ok("muy corto inválido", est("ABC8501") === "invalido");
ok("letras en la fecha inválido", est("ABC85A101AB1") === "invalido");
ok("mes 13 inválido", est("ABC851301AB1") === "invalido");
ok("mes 00 inválido", est("ABC850001AB1") === "invalido");
ok("día 00 inválido", est("ABC850100AB1") === "invalido");
ok("día 32 inválido", est("ABC850132AB1") === "invalido");
ok("14 caracteres inválido", est("ABCD850101AB1X") === "invalido");
ok("tipo efectivo: RFC válido manda sobre el manual", tipoClienteEfectivo("ABCD850101AB1", "PERSONA_MORAL") === "PERSONA_FISICA");
ok("tipo efectivo: sin RFC usa el manual", tipoClienteEfectivo("", "GOBIERNO") === "GOBIERNO" && tipoClienteEfectivo("", "") === "");

const base = { nombreRazonSocial: "PRUEBA SA", contacto: "" };
ok("esquema: sin RFC y sin tipo rechaza", !clienteSchema.safeParse({ ...base, rfc: "", tipoCliente: "" }).success);
ok("esquema: sin RFC con tipo acepta", clienteSchema.safeParse({ ...base, rfc: "", tipoCliente: "PERSONA_FISICA" }).success);
ok("esquema: RFC inválido rechaza", !clienteSchema.safeParse({ ...base, rfc: "ABC851301AB1", tipoCliente: "PERSONA_MORAL" }).success);
ok("esquema: RFC moral con tipo física rechaza", !clienteSchema.safeParse({ ...base, rfc: "ABC850101AB1", tipoCliente: "PERSONA_FISICA" }).success);
ok("esquema: RFC moral con tipo moral acepta y normaliza", (() => { const r = clienteSchema.safeParse({ ...base, rfc: "abc850101ab1", tipoCliente: "PERSONA_MORAL" }); return r.success && r.data.rfc === "ABC850101AB1"; })());
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLA(S)`);
process.exit(fallos === 0 ? 0 : 1);
