import type { NextConfig } from "next";

// Encabezados de seguridad estándar — aplican a todas las rutas. Sin
// Content-Security-Policy: layout.tsx tiene un <script> inline (fija el
// tema antes del primer paint) que una CSP estricta bloquearía sin un
// nonce/hash cuidadosamente calibrado; X-Frame-Options ya cubre el mismo
// riesgo que pediríamos resolver con frame-ancestors (que esta app nunca
// se embeba en un iframe ajeno), con mucho menos riesgo de romper algo.
const SECURITY_HEADERS = [
  // Fuerza HTTPS en el navegador durante 2 años, incluyendo subdominios —
  // Vercel ya sirve todo por HTTPS, esto evita que un enlace http:// viejo
  // haga siquiera el primer request en claro.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Evita que el navegador "adivine" el tipo de un archivo distinto al
  // declarado (ej. tratar un .txt subido como si fuera JS ejecutable).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Esta app nunca debe cargarse dentro de un <iframe> de otro sitio —
  // bloquea clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // Nunca manda la URL completa (con folios, IDs, tokens en query) como
  // referrer a un sitio externo; sí la manda completa entre páginas del
  // propio dominio.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
