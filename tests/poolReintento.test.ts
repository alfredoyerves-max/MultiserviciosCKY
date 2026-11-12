// Prueba del reintento único al adquirir conexión (lib/db/pool.ts). Usa la base real SOLO con lecturas y con
// escrituras dentro de transacciones que terminan en ROLLBACK forzado: no deja datos. Correr con: npm run test:pool
import dotenv from "dotenv";
dotenv.config({ quiet: true });
import { Pool, Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PoolConReintento } from "../src/lib/db/pool";

const ERR = "Connection terminated due to connection timeout";
let fallos = 0;
function ok(nombre: string, cond: boolean, detalle = "") {
  if (!cond) fallos++;
  console.log(`${cond ? "OK   " : "FALLA"} ${nombre}${detalle ? " — " + detalle : ""}`);
}

// Simula que las primeras N adquisiciones de conexión fallan (promesa y callback) y cuenta cuántas hubo.
const originalConnect = Pool.prototype.connect;
let porFallar = 0;
let adquisiciones = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Pool.prototype as any).connect = function (this: Pool, ...args: any[]) {
  adquisiciones++;
  if (porFallar > 0) {
    porFallar--;
    const e = new Error(ERR);
    if (typeof args[0] === "function") {
      process.nextTick(() => args[0](e, undefined, () => {}));
      return;
    }
    return Promise.reject(e);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (originalConnect as any).apply(this, args);
};

const pool = new PoolConReintento({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 30_000, keepAlive: true });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
// Sentencias que realmente llegan al servidor (incluye BEGIN / ROLLBACK que ejecuta el adaptador).
const sentencias: string[] = [];
const originalQuery = Client.prototype.query;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Client.prototype as any).query = function (this: Client, ...args: any[]) {
  const texto = typeof args[0] === "string" ? args[0] : (args[0]?.text ?? "");
  sentencias.push(String(texto));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (originalQuery as any).apply(this, args);
};
const ROLLBACK = new Error("rollback forzado");

async function main() {
  await prisma.usuario.count(); // calentamiento
  const puestosAntes = await prisma.puesto.count();

  // T1 consulta suelta (pool.query -> connect(callback)): falla 1 vez -> reintenta y funciona
  porFallar = 1; adquisiciones = 0;
  let r1 = "ok";
  try { await prisma.usuario.count(); } catch (e) { r1 = (e as Error).message; }
  ok("T1 consulta suelta: 1 fallo de adquisición se reintenta", r1 === "ok" && adquisiciones === 2, `adquisiciones=${adquisiciones}`);

  // T2 falla 2 veces: solo UN reintento -> el error se propaga
  porFallar = 2; adquisiciones = 0;
  let r2 = "ok";
  try { await prisma.usuario.count(); } catch { r2 = "error"; }
  ok("T2 dos fallos seguidos: un solo reintento, luego error", r2 === "error" && adquisiciones === 2, `adquisiciones=${adquisiciones}`);
  porFallar = 0;

  // T3 transacción interactiva con un fallo de adquisición: se reintenta y la transacción funciona completa
  porFallar = 1; adquisiciones = 0; sentencias.length = 0;
  let dentro = -1;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.puesto.create({ data: { nombre: "PRUEBA-REINTENTO", sueldoMensual: 1 } });
      dentro = await tx.puesto.count({ where: { nombre: "PRUEBA-REINTENTO" } }); // misma conexión: ve su propio insert
      throw ROLLBACK;
    });
  } catch (e) { if (e !== ROLLBACK) throw e; }
  const begins = sentencias.filter((s) => s.trim().toUpperCase() === "BEGIN").length;
  const rollbacks = sentencias.filter((s) => s.trim().toUpperCase() === "ROLLBACK").length;
  ok("T3 $transaction tras 1 fallo de adquisición", dentro === 1 && begins === 1 && rollbacks === 1, `dentro=${dentro} BEGIN=${begins} ROLLBACK=${rollbacks} adquisiciones=${adquisiciones}`);
  ok("T3 el ROLLBACK no dejó datos", (await prisma.puesto.count()) === puestosAntes);

  // T4 error DENTRO de la transacción: se propaga, NO se reintenta (un solo BEGIN, una sola adquisición) y revierte
  porFallar = 0; adquisiciones = 0; sentencias.length = 0;
  let r4 = "sin error";
  try {
    await prisma.$transaction(async (tx) => {
      await tx.puesto.create({ data: { nombre: "PRUEBA-REINTENTO-2", sueldoMensual: 1 } });
      await tx.$queryRawUnsafe("SELECT * FROM tabla_que_no_existe"); // falla a mitad de la transacción
    });
  } catch { r4 = "error propagado"; }
  const begins4 = sentencias.filter((s) => s.trim().toUpperCase() === "BEGIN").length;
  ok("T4 error dentro de la transacción: no se reintenta", r4 === "error propagado" && begins4 === 1 && adquisiciones === 1, `BEGIN=${begins4} adquisiciones=${adquisiciones}`);
  ok("T4 no quedó el insert a medias", (await prisma.puesto.count()) === puestosAntes);

  // T5 transacciones concurrentes, una de ellas con fallo de adquisición
  porFallar = 1;
  const trabajo = async (n: number) => {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.puesto.create({ data: { nombre: `PRUEBA-CONC-${n}`, sueldoMensual: 1 } });
        throw ROLLBACK;
      }, { maxWait: 15_000 }); // el límite por defecto de Prisma (2 s) depende de la red, no del reintento
    } catch (e) { if (e !== ROLLBACK) throw e; }
  };
  await Promise.all([trabajo(1), trabajo(2), trabajo(3)]);
  ok("T5 3 transacciones concurrentes (1 con fallo de adquisición)", (await prisma.puesto.count()) === puestosAntes);

  console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
