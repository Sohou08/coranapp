// Client Supabase "admin" — clé service_role, contourne les policies RLS.
// ⚠️ Ne JAMAIS importer ce fichier depuis un composant client ni l'exposer
// au navigateur. Réservé aux traitements serveur de confiance (ex: webhooks
// Stripe/Wave, tâches d'administration).
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
