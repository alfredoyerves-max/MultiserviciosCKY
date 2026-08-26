import { prisma } from "@/lib/prisma";
import type { CuentaBancariaInput } from "@/lib/schemas/cuentaBancaria";

export function listCuentasBancarias() {
  return prisma.cuentaBancaria.findMany({ orderBy: { createdAt: "asc" } });
}

/** Usado por la exportación de cotizaciones — solo las cuentas activas. */
export function listCuentasBancariasActivas() {
  return prisma.cuentaBancaria.findMany({ where: { activa: true }, orderBy: { createdAt: "asc" } });
}

export function createCuentaBancaria(input: CuentaBancariaInput) {
  return prisma.cuentaBancaria.create({ data: input });
}

export function setCuentaBancariaActiva(id: string, activa: boolean) {
  return prisma.cuentaBancaria.update({ where: { id }, data: { activa } });
}

export function deleteCuentaBancaria(id: string) {
  return prisma.cuentaBancaria.delete({ where: { id } });
}
