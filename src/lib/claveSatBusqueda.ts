/** Lo mínimo que se necesita de una clave del catálogo para buscarla. */
export interface ClaveBuscable {
  clave: string;
  descripcion: string;
  palabrasSimilares?: string | null;
}

/** Minúsculas y sin acentos, para comparar "Émbolo" con "embolo". */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Busca en el catálogo por clave (empieza con o contiene lo escrito) o por descripción y palabras
 * similares (cada palabra escrita debe aparecer). Primero salen las que empiezan con la clave escrita.
 */
export function buscarClavesSat<T extends ClaveBuscable>(claves: T[], texto: string, max = 8): T[] {
  const q = normalizar(texto);
  if (q === "") return [];
  const palabras = q.split(/\s+/).filter(Boolean);
  const coincidencias = claves.filter((c) => {
    if (c.clave.includes(q)) return true;
    const pajar = normalizar(`${c.descripcion} ${c.palabrasSimilares ?? ""}`);
    return palabras.every((p) => pajar.includes(p));
  });
  coincidencias.sort((a, b) => {
    const aIni = a.clave.startsWith(q) ? 0 : 1;
    const bIni = b.clave.startsWith(q) ? 0 : 1;
    return aIni - bIni || a.clave.localeCompare(b.clave);
  });
  return coincidencias.slice(0, max);
}
