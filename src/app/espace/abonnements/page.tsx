// Liste des abonnements de la famille, avec bouton de résiliation.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDateShortFr, formatPrice } from "@/lib/format";
import { getFamilyStudents, teacherFullName, SUBSCRIPTION_STATUS_LABELS } from "../_lib/queries";
import { cancelSubscriptionAction } from "./actions";

type SubscriptionRow = {
  id: string;
  plan_name: string;
  is_collective: boolean;
  frequency_label: string | null;
  price_amount: string | number;
  price_period: string;
  status: string;
  next_renewal_at: string | null;
  students: { id: string; first_name: string } | null;
  teacher_profiles: {
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

export default async function EspaceAbonnementsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const students = await getFamilyStudents(supabase, user.id);
  const studentIds = students.map((s) => s.id);

  let subscriptions: SubscriptionRow[] = [];
  if (studentIds.length) {
    const { data } = await supabase
      .from("subscriptions")
      .select(
        "id, plan_name, is_collective, frequency_label, price_amount, price_period, status, next_renewal_at, students(id, first_name), teacher_profiles(profiles(first_name, last_name))"
      )
      .in("student_id", studentIds)
      .order("status", { ascending: true });
    subscriptions = (data ?? []) as unknown as SubscriptionRow[];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Abonnements</h1>

      {typeof error === "string" && (
        <Card className="border-red-300">
          <p className="text-[13px] text-red-700">{error}</p>
        </Card>
      )}

      {subscriptions.length === 0 ? (
        <Card>
          <p className="text-[13px] text-muted">Aucun abonnement en cours pour l&apos;instant.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {subscriptions.map((s) => (
            <Card key={s.id} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[15px]">{s.plan_name}</p>
                  <Badge tone={s.status === "active" ? "accent" : "neutral"}>
                    {SUBSCRIPTION_STATUS_LABELS[s.status] ?? s.status}
                  </Badge>
                  {s.is_collective && <Badge tone="neutral">Collectif</Badge>}
                </div>
                <p className="text-[13px] text-muted">
                  Pour {s.students?.first_name ?? "—"} · avec {teacherFullName(s.teacher_profiles?.profiles)}
                </p>
                <p className="text-[13px] font-semibold mt-1">
                  {formatPrice(s.price_amount)} / {s.price_period}
                  {s.frequency_label ? ` · ${s.frequency_label}` : ""}
                </p>
                {s.next_renewal_at && s.status === "active" && (
                  <p className="text-[12px] text-muted">
                    Prochain renouvellement : {formatDateShortFr(s.next_renewal_at)}
                  </p>
                )}
              </div>
              {s.status === "active" && (
                <form action={cancelSubscriptionAction}>
                  <input type="hidden" name="subscriptionId" value={s.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Résilier
                  </Button>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card>
        <h2 className="text-[15px] mb-2">Cours collectifs</h2>
        <p className="text-[13px] text-muted">
          Le catalogue des cours collectifs auxquels s&apos;abonner arrive prochainement. En attendant,
          contactez un enseignant depuis sa fiche pour organiser un abonnement.
        </p>
      </Card>
    </div>
  );
}
