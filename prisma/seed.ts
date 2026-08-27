// Siembra SystemConfig con los valores 2026 de la Fase 1 del spec, más el
// salario mínimo vigente y la tabla CEAV 2026 del Addendum v4.
// margenUtilidadDefaultPct queda como placeholder explícito: el usuario
// debe ajustarlo en /configuracion.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      umaDiaria: 117.31,
      umaMensual: 3566.22,
      topeSbcUmas: 25,

      // Salario mínimo general 2026, zona general (Campeche) — Resolución
      // CONASAMI, DOF, vigente desde el 1 de enero de 2026.
      salarioMinimoDiario: 315.04,
      salarioMinimoMensual: 9582.47,

      primaRiesgoPct: 0.025,

      // Las 7 cuotas IMSS + INFONAVIT son tasas fijas de ley — viven como
      // constantes en src/lib/imssConstants.ts, no aquí.
      // Cesantía y Vejez: ver seedCeavBandas() más abajo.

      isnPct: 0.03,
      impuestoAdicionalPct: 0.33,

      diasAguinaldo: 15,
      diasVacaciones: 12,
      primaVacacionalPct: 0.25,

      ivaPct: 0.16,
      retencionIsrPct: 0.0125,

      horasPorDia: 8,
      diasPorSemana: 6,

      // Placeholder — ajustar en /configuracion.
      margenUtilidadDefaultPct: 0.3,
    },
    update: {},
  });

  console.log("SystemConfig sembrado (id=1).");

  await seedCeavBandas();
}

// Tabla CEAV 2026 (Addendum v4, punto 1). unidadLimite/limiteSuperior:
// bandas 1-2 comparan contra salario mínimo mensual, bandas 3-8 contra
// UMA mensual — ver comentario en el modelo Prisma CeavBanda.
const CEAV_2026 = [
  { orden: 1, etiqueta: "1.00 Salario Mínimo", unidadLimite: "SALARIO_MINIMO", limiteSuperior: 1.0, porcentajePatronal: 0.0315 },
  { orden: 2, etiqueta: "1.01 SM a 1.50 UMA", unidadLimite: "SALARIO_MINIMO", limiteSuperior: 1.5, porcentajePatronal: 0.03676 },
  { orden: 3, etiqueta: "1.51 a 2.00 UMA", unidadLimite: "UMA", limiteSuperior: 2.0, porcentajePatronal: 0.04851 },
  { orden: 4, etiqueta: "2.01 a 2.50 UMA", unidadLimite: "UMA", limiteSuperior: 2.5, porcentajePatronal: 0.05556 },
  { orden: 5, etiqueta: "2.51 a 3.00 UMA", unidadLimite: "UMA", limiteSuperior: 3.0, porcentajePatronal: 0.06026 },
  { orden: 6, etiqueta: "3.01 a 3.50 UMA", unidadLimite: "UMA", limiteSuperior: 3.5, porcentajePatronal: 0.06361 },
  { orden: 7, etiqueta: "3.51 a 4.00 UMA", unidadLimite: "UMA", limiteSuperior: 4.0, porcentajePatronal: 0.06613 },
  { orden: 8, etiqueta: "4.01 UMA en adelante", unidadLimite: "UMA", limiteSuperior: null, porcentajePatronal: 0.07513 },
] as const;

async function seedCeavBandas() {
  const anio = 2026;
  for (const banda of CEAV_2026) {
    await prisma.ceavBanda.upsert({
      where: { anio_orden: { anio, orden: banda.orden } },
      create: { anio, ...banda },
      update: {},
    });
  }
  console.log(`Tabla CEAV ${anio} sembrada (${CEAV_2026.length} bandas).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
