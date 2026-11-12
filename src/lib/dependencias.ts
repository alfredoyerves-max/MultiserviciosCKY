/**
 * Resultado de un borrado protegido por la regla "se desmonta de la hoja a la raíz":
 * solo se elimina lo que no tiene hijos. Si los tiene, `error` dice por qué y
 * `hijos` los nombra (incluidos los inactivos, que también bloquean).
 */
export interface ResultadoBorrado {
  ok: boolean;
  error?: string;
  hijos?: string[];
}

/** Nombres para el aviso: marca los inactivos y recorta la lista ("… y 2 más"). */
export function nombrarHijos(items: { nombre: string; inactivo?: boolean }[], max = 6): string[] {
  const nombres = items.map((i) => (i.inactivo ? `${i.nombre} (inactivo)` : i.nombre));
  if (nombres.length <= max) return nombres;
  return [...nombres.slice(0, max), `… y ${nombres.length - max} más`];
}
