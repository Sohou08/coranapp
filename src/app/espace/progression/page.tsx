// Progression d'un enfant : dernier bilan de cours (lesson_reports.progress)
// affiché en barres de progression, résumé et prochain objectif.
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { formatDateFr } from "@/lib/format";
import { getFamilyStudents } from "../_lib/queries";

type LessonReportRow = {
  id: string;
  summary: string | null;
  difficulties: string | null;
  next_goal: string | null;
  progress: Record<string, number> | null;
  created_at: string;
  booking_id: string;
};

export default async function EspaceProgressionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { enfant } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const students = await getFamilyStudents(supabase, user.id);
  if (students.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-[26px]">Progression</h1>
        <Card>
          <p className="text-[13px] text-muted">Aucun enfant enregistré pour l&apos;instant.</p>
        </Card>
      </div>
    );
  }

  const requestedId = typeof enfant === "string" ? enfant : "";
  const current = students.find((s) => s.id === requestedId) ?? students[0];

  // Dernier bilan pour cet enfant, via ses réservations.
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("id")
    .eq("student_id", current.id);
  const bookingIds = (bookingRows ?? []).map((b) => b.id);

  let report: LessonReportRow | null = null;
  if (bookingIds.length) {
    const { data } = await supabase
      .from("lesson_reports")
      .select("id, summary, difficulties, next_goal, progress, created_at, booking_id")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    report = data as LessonReportRow | null;
  }

  const progressEntries = report?.progress ? Object.entries(report.progress) : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Progression</h1>

      <div className="flex gap-2 flex-wrap">
        {students.map((s) => (
          <Link key={s.id} href={`/espace/progression?enfant=${s.id}`}>
            <Badge tone={s.id === current.id ? "accent" : "neutral"}>{s.first_name}</Badge>
          </Link>
        ))}
      </div>

      {!report ? (
        <Card>
          <p className="text-[13px] text-muted">
            Aucun bilan de cours n&apos;a encore été rédigé pour {current.first_name}.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <p className="text-[12px] text-muted mb-3">
              Dernier bilan · {formatDateFr(report.created_at)}
            </p>
            <div className="flex flex-col gap-4">
              {progressEntries.length === 0 ? (
                <p className="text-[13px] text-muted">Aucune compétence évaluée dans ce bilan.</p>
              ) : (
                progressEntries.map(([key, value]) => (
                  <ProgressBar key={key} label={key} value={Number(value)} />
                ))
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-[15px] mb-2">Résumé</h2>
            <p className="text-[13px] text-muted mb-4">
              {report.summary ?? "Pas de résumé renseigné."}
            </p>
            <h2 className="text-[15px] mb-2">Prochain objectif</h2>
            <p className="text-[13px] text-muted">
              {report.next_goal ?? "Pas d'objectif renseigné."}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
