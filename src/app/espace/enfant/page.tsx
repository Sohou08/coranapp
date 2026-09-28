// Fiche complète d'un enfant : progression + cours à venir/passés +
// ressources visibles pour lui (plateforme, enseignant réservé, ou partage
// ciblé via resource_shares — voir mediatheque).
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { NotFoundCard } from "@/components/site/NotFoundCard";
import { formatDateTimeFr, computeAge } from "@/lib/format";
import { getFamilyStudents, teacherFullName, BOOKING_STATUS_LABELS } from "../_lib/queries";

type BookingRow = {
  id: string;
  starts_at: string;
  status: string;
  teacher_profiles: {
    id: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  subjects: { label: string } | null;
};

export default async function EspaceEnfantPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await searchParams;
  const studentId = typeof id === "string" ? id : "";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const students = await getFamilyStudents(supabase, user.id);
  const student = students.find((s) => s.id === studentId);

  if (!student) {
    return <NotFoundCard />;
  }

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select(
      "id, starts_at, status, teacher_profiles(id, profiles(first_name, last_name)), subjects(label)"
    )
    .eq("student_id", student.id)
    .order("starts_at", { ascending: false });
  const bookings = (bookingRows ?? []) as unknown as BookingRow[];

  const now = new Date().toISOString();
  const upcoming = bookings.filter((b) => b.starts_at >= now && b.status !== "cancelled");
  const past = bookings.filter((b) => b.starts_at < now || b.status === "cancelled");

  const bookingIds = bookings.map((b) => b.id);
  let progress: Record<string, number> | null = null;
  let summary: string | null = null;
  let nextGoal: string | null = null;
  if (bookingIds.length) {
    const { data: report } = await supabase
      .from("lesson_reports")
      .select("summary, next_goal, progress, created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (report) {
      progress = report.progress as Record<string, number>;
      summary = report.summary;
      nextGoal = report.next_goal;
    }
  }

  // Ressources visibles pour cet enfant : partagées par la plateforme, par
  // un enseignant avec lequel la famille a déjà réservé, ou partagées
  // explicitement avec lui via resource_shares (ajoutée pour l'espace
  // enseignant).
  const teacherIds = Array.from(
    new Set(bookings.map((b) => b.teacher_profiles?.id).filter((v): v is string => Boolean(v)))
  );
  const { data: shareRows } = await supabase
    .from("resource_shares")
    .select("resource_id")
    .eq("student_id", student.id);
  const sharedResourceIds = Array.from(new Set((shareRows ?? []).map((r) => r.resource_id)));

  const enfantOrFilters = [
    "is_shared.eq.true",
    teacherIds.length ? `owner_id.in.(${teacherIds.join(",")})` : null,
    sharedResourceIds.length ? `id.in.(${sharedResourceIds.join(",")})` : null,
  ].filter(Boolean) as string[];

  const { data: resources } = await supabase
    .from("resources")
    .select("id, title, mime_type, source")
    .or(enfantOrFilters.join(","));

  const age = computeAge(student.birth_year);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/espace" className="text-[12px] text-muted underline">
          ← Retour au tableau de bord
        </Link>
        <h1 className="text-[26px] mt-1">{student.first_name}</h1>
        <p className="text-[13px] text-muted">{age ? `${age} ans` : "Âge non renseigné"}</p>
      </div>

      {student.notes && (
        <Card>
          <h2 className="text-[15px] mb-2">Notes</h2>
          <p className="text-[13px] text-muted">{student.notes}</p>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px]">Progression</h2>
          <Link
            href={`/espace/progression?enfant=${student.id}`}
            className="text-[12px] font-semibold text-[var(--color-accent-800)] underline"
          >
            Voir le détail
          </Link>
        </div>
        {!progress ? (
          <p className="text-[13px] text-muted">Aucun bilan de cours pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(progress).map(([key, value]) => (
              <ProgressBar key={key} label={key} value={Number(value)} />
            ))}
            {summary && <p className="text-[13px] text-muted mt-2">{summary}</p>}
            {nextGoal && (
              <p className="text-[13px]">
                <span className="font-semibold">Prochain objectif : </span>
                {nextGoal}
              </p>
            )}
          </div>
        )}
      </Card>

      <section>
        <h2 className="text-[16px] mb-3">Cours à venir</h2>
        {upcoming.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucun cours à venir.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((b) => (
              <Card key={b.id} className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-[15px]">{formatDateTimeFr(b.starts_at)}</p>
                  <p className="text-[13px] text-muted">
                    {b.subjects?.label ?? "Cours"} · avec {teacherFullName(b.teacher_profiles?.profiles)}
                  </p>
                </div>
                <Badge tone={b.status === "confirmed" ? "accent" : "neutral"}>
                  {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[16px] mb-3">Cours passés</h2>
        {past.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucun cours passé.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {past.map((b) => (
              <Card key={b.id} className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-[15px]">{formatDateTimeFr(b.starts_at)}</p>
                  <p className="text-[13px] text-muted">
                    {b.subjects?.label ?? "Cours"} · avec {teacherFullName(b.teacher_profiles?.profiles)}
                  </p>
                </div>
                <Badge tone="neutral">{BOOKING_STATUS_LABELS[b.status] ?? b.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[16px] mb-3">Ressources</h2>
        {!resources || resources.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucune ressource disponible pour l&apos;instant.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {resources.map((r) => (
              <Card key={r.id} className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-[13px] font-semibold">{r.title}</p>
                <div className="flex items-center gap-2">
                  {r.source === "lesson_recording" && <Badge>Enregistrement de cours</Badge>}
                  <Badge tone="neutral">{r.mime_type ?? "Fichier"}</Badge>
                  {r.source === "lesson_recording" && (
                    <a
                      href={`/api/resources/${r.id}/open`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-extrabold uppercase tracking-wide px-4 py-2 border border-[var(--color-divider)] hover:bg-[var(--color-neutral-100)] transition-colors"
                    >
                      Ouvrir
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
