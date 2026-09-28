"use server";

// Ajout d'un enfant depuis le tunnel de réservation (il n'existe pas encore
// de page dédiée dans l'espace parent pour ça) — insère dans `students`
// avec parent_id = utilisateur connecté, puis revient sur cette même étape
// pour que l'enfant soit immédiatement sélectionnable.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

function isSafeRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

export async function addChildAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const returnTo = String(formData.get("returnTo") ?? "/espace");
  const safeReturnTo = isSafeRelativePath(returnTo) ? returnTo : "/espace";

  if (!user) {
    redirect(`/connexion?error=${encodeURIComponent("Connectez-vous pour ajouter un enfant.")}&next=${encodeURIComponent(safeReturnTo)}`);
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const birthYearRaw = String(formData.get("birthYear") ?? "").trim();
  const birthYear = birthYearRaw ? parseInt(birthYearRaw, 10) : null;

  if (!firstName) {
    redirect(`${safeReturnTo}${safeReturnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("Merci de renseigner le prénom de l'enfant.")}`);
  }

  const { error } = await supabase.from("students").insert({
    parent_id: user.id,
    first_name: firstName,
    birth_year: Number.isFinite(birthYear) ? birthYear : null,
  });

  if (error) {
    redirect(`${safeReturnTo}${safeReturnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("Impossible d'ajouter cet enfant pour le moment.")}`);
  }

  redirect(safeReturnTo);
}
