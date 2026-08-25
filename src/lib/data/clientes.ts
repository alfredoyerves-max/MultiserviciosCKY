import { prisma } from "@/lib/prisma";
import type { ClienteInput } from "@/lib/schemas/cliente";

export function listClientes() {
  return prisma.cliente.findMany({ orderBy: { nombreRazonSocial: "asc" } });
}

export function createCliente(input: ClienteInput) {
  return prisma.cliente.create({ data: input });
}
