// Petits helpers de requêtage partagés entre les pages de l'espace
// parent/élève. RLS filtre déjà les lignes visibles ; ces helpers ajoutent
// les filtres explicites nécessaires à la correction de l'affichage (ex.
// ne montrer que les enfants de la famille connectée).
import type { SupabaseClient } from "@supabase/supabase-js";

export type FamilyStudent = {
  id: string;
  parent_id: string | null;
  self_profile_id: string | null;
  first_name: string;
  birth_year: number | null;
  notes: string | null;
};

// Les "enfants" d'une famille = les students dont le parent est
// l'utilisateur connecté. On inclut aussi self_profile_id pour couvrir le
// cas d'un compte "élève" (adulte) qui est son propre student, sans parent.
export async function getFamilyStudents(
  supabase: SupabaseClient,
  userId: string
): Promise<FamilyStudent[]> {
  const { data } = await supabase
    .from("students")
    .select("id, parent_id, self_profile_id, first_name, birth_year, notes")
    .or(`parent_id.eq.${userId},self_profile_id.eq.${userId}`)
    .order("first_name");
  return data ?? [];
}

export function teacherFullName(
  profile: { first_name?: string | null; last_name?: string | null } | null | undefined
): string {
  if (!profile) return "Enseignant";
  return `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Enseignant";
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absence",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  cancelled: "Résilié",
  past_due: "Paiement en retard",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  refunded: "Remboursé",
  failed: "Échoué",
};
