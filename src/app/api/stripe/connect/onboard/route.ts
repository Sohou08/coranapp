// Démarre (ou reprend) l'inscription Stripe Connect d'un enseignant.
// Appelé depuis le bouton "Activer les paiements" de l'espace enseignant.
import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateConnectAccount, createOnboardingLink } from "@/lib/stripe/connect";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const origin = new URL(request.url).origin;

  try {
    const accountId = await getOrCreateConnectAccount(user.id, user.email!);
    const url = await createOnboardingLink(
      accountId,
      `${origin}/enseignant/revenus?onboarding=complete`,
      `${origin}/enseignant/revenus?onboarding=refresh`
    );
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Erreur onboarding Stripe Connect:", err);
    return NextResponse.json({ error: "Impossible de démarrer l'inscription Stripe." }, { status: 500 });
  }
}
