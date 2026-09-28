// Client Stripe côté serveur uniquement (route handlers, server actions).
// Ne JAMAIS importer ce fichier depuis un composant client : STRIPE_SECRET_KEY
// ne doit jamais atteindre le navigateur.
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Épinglée pour que les changements d'API Stripe n'affectent pas le code
  // sans qu'on l'ait explicitement décidé.
  apiVersion: "2026-08-26.dahlia",
  typescript: true,
});
