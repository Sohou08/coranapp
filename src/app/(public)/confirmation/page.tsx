import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { StepIndicator } from "@/components/site/StepIndicator";
import { NotFoundCard } from "@/components/site/NotFoundCard";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { findWaveCheckoutSessionByClientReference } from "@/lib/wave/server";
import { formatDateTimeFr } from "@/lib/format";
import { teacherFullName } from "@/app/espace/_lib/queries";

type BookingRow = {
  id: string;
  status: string;
  starts_at: string;
  price: string | number;
  teacher_profiles: { profiles: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null } | { profiles: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null }[] | null;
  subjects: { label: string } | { label: string }[] | null;
  students: { first_name: string; self_profile_id: string | null } | { first_name: string; self_profile_id: string | null }[] | null;
};

function oneOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const bookingId = typeof sp.booking_id === "string" ? sp.booking_id : "";
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : "";
  const provider = typeof sp.provider === "string" ? sp.provider : "stripe";
  if (!bookingId) return <NotFoundCard />;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <NotFoundCard />;

  const bookingSelect =
    "id, status, starts_at, price, teacher_profiles(profiles!teacher_profiles_id_fkey(first_name, last_name)), subjects(label), students(first_name, self_profile_id)";

  let { data: booking } = (await supabase
    .from("bookings")
    .select(bookingSelect)
    .eq("id", bookingId)
    .maybeSingle()) as unknown as { data: BookingRow | null };

  if (!booking) return <NotFoundCard />;

  // Fallback synchrone pour le développement local (pas encore d'URL
  // publique, donc STRIPE_WEBHOOK_SECRET non configuré et le webhook
  // checkout.session.completed ne peut pas être appelé par Stripe) — on
  // reproduit ici exactement sa logique : si la session Stripe indique un
  // paiement réussi et qu'aucune ligne `payments` n'existe déjà pour cette
  // réservation, on l'enregistre et on confirme la réservation. Le check
  // "aucun payment existant" rend ce fallback idempotent avec le futur
  // webhook réel une fois l'app déployée avec une URL publique.
  if (booking.status === "pending") {
    const admin = createAdminClient();
    const { data: existingPayment } = await admin
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (!existingPayment && provider === "wave") {
      // Même principe que pour Stripe ci-dessous : pas encore de vrai
      // webhook Wave (pas d'URL publique), donc vérification synchrone au
      // chargement de la page, via client_reference = booking.id.
      try {
        const session = await findWaveCheckoutSessionByClientReference(bookingId);
        if (session?.payment_status === "succeeded") {
          await admin.from("payments").insert({
            booking_id: bookingId,
            amount: booking.price,
            currency: "XOF",
            provider: "wave",
            provider_payment_id: session.transaction_id ?? session.id,
            status: "paid",
          });
          await admin.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);
          booking = { ...booking, status: "confirmed" };
        }
      } catch (err) {
        console.error("Erreur de vérification de la session Wave:", err);
      }
    } else if (!existingPayment && sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === "paid" && session.metadata?.booking_id === bookingId) {
          await admin.from("payments").insert({
            booking_id: bookingId,
            amount: (session.amount_total ?? 0) / 100,
            currency: (session.currency ?? "eur").toUpperCase(),
            provider: "stripe",
            provider_payment_id: session.payment_intent as string,
            status: "paid",
          });
          await admin.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);
          booking = { ...booking, status: "confirmed" };
        }
      } catch (err) {
        console.error("Erreur de vérification de la session Stripe:", err);
      }
    }
  }

  const teacherProfile = oneOf(booking.teacher_profiles);
  const teacherName = teacherFullName(oneOf(teacherProfile?.profiles ?? null));
  const subject = oneOf(booking.subjects);
  const student = oneOf(booking.students);
  const studentLabel = student?.self_profile_id ? "Moi-même" : student?.first_name ?? "—";
  const isPaid = booking.status === "confirmed";

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <StepIndicator current={4} />
      <Card className="text-center py-10">
        <div
          className="w-14 h-14 mx-auto mb-4 flex items-center justify-center text-white text-[24px] font-bold"
          style={{ background: isPaid ? "var(--color-accent-800)" : "var(--color-neutral-500)" }}
        >
          {isPaid ? "✓" : "…"}
        </div>
        <h1 className="text-[24px] mb-2">
          {isPaid ? "Réservation confirmée" : "Paiement en attente de confirmation"}
        </h1>
        <p className="text-[14px] text-muted mb-6">
          {isPaid
            ? "Un récapitulatif a été envoyé dans votre messagerie Sanad."
            : "Le paiement sera confirmé dès que Stripe nous l'aura signalé."}
        </p>
        <dl className="text-[14px] flex flex-col gap-2 max-w-sm mx-auto text-left">
          <div className="flex justify-between">
            <dt className="text-muted">Enseignant</dt>
            <dd>{teacherName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Cours</dt>
            <dd>{subject?.label ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Créneau</dt>
            <dd className="text-right">{formatDateTimeFr(booking.starts_at)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Élève</dt>
            <dd>{studentLabel}</dd>
          </div>
        </dl>
        <div className="flex gap-3 justify-center mt-8">
          <ButtonLink href="/" variant="secondary">
            Retour à l&apos;accueil
          </ButtonLink>
          <ButtonLink href="/recherche/">Réserver un autre cours</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
