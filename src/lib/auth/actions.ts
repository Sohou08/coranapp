"use server";

import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

const VALID_ROLES = ["parent", "eleve", "enseignant"] as const;
type SignUpRole = (typeof VALID_ROLES)[number];

function isValidRole(value: FormDataEntryValue | null): value is SignUpRole {
  return typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const roleRaw = formData.get("role");
  const role: SignUpRole = isValidRole(roleRaw) ? roleRaw : "parent";

  if (!email || !password || !firstName || !lastName) {
    redirect("/inscription?error=" + encodeURIComponent("Merci de remplir tous les champs."));
  }
  if (password.length < 8) {
    redirect("/inscription?error=" + encodeURIComponent("Le mot de passe doit faire au moins 8 caractères."));
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Lu par le déclencheur `handle_new_user` côté base de données pour
      // créer automatiquement la ligne `profiles` (et `teacher_profiles`
      // si role = "enseignant") — voir migration auth_profile_auto_create.
      data: {
        first_name: firstName,
        last_name: lastName,
        role,
      },
    },
  });

  if (error) {
    redirect("/inscription?error=" + encodeURIComponent(translateAuthError(error.message)));
  }

  redirect("/espace");
}

// Chemin relatif sûr uniquement : évite qu'un `next` fabriqué renvoie vers
// un site externe (open redirect) — doit commencer par "/", pas par "//",
// et ne pas contenir "://".
function isSafeRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = formData.get("next");
  const next = typeof nextRaw === "string" && isSafeRelativePath(nextRaw) ? nextRaw : "/espace";

  if (!email || !password) {
    redirect(
      `/connexion?error=${encodeURIComponent("Merci de renseigner ton email et ton mot de passe.")}${
        next !== "/espace" ? `&next=${encodeURIComponent(next)}` : ""
      }`
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/connexion?error=${encodeURIComponent(translateAuthError(error.message))}${
        next !== "/espace" ? `&next=${encodeURIComponent(next)}` : ""
      }`
    );
  }

  // Une réservation en cours (ou une autre destination demandée) prime sur
  // la redirection par défaut vers l'espace parent/élève.
  redirect(next);
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

// Les messages d'erreur Supabase Auth arrivent en anglais — traduction des
// cas les plus courants pour rester cohérent avec le reste de l'interface.
function translateAuthError(message: string) {
  if (message.includes("already registered") || message.includes("already exists")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (message.includes("Invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (message.includes("Password should be")) {
    return "Le mot de passe doit faire au moins 8 caractères.";
  }
  return "Une erreur est survenue. Réessaie dans un instant.";
}
