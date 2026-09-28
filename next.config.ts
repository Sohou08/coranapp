import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // L'export statique ("output: export") a été abandonné : il est
  // incompatible avec les Server Actions (authentification, paiements,
  // messagerie...) désormais utilisées partout dans l'app. L'application
  // sera déployée sur un hébergeur qui exécute un vrai serveur Node
  // (Vercel), donc plus besoin d'export statique.
  images: { unoptimized: true },
};

export default nextConfig;
