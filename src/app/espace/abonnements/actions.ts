"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

// Résiliation d'un abonnement par la famille — ne modifie que status et
// cancelled_at (policy RLS dédiée : "subscriptions: family cancel", voir
// migration espace_family_write_policies).
export async function cancelSubscriptionAction(formData: FormData) {
  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  if (!subscriptionId) {
    redirect("/espace/abonnements?error=" + encodeURIComponent("Abonnement introuvable."));
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", subscriptionId);

  if (error) {
    redirect(
      "/espace/abonnements?error=" +
        encodeURIComponent("La résiliation a échoué. Réessayez dans un instant.")
    );
  }

  revalidatePath("/espace/abonnements");
  redirect("/espace/abonnements");
}
