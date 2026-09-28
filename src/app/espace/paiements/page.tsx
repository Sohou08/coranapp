// Historique des paiements de la famille (cours + abonnements).
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/dashboard/StatTile";
import { formatDateShortFr, formatPrice } from "@/lib/format";
import { getFamilyStudents, teacherFullName, PAYMENT_STATUS_LABELS } from "../_lib/queries";

type PaymentRow = {
  id: string;
  amount: string | number;
  currency: string;
  provider: string;
  status: string;
  created_at: string;
  bookings: {
    students: { first_name: string } | null;
    subjects: { label: string } | null;
    teacher_profiles: { profiles: { first_name: string | null; last_name: string | null } | null } | null;
  } | null;
  subscriptions: {
    plan_name: string;
    students: { first_name: string } | null;
    teacher_profiles: { profiles: { first_name: string | null; last_name: string | null } | null } | null;
  } | null;
};

export default async function EspacePaiementsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const students = await getFamilyStudents(supabase, user.id);
  const studentIds = students.map((s) => s.id);

  let payments: PaymentRow[] = [];
  if (studentIds.length) {
    const [bookingRows, subscriptionRows] = await Promise.all([
      supabase.from("bookings").select("id").in("student_id", studentIds),
      supabase.from("subscriptions").select("id").in("student_id", studentIds),
    ]);
    const bookingIds = (bookingRows.data ?? []).map((b) => b.id);
    const subscriptionIds = (subscriptionRows.data ?? []).map((s) => s.id);

    if (bookingIds.length || subscriptionIds.length) {
      const orParts: string[] = [];
      if (bookingIds.length) orParts.push(`booking_id.in.(${bookingIds.join(",")})`);
      if (subscriptionIds.length) orParts.push(`subscription_id.in.(${subscriptionIds.join(",")})`);

      const { data } = await supabase
        .from("payments")
        .select(
          "id, amount, currency, provider, status, created_at, bookings(students(first_name), subjects(label), teacher_profiles(profiles(first_name, last_name))), subscriptions(plan_name, students(first_name), teacher_profiles(profiles(first_name, last_name)))"
        )
        .or(orParts.join(","))
        .order("created_at", { ascending: false });
      payments = (data ?? []) as unknown as PaymentRow[];
    }
  }

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Paiements</h1>

      <div className="grid grid-cols-2 gap-4">
        <StatTile label="Total payé" value={formatPrice(totalPaid)} />
        <StatTile label="Paiements enregistrés" value={payments.length} />
      </div>

      {payments.length === 0 ? (
        <Card>
          <p className="text-[13px] text-muted">Aucun paiement enregistré pour l&apos;instant.</p>
        </Card>
      ) : (
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-muted text-[11px] uppercase tracking-wide">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Enfant</th>
                <th className="px-4 py-3">Détail</th>
                <th className="px-4 py-3">Enseignant</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const label = p.bookings
                  ? p.bookings.subjects?.label ?? "Cours"
                  : p.subscriptions?.plan_name ?? "Abonnement";
                const student = p.bookings?.students?.first_name ?? p.subscriptions?.students?.first_name;
                const teacherProfiles =
                  p.bookings?.teacher_profiles?.profiles ?? p.subscriptions?.teacher_profiles?.profiles;
                return (
                  <tr key={p.id} className="border-t border-[var(--color-divider)]">
                    <td className="px-4 py-3">{formatDateShortFr(p.created_at)}</td>
                    <td className="px-4 py-3">{student ?? "—"}</td>
                    <td className="px-4 py-3">{label}</td>
                    <td className="px-4 py-3">{teacherFullName(teacherProfiles)}</td>
                    <td className="px-4 py-3 capitalize">{p.provider}</td>
                    <td className="px-4 py-3 font-semibold">{formatPrice(p.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={p.status === "paid" ? "accent" : "neutral"}>
                        {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled
                        title="Le téléchargement de reçus arrive prochainement"
                      >
                        Reçu
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
