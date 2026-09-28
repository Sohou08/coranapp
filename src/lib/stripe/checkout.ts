// Logique de création d'une session Stripe Checkout pour une réservation
// déjà existante (statut "pending"). Extrait de
// src/app/api/stripe/checkout/route.ts pour être appelé aussi bien par
// cette route que par la Server Action de paiement du tunnel public
// (src/app/(public)/paiement/actions.ts), sans dupliquer la logique.
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe/server";
import { computeApplicationFeeAmount } from "@/lib/stripe/config";

export type CheckoutResult = { url: string } | { error: string };

export async function createCheckoutSessionForBooking(
  supabase: SupabaseClient,
  bookingId: string,
  origin: string
): Promise<CheckoutResult> {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      "id, price, status, teacher_id, teacher_profiles(stripe_account_id, stripe_onboarding_complete, headline), subjects(label)"
    )
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return { error: "Réservation introuvable." };
  }

  const teacher = Array.isArray(booking.teacher_profiles)
    ? booking.teacher_profiles[0]
    : booking.teacher_profiles;
  const subject = Array.isArray(booking.subjects) ? booking.subjects[0] : booking.subjects;

  if (!teacher?.stripe_account_id || !teacher.stripe_onboarding_complete) {
    return { error: "Cet enseignant n'a pas encore terminé l'activation de ses paiements." };
  }

  const amountCents = Math.round(Number(booking.price) * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name: subject?.label ? `Cours de ${subject.label}` : "Cours Sanad",
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: computeApplicationFeeAmount(amountCents),
      transfer_data: {
        destination: teacher.stripe_account_id,
      },
    },
    metadata: {
      booking_id: booking.id,
    },
    // {CHECKOUT_SESSION_ID} est un template littéral remplacé par Stripe
    // lui-même — la page de confirmation en a besoin pour retrouver la
    // session en fallback synchrone (webhook pas encore actif, voir
    // src/app/(public)/confirmation/page.tsx).
    success_url: `${origin}/confirmation?booking_id=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/reservation/date?booking_id=${booking.id}`,
  });

  if (!session.url) {
    return { error: "Impossible de créer la session de paiement." };
  }

  return { url: session.url };
}
