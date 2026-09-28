// Point d'entrée des webhooks Stripe. C'est Stripe qui appelle cette route
// (jamais le navigateur) pour nous informer qu'un paiement a réussi, qu'un
// enseignant a terminé son inscription Connect, etc. — indispensable car un
// paiement peut réussir côté Stripe même si l'utilisateur ferme l'onglet
// avant de revenir sur success_url.
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Signature Stripe invalide:", err);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  // La clé service_role est nécessaire ici : ce code tourne côté serveur,
  // déclenché par Stripe (pas par un utilisateur connecté), donc il n'y a
  // pas de session pour faire passer les policies RLS normalement.
  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;
      if (bookingId) {
        await supabase.from("payments").insert({
          booking_id: bookingId,
          amount: (session.amount_total ?? 0) / 100,
          currency: (session.currency ?? "eur").toUpperCase(),
          provider: "stripe",
          provider_payment_id: session.payment_intent as string,
          status: "paid",
        });
        await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const onboardingComplete = Boolean(account.details_submitted && account.charges_enabled);
      await supabase
        .from("teacher_profiles")
        .update({ stripe_onboarding_complete: onboardingComplete })
        .eq("stripe_account_id", account.id);
      break;
    }

    default:
      // Événements non traités pour l'instant (litiges, remboursements...) —
      // à ajouter au fur et à mesure des besoins réels.
      break;
  }

  return NextResponse.json({ received: true });
}
