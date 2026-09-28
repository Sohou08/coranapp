// Tableau de bord de l'espace enseignant : tuiles de stats, rappel
// disponibilités, cours du jour, élèves récemment enseignés.
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { ButtonLink, Button } from "@/components/ui/Button";
import { StatTile } from "@/components/dashboard/StatTile";
import { formatDateTimeFr, formatPrice } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/app/espace/_lib/queries";

type BookingRow = {
  id: string;
  starts_at: string;
  status: string;
  students: { id: string; first_name: string } | null;
  subjects: { label: string } | null;
};

export default async function EnseignantHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // Semaine courante (lundi → dimanche).
  const dow = now.getDay(); // 0 = dimanche
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    bookingsThisWeekRes,
    bookingsAllRes,
    todayBookingsRes,
    recentCompletedRes,
    availabilityCountRes,
    paymentsRes,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .gte("starts_at", startOfWeek.toISOString())
      .lt("starts_at", endOfWeek.toISOString()),
    supabase
      .from("bookings")
      .select("student_id, status")
      .eq("teacher_id", user.id)
      .neq("status", "cancelled"),
    supabase
      .from("bookings")
      .select("id, starts_at, status, students(id, first_name), subjects(label)")
      .eq("teacher_id", user.id)
      .gte("starts_at", startOfDay.toISOString())
      .lt("starts_at", endOfDay.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("bookings")
      .select("starts_at, students(id, first_name)")
      .eq("teacher_id", user.id)
      .eq("status", "completed")
      .order("starts_at", { ascending: false })
      .limit(20),
    supabase
      .from("availability")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user.id),
    supabase
      .from("payments")
      .select("amount, status, created_at, bookings!inner(teacher_id)")
      .eq("bookings.teacher_id", user.id),
  ]);

  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("stripe_onboarding_complete")
    .eq("id", user.id)
    .single();
  const stripeReady = teacherProfile?.stripe_onboarding_complete ?? false;

  const activeStudentIds = new Set(
    (bookingsAllRes.data ?? []).map((b) => b.student_id)
  );
  const todayBookings = (todayBookingsRes.data ?? []) as unknown as BookingRow[];

  const recentStudentsRaw = (recentCompletedRes.data ?? []) as unknown as Array<{
    starts_at: string;
    students: { id: string; first_name: string } | null;
  }>;
  const seen = new Set<string>();
  const recentStudents: { id: string; first_name: string; last: string }[] = [];
  for (const row of recentStudentsRaw) {
    const s = row.students;
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    recentStudents.push({ id: s.id, first_name: s.first_name, last: row.starts_at });
    if (recentStudents.length >= 3) break;
  }

  const availabilityCount = availabilityCountRes.count ?? 0;

  const payments = (paymentsRes.data ?? []) as unknown as Array<{
    amount: string | number;
    status: string;
    created_at: string;
  }>;
  const revenue30d = payments
    .filter((p) => p.status === "paid" && p.created_at >= thirtyDaysAgo.toISOString())
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pending = payments.filter((p) => p.status === "pending");
  const pendingAmount = pending.reduce((sum, p) => sum + Number(p.amount), 0);
  // "En retard" = en attente depuis plus de 7 jours (pas de date d'échéance
  // dédiée dans le schéma — heuristique simple, voir revenus/page.tsx).
  const overdueAmount = pending
    .filter((p) => p.created_at < sevenDaysAgo.toISOString())
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Tableau de bord</h1>

      {availabilityCount === 0 && (
        <Card className="border-[var(--color-accent-700)]">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-[13px]">
              Vous n&apos;avez pas encore renseigné de disponibilités — les familles ne peuvent pas
              réserver de cours avec vous tant qu&apos;aucun créneau n&apos;est ajouté.
            </p>
            <ButtonLink href="/enseignant/disponibilites" size="sm">
              Ajouter mes disponibilités
            </ButtonLink>
          </div>
        </Card>
      )}

      {!stripeReady && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-[13px]">
              Vos paiements ne sont pas encore activés — vous ne pourrez pas être payé·e des cours
              réservés avec vous tant que ce n&apos;est pas fait.
            </p>
            <ButtonLink href="/enseignant/revenus" size="sm">
              Activer les paiements
            </ButtonLink>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Élèves actifs" value={activeStudentIds.size} />
        <StatTile label="Cours cette semaine" value={bookingsThisWeekRes.count ?? 0} />
        <StatTile label="Revenus (30 j)" value={formatPrice(revenue30d)} />
        <StatTile
          label="En attente / retard"
          value={formatPrice(pendingAmount)}
          hint={overdueAmount > 0 ? `dont ${formatPrice(overdueAmount)} en retard` : undefined}
        />
      </div>

      <section>
        <h2 className="text-[16px] mb-3">Cours d&apos;aujourd&apos;hui</h2>
        {todayBookings.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucun cours prévu aujourd&apos;hui.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {todayBookings.map((b) => (
              <Card key={b.id} className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-[15px]">{formatDateTimeFr(b.starts_at)}</p>
                  <p className="text-[13px] text-muted">
                    {b.subjects?.label ?? "Cours"} · avec {b.students?.first_name ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={b.status === "confirmed" ? "accent" : "neutral"}>
                    {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                  </Badge>
                  {b.status === "confirmed" ? (
                    <ButtonLink href={`/salle/${b.id}`} size="sm" variant="secondary">
                      Rejoindre
                    </ButtonLink>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      title="La visio sera disponible une fois le cours confirmé"
                    >
                      Rejoindre
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[16px] mb-3">Élèves récemment enseignés</h2>
        {recentStudents.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucun cours terminé pour l&apos;instant.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {recentStudents.map((s) => (
              <Link key={s.id} href="/enseignant/eleves">
                <Card className="hover:shadow-[var(--shadow-md)] transition-shadow">
                  <p className="font-semibold text-[15px]">{s.first_name}</p>
                  <p className="text-[12px] text-muted">
                    Dernier cours : {formatDateTimeFr(s.last)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
