"use client"; // Los límites de error deben ser componentes de cliente

import { ErrorPanel } from "@/components/ui/error-panel";

// Cubre todas las pantallas del menú: el menú y la sesión siguen visibles y solo
// el contenido se reemplaza por el aviso con "Reintentar".
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel error={error} retry={retry} />;
}
