// Revenus de l'enseignant : tuiles de stats (brut/net/en attente/en retard)
// + tableau des paiements avec actions "Relancer" / "Signaler à l'admin"
// sur les paiements en retard.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/dashboard/StatTile";
import { StripeOnboardButton } from "@/components/dashboard/StripeOnboardButton";
import { formatDateShortFr, formatPrice } from "@/lib/format";
import { PAYMENT_STATUS_LABELS } from "@/app/espace/_lib/queries";
import { guardianFullName } from "../_lib/queries";
import { PLATFORM_COMMISSION_RATE } from "@/lib/stripe/config";
import { stripe } from "@/lib/stripe/server";
import { reportOverduePaymentAction, sendPaymentReminderAction } from "./actions";

type PaymentRow = {
  id: string;
  amount: string | number;
  status: string;
  created_at: string;
  bookings: {
    starts_at: string;
    students: {
      id: string;
      first_name: string;
      parent_id: string | null;
      self_profile_id: string | null;
      parent: { first_name: string | null; last_name: string | null } | null;
      self: { first_name: string | null; last_name: string | null } | null;
    } | null;
  } | null;
};

export default async function EnseignantRevenusPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { success, onboarding } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("stripe_account_id, stripe_onboarding_complete")
    .eq("id", user.id)
    .single();

  let onboardingComplete = teacherProfile?.stripe_onboarding_complete ?? false;

  // Retour depuis Stripe après l'inscription Connect : on vérifie l'état
  // réel du compte directement auprès de Stripe plutôt que d'attendre le
  // webhook (indisponible pour l'instant, en attendant le déploiement avec
  // une URL publique — voir STRIPE_WEBHOOK_SECRET dans .env.local).
  if (onboarding === "complete" && teacherProfile?.stripe_account_id && !onboardingComplete) {
    const account = await stripe.accounts.retrieve(teacherProfile.stripe_account_id);
    onboardingComplete = Boolean(account.details_submitted && account.charges_enabled);
    if (onboardingComplete) {
      await supabase
        .from("teacher_profiles")
        .update({ stripe_onboarding_complete: true })
        .eq("id", user.id);
    }
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [paymentsRes, conversationsRes] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, status, created_at, bookings!inner(starts_at, teacher_id, students(id, first_name, parent_id, self_profile_id, parent:profiles!students_parent_id_fkey(first_name, last_name), self:profiles!students_self_profile_id_fkey(first_name, last_name)))"
      )
      .eq("bookings.teacher_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("conversations").select("id, other_id").eq("teacher_id", user.id),
  ]);

  const payments = (paymentsRes.data ?? []) as unknown as PaymentRow[];
  const conversationByGuardian = new Map<string, string>();
  for (const c of conversationsRes.data ?? []) {
    conversationByGuardian.set(c.other_id, c.id);
  }

  const revenue30d = payments
    .filter((p) => p.status === "paid" && p.created_at >= thirtyDaysAgo.toISOString())
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const net30d = revenue30d * (1 - PLATFORM_COMMISSION_RATE);
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  // Heuristique "en retard" : en attente depuis plus de 7 jours (le schéma
  // n'a pas de date d'échéance dédiée sur payments).
  const overduePayments = pendingPayments.filter((p) => p.created_at < sevenDaysAgo.toISOString());
  const overdueAmount = overduePayments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Revenus</h1>

      {onboardingComplete ? (
        <Card className="border-[var(--color-accent-700)]">
          <p className="text-[13px] text-[var(--color-accent-800)] font-semibold">
            Paiements activés — vous pouvez être payé·e directement sur votre compte Stripe.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-[14px]">Activez vos paiements</p>
              <p className="text-[13px] text-muted">
                Pour être payé·e des cours réservés avec vous, terminez l&apos;inscription auprès de
                Stripe (identité, coordonnées bancaires) — quelques minutes, gérées entièrement par
                Stripe.
              </p>
            </div>
            <StripeOnboardButton />
          </div>
        </Card>
      )}

      {typeof success === "string" && (
        <Card className="border-[var(--color-accent-700)]">
          <p className="text-[13px] text-[var(--color-accent-800)]">
            {success === "signalement"
              ? "Le signalement a été transmis à l'équipe Sanad."
              : "La relance a été envoyée."}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Revenus bruts (30 j)" value={formatPrice(revenue30d)} />
        <StatTile
          label="Net après commission"
          value={formatPrice(net30d)}
          hint={`Commission plateforme : ${Math.round(PLATFORM_COMMISSION_RATE * 100)}%`}
        />
        <StatTile label="En attente" value={formatPrice(pendingAmount)} />
        <StatTile label="En retard" value={formatPrice(overdueAmount)} />
      </div>

      <section>
        <h2 className="text-[16px] mb-3">Paiements</h2>
        {payments.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucun paiement pour l&apos;instant.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {payments.map((p) => {
              const student = p.bookings?.students;
              const guardianId = student?.parent_id ?? student?.self_profile_id ?? null;
              const guardianLabel = student?.parent_id
                ? guardianFullName(student.parent)
                : student?.self_profile_id
                  ? guardianFullName(student.self)
                  : "—";
              const isOverdue = overduePayments.some((op) => op.id === p.id);
              const conversationId = guardianId ? conversationByGuardian.get(guardianId) : undefined;

              return (
                <Card key={p.id} className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-[14px]">
                      {student?.first_name ?? "—"} · {guardianLabel}
                    </p>
                    <p className="text-[12px] text-muted">
                      {p.bookings ? formatDateShortFr(p.bookings.starts_at) : "—"} ·{" "}
                      {formatPrice(p.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={isOverdue ? "neutral" : p.status === "paid" ? "accent" : "neutral"}>
                      {isOverdue ? "En retard" : PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                    {isOverdue && student && (
                      <>
                        {conversationId ? (
                          <form action={sendPaymentReminderAction}>
                            <input type="hidden" name="conversationId" value={conversationId} />
                            <Button type="submit" variant="ghost" size="sm">
                              Relancer
                            </Button>
                          </form>
                        ) : (
                          <Button type="button" variant="ghost" size="sm" disabled title="Aucune conversation avec cette famille pour l'instant">
                            Relancer
                          </Button>
                        )}
                        <form action={reportOverduePaymentAction}>
                          <input type="hidden" name="studentId" value={student.id} />
                          <input
                            type="hidden"
                            name="reason"
                            value={`Paiement de ${formatPrice(p.amount)} en retard pour le cours du ${
                              p.bookings ? formatDateShortFr(p.bookings.starts_at) : ""
                            }.`}
                          />
                          <Button type="submit" variant="ghost" size="sm">
                            Signaler à l&apos;admin
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
