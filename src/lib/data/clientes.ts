import { prisma } from "@/lib/prisma";
import type { ClienteInput } from "@/lib/schemas/cliente";

export function listClientes() {
  return prisma.cliente.findMany({ orderBy: { nombreRazonSocial: "asc" } });
}

/**
 * Crea un cliente nuevo — rechaza si su RFC ya está registrado
 * (comparación case-insensitive, ignorando espacios). El RFC es el
 * identificador confiable de una entidad en México — el nombre NO se usa
 * para detectar duplicados porque razones sociales legítimamente
 * distintas pueden compartir nombre (franquicias, sucursales, etc.), y un
 * cliente sin RFC capturado tampoco se puede deduplicar con certeza (se
 * crea sin más). No se reutiliza el registro existente en silencio: eso
 * podría sustituir el tipoCliente recién capturado (afecta la retención
 * ISR) por el del registro viejo sin que el usuario lo note — mejor
 * obligarlo a elegir "Cliente existente" a propósito.
 */
export async function createCliente(input: ClienteInput) {
  const rfc = input.rfc?.trim();
  if (rfc) {
    const existente = await prisma.cliente.findFirst({
      where: { rfc: { equals: rfc, mode: "insensitive" } },
    });
    if (existente) {
      throw new Error(
        `Ya existe un cliente con el RFC "${rfc}" (${existente.nombreRazonSocial}). Selecciona "Cliente existente" en vez de capturarlo de nuevo.`
      );
    }
  }
  return prisma.cliente.create({ data: input });
}
