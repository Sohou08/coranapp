// Helpers partagés entre les pages de l'espace enseignant.
import type { SupabaseClient } from "@supabase/supabase-js";

export const FORMAT_LABELS: Record<string, string> = {
  en_ligne: "En ligne",
  domicile: "À domicile",
  presentiel: "En présentiel",
  hybride: "Hybride",
};

export const FORMAT_OPTIONS = Object.keys(FORMAT_LABELS);

export const LANGUAGE_OPTIONS = ["Français", "Wolof", "Arabe", "Anglais"];

export const WEEKDAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

export function guardianFullName(
  profile: { first_name?: string | null; last_name?: string | null } | null | undefined
): string {
  if (!profile) return "—";
  return `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—";
}

// Renvoie l'id du teacher_profiles connecté, ou redirige vers /connexion en
// amont (à appeler après avoir vérifié l'utilisateur).
export async function getTeacherProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("teacher_profiles")
    .select(
      "id, slug, headline, bio, languages, formats, price_hour, years_experience, city, country, verified"
    )
    .eq("id", userId)
    .maybeSingle();
  return data;
}
