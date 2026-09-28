// Logique de création d'une session Wave Checkout pour une réservation déjà
// existante (statut "pending"). Miroir de src/lib/stripe/checkout.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createWaveCheckoutSession } from "./server";

export type WaveCheckoutResult = { url: string } | { error: string };

export async function createWaveCheckoutSessionForBooking(
  supabase: SupabaseClient,
  bookingId: string,
  origin: string
): Promise<WaveCheckoutResult> {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, price, status")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return { error: "Réservation introuvable." };
  }

  try {
    // Wave, contrairement à Stripe, ne propose pas de template du type
    // "{CHECKOUT_SESSION_ID}" substitué dans l'URL de succès : on ne peut
    // pas transmettre l'id de session à la page de confirmation via
    // l'URL. On s'appuie donc sur client_reference (= booking.id, déjà
    // unique) : la page de confirmation retrouve la session Wave via
    // GET /v1/checkout/sessions/search?client_reference=... au lieu d'un
    // id de session passé en paramètre.
    const session = await createWaveCheckoutSession({
      amount: Number(booking.price),
      clientReference: booking.id,
      successUrl: `${origin}/confirmation?booking_id=${booking.id}&provider=wave`,
      errorUrl: `${origin}/reservation/date?booking_id=${booking.id}`,
    });

    return { url: session.wave_launch_url };
  } catch (err) {
    console.error("Erreur de création de session Wave Checkout:", err);
    return { error: "Impossible de contacter Wave pour le moment." };
  }
}
