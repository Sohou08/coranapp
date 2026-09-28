// Crée une session de paiement Stripe Checkout pour une réservation
// existante (créée au préalable en statut "pending"). L'argent va
// directement sur le compte Connect de l'enseignant, minoré de la
// commission plateforme (voir src/lib/stripe/config.ts). Logique déplacée
// dans src/lib/stripe/checkout.ts, réutilisée par la Server Action de
// paiement du tunnel public.
import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createCheckoutSessionForBooking } from "@/lib/stripe/checkout";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { bookingId } = await request.json();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId manquant." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const result = await createCheckoutSessionForBooking(supabase, bookingId, origin);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ url: result.url });
}
