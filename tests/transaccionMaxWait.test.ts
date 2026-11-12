// Prueba del maxWait de transacciones (lib/prisma.ts). Simula una conexión nueva LENTA (3 s) y comprueba que
//  - sin la configuración (límite por defecto de Prisma, 2 s) la transacción falla con P2028, y
//  - con el cliente de la app (maxWait 10 s) la misma transacción funciona.
// Solo hace una escritura dentro de una transacción con ROLLBACK forzado: no deja datos. Correr con: npm run test:maxwait
import "dotenv/config"; // primero: lib/prisma.ts lee DATABASE_URL al importarse
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { prisma as prismaApp, TRANSACTION_MAX_WAIT_MS } from "../src/lib/prisma";
import { crearPool } from "../src/lib/db/pool";

let fallos = 0;
function ok(nombre: string, cond: boolean, detalle = "") {
  if (!cond) fallos++;
  console.log(`${cond ? "OK   " : "FALLA"} ${nombre}${detalle ? " — " + detalle : ""}`);
}

const ROLLBACK = new Error("rollback forzado");
const originalConnect = Pool.prototype.connect;
let demoraMs = 0;
// Retrasa la adquisición de conexión (promesa, la que usa Prisma para abrir transacciones).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Pool.prototype as any).connect = function (this: Pool, ...args: any[]) {
  if (typeof args[0] !== "function" && demoraMs > 0) {
    const espera = demoraMs;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise((r) => setTimeout(r, espera)).then(() => (originalConnect as any).apply(this, args));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (originalConnect as any).apply(this, args);
};

async function transaccionDePrueba(cliente: PrismaClient): Promise<string> {
  try {
    await cliente.$transaction(async (tx) => {
      await tx.puesto.create({ data: { nombre: "PRUEBA-MAXWAIT", sueldoMensual: 1 } });
      throw ROLLBACK;
    });
    return "sin error";
  } catch (e) {
    if (e === ROLLBACK) return "ok";
    return (e as { code?: string }).code ?? (e as Error).message;
  }
}

async function main() {
  ok("la app configura maxWait de 10 s", TRANSACTION_MAX_WAIT_MS === 10_000);
  const puestosAntes = await prismaApp.puesto.count(); // abre conexión del cliente de la app

  // Control: cliente SIN la configuración (maxWait por defecto) + conexión lenta de 3 s -> debe fallar
  const control = new PrismaClient({ adapter: new PrismaPg(crearPool(process.env.DATABASE_URL)) });
  demoraMs = 3000;
  const rControl = await transaccionDePrueba(control);
  ok("control (maxWait por defecto, conexión lenta 3 s) falla con P2028", rControl === "P2028", `resultado=${rControl}`);
  await control.$disconnect();

  // Cliente de la app: la transacción necesita una conexión NUEVA (se fuerza con un pool propio idéntico en configuración)
  // Se prueba el cliente real de la app abriendo varias transacciones a la vez para exigir conexiones nuevas lentas.
  demoraMs = 3000;
  const resultados = await Promise.all([transaccionDePrueba(prismaApp), transaccionDePrueba(prismaApp)]);
  ok("cliente de la app (maxWait 10 s) completa la transacción con conexión lenta de 3 s", resultados.every((r) => r === "ok"), `resultados=${resultados.join(",")}`);
  demoraMs = 0;

  ok("ROLLBACK: no quedó ningún dato", (await prismaApp.puesto.count()) === puestosAntes);

  console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
  await prismaApp.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
