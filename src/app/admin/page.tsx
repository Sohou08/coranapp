// Tableau de bord admin : stats plateforme + accès rapide aux files
// d'attente (enseignants à vérifier, signalements, suspensions).
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { StatTile } from "@/components/dashboard/StatTile";
import { formatPrice } from "@/lib/format";
import { PLATFORM_COMMISSION_RATE } from "@/lib/stripe/config";

export default async function AdminHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    activeTeachersRes,
    studentsRes,
    paymentsRes,
    unverifiedRes,
    moderationRes,
    suspensionsRes,
  ] = await Promise.all([
    supabase.from("teacher_profiles").select("id", { count: "exact", head: true }).eq("verified", true),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase
      .from("payments")
      .select("amount, status, created_at")
      .eq("status", "paid")
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("teacher_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verified", false),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .or("moderation_status.eq.pending,flagged.eq.true"),
    supabase
      .from("suspension_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const revenue30d = (paymentsRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const commission30d = revenue30d * PLATFORM_COMMISSION_RATE;

  const unverifiedCount = unverifiedRes.count ?? 0;
  const moderationCount = moderationRes.count ?? 0;
  const suspensionsCount = suspensionsRes.count ?? 0;
  const pendingActions = unverifiedCount + moderationCount + suspensionsCount;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Tableau de bord</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Enseignants actifs" value={activeTeachersRes.count ?? 0} />
        <StatTile label="Élèves suivis" value={studentsRes.count ?? 0} />
        <StatTile label="Commission (30 j)" value={formatPrice(commission30d)} />
        <StatTile label="Actions en attente" value={pendingActions} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/admin/enseignants">
          <Card className="hover:shadow-[var(--shadow-md)] transition-shadow flex items-center justify-between">
            <div>
              <p className="font-semibold text-[15px]">Enseignants</p>
              <p className="text-[12px] text-muted">En attente de vérification</p>
            </div>
            <Badge tone={unverifiedCount > 0 ? "accent" : "neutral"}>{unverifiedCount}</Badge>
          </Card>
        </Link>
        <Link href="/admin/signalements">
          <Card className="hover:shadow-[var(--shadow-md)] transition-shadow flex items-center justify-between">
            <div>
              <p className="font-semibold text-[15px]">Signalements</p>
              <p className="text-[12px] text-muted">Messages à modérer</p>
            </div>
            <Badge tone={moderationCount > 0 ? "accent" : "neutral"}>{moderationCount}</Badge>
          </Card>
        </Link>
        <Link href="/admin/suspensions">
          <Card className="hover:shadow-[var(--shadow-md)] transition-shadow flex items-center justify-between">
            <div>
              <p className="font-semibold text-[15px]">Suspensions</p>
              <p className="text-[12px] text-muted">Demandes en attente</p>
            </div>
            <Badge tone={suspensionsCount > 0 ? "accent" : "neutral"}>{suspensionsCount}</Badge>
          </Card>
        </Link>
      </div>
    </div>
  );
}
