import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Archivo, extrait de la maquette Claude Design "SANAD" (fichier variable,
// auto-hébergé ici pour ne dépendre d'aucun appel réseau vers Google Fonts).
const archivo = localFont({
  variable: "--font-archivo",
  src: [
    { path: "./fonts/archivo-variable.woff2", weight: "400", style: "normal" },
    { path: "./fonts/archivo-variable.woff2", weight: "600", style: "normal" },
    { path: "./fonts/archivo-variable.woff2", weight: "800", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Sanad — Cours de Coran en ligne",
  description:
    "Trouvez un enseignant de Coran vérifié, réservez et suivez votre apprentissage en ligne.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        {children}
      </body>
    </html>
  );
}
