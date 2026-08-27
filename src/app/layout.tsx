import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carlos Yerves Multiservicios",
  description: "Cotizador de servicios de Carlos Yerves Multiservicios",
};

// Se ejecuta de forma bloqueante antes del primer paint — fija
// data-theme="light" si el usuario ya eligió modo claro, para que la
// página nunca "parpadee" en oscuro y luego cambie (ver ThemeToggle,
// Sección 2 del documento de diseño). Oscuro sigue siendo la identidad
// por defecto: si no hay nada guardado, no se toca el atributo.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("quotly-theme");if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-bg text-text">{children}</body>
    </html>
  );
}
