// Gestion des comptes Stripe Connect (Express) des enseignants.
//
// Pourquoi "Express" : c'est le type de compte Connect qui demande le moins
// de travail à l'enseignant (Stripe gère lui-même le formulaire de
// vérification d'identité) et le moins de travail à nous (pas de tableau de
// bord de paiement à construire — Stripe fournit le sien).
//
// Flux : un enseignant qui veut être payé clique sur "Activer les paiements"
// → on crée (ou récupère) son compte Connect → on génère un lien
// d'inscription à usage unique → on le redirige dessus → Stripe le ramène
// chez nous une fois terminé.
import { stripe } from "./server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function getOrCreateConnectAccount(teacherProfileId: string, email: string) {
  const supabase = await createServerSupabaseClient();

  const { data: teacher, error } = await supabase
    .from("teacher_profiles")
    .select("stripe_account_id")
    .eq("id", teacherProfileId)
    .single();

  if (error) throw error;
  if (teacher?.stripe_account_id) return teacher.stripe_account_id;

  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    // Ajusté quand Sanad s'ouvrira formellement à d'autres pays ; les
    // enseignants doivent créer leur compte depuis un pays supporté par
    // Stripe Connect (voir https://stripe.com/global pour la liste à jour).
    business_type: "individual",
  });

  const { error: updateError } = await supabase
    .from("teacher_profiles")
    .update({ stripe_account_id: account.id })
    .eq("id", teacherProfileId);

  if (updateError) throw updateError;

  return account.id;
}

export async function createOnboardingLink(stripeAccountId: string, returnUrl: string, refreshUrl: string) {
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
  return accountLink.url;
}
