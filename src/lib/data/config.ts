import { prisma } from "@/lib/prisma";
import type { SystemConfigInput, CeavBandaUpdate, DatosEmpresaInicialInput } from "@/lib/schemas/config";
import type { CeavBandaInput } from "@/lib/costEngine";
import type { SystemConfig } from "@/generated/prisma/client";

// Año vigente de la tabla CEAV. Cuando suba la tasa en enero (hasta el
// tope de 2030), se siembra un nuevo set de bandas con este año y se
// actualiza esta constante — las cotizaciones ya creadas no se ven
// afectadas porque guardan un snapshot del costo real, no la tasa viva.
export const CEAV_ANIO_ACTUAL = 2026;

export async function getSystemConfig() {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  if (!config) {
    throw new Error(
      "SystemConfig no está sembrado. Corre `npm run db:seed` para crear los valores 2026."
    );
  }
  return config;
}

export async function updateSystemConfig(input: SystemConfigInput) {
  return prisma.systemConfig.update({ where: { id: 1 }, data: input });
}

/** Paso 2 del asistente de arranque (/setup, Anexo G) — ver
 *  datosEmpresaInicialSchema en lib/schemas/config.ts. */
export async function updateDatosEmpresaInicial(input: DatosEmpresaInicialInput) {
  return prisma.systemConfig.update({ where: { id: 1 }, data: input });
}

export async function getCeavBandas(anio: number = CEAV_ANIO_ACTUAL): Promise<CeavBandaInput[]> {
  const rows = await prisma.ceavBanda.findMany({ where: { anio }, orderBy: { orden: "asc" } });
  return rows.map((r) => ({
    orden: r.orden,
    etiqueta: r.etiqueta,
    unidadLimite: r.unidadLimite === "SALARIO_MINIMO" ? "SALARIO_MINIMO" : "UMA",
    limiteSuperior: r.limiteSuperior,
    porcentajePatronal: r.porcentajePatronal,
  }));
}

/** SystemConfig + tabla CEAV vigente, listo para pasar a calcularCostoReal. */
export async function getSystemConfigConCeav(): Promise<SystemConfig & { bandasCeav: CeavBandaInput[] }> {
  const [config, bandasCeav] = await Promise.all([getSystemConfig(), getCeavBandas()]);
  return { ...config, bandasCeav };
}

export async function updateCeavBandas(bandas: CeavBandaUpdate[], anio: number = CEAV_ANIO_ACTUAL) {
  await prisma.$transaction(
    bandas.map((b) =>
      prisma.ceavBanda.update({
        where: { anio_orden: { anio, orden: b.orden } },
        data: { porcentajePatronal: b.porcentajePatronal },
      })
    )
  );
}
