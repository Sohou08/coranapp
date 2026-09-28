// Liste des cours (à venir / passés) de la famille, avec filtre par enfant.
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatDateTimeFr } from "@/lib/format";
import { getFamilyStudents, teacherFullName, BOOKING_STATUS_LABELS } from "../_lib/queries";

type BookingRow = {
  id: string;
  starts_at: string;
  status: string;
  student_id: string;
  students: { id: string; first_name: string } | null;
  teacher_profiles: {
    id: string;
    slug: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  subjects: { label: string } | null;
};

export default async function EspaceCoursPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { enfant } = await searchParams;
  const enfantId = typeof enfant === "string" ? enfant : "";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const students = await getFamilyStudents(supabase, user.id);
  const studentIds = students.map((s) => s.id);

  let bookings: BookingRow[] = [];
  let reviewedBookingIds = new Set<string>();
  let reportedBookingIds = new Set<string>();

  if (studentIds.length) {
    let query = supabase
      .from("bookings")
      .select(
        "id, starts_at, status, student_id, students(id, first_name), teacher_profiles(id, slug, profiles(first_name, last_name)), subjects(label)"
      )
      .in("student_id", studentIds)
      .order("starts_at", { ascending: false });

    if (enfantId) {
      query = query.eq("student_id", enfantId);
    }

    const { data } = await query;
    bookings = (data ?? []) as unknown as BookingRow[];

    const bookingIds = bookings.map((b) => b.id);
    if (bookingIds.length) {
      const { data: reviews } = await supabase
        .from("reviews")
        .select("booking_id")
        .in("booking_id", bookingIds);
      reviewedBookingIds = new Set((reviews ?? []).map((r) => r.booking_id));

      const { data: reports } = await supabase
        .from("lesson_reports")
        .select("booking_id")
        .in("booking_id", bookingIds);
      reportedBookingIds = new Set((reports ?? []).map((r) => r.booking_id));
    }
  }

  const now = new Date().toISOString();
  const upcoming = bookings.filter((b) => b.starts_at >= now && b.status !== "cancelled");
  const past = bookings.filter((b) => b.starts_at < now || b.status === "cancelled");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Mes cours</h1>

      {students.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Link href="/espace/cours">
            <Badge tone={enfantId ? "neutral" : "accent"}>Tous</Badge>
          </Link>
          {students.map((s) => (
            <Link key={s.id} href={`/espace/cours?enfant=${s.id}`}>
              <Badge tone={enfantId === s.id ? "accent" : "neutral"}>{s.first_name}</Badge>
            </Link>
          ))}
        </div>
      )}

      <section>
        <h2 className="text-[16px] mb-3">À venir</h2>
        {upcoming.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucun cours à venir.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((b) => (
              <Card key={b.id} className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-[15px]">{formatDateTimeFr(b.starts_at)}</p>
                  <p className="text-[13px] text-muted">
                    {b.subjects?.label ?? "Cours"} · avec {teacherFullName(b.teacher_profiles?.profiles)} ·
                    pour {b.students?.first_name ?? "—"}
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
        <h2 className="text-[16px] mb-3">Passés</h2>
        {past.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucun cours passé.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {past.map((b) => (
              <Card key={b.id} className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-[15px]">{formatDateTimeFr(b.starts_at)}</p>
                  <p className="text-[13px] text-muted">
                    {b.subjects?.label ?? "Cours"} · avec {teacherFullName(b.teacher_profiles?.profiles)} ·
                    pour {b.students?.first_name ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="neutral">{BOOKING_STATUS_LABELS[b.status] ?? b.status}</Badge>
                  {reportedBookingIds.has(b.id) && b.student_id && (
                    <Link
                      href={`/espace/progression?enfant=${b.student_id}`}
                      className="text-[12px] font-semibold text-[var(--color-accent-800)] underline"
                    >
                      Voir le bilan
                    </Link>
                  )}
                  {b.status === "completed" &&
                    (reviewedBookingIds.has(b.id) ? (
                      <Badge>Avis publié</Badge>
                    ) : (
                      <ButtonLink href={`/espace/avis?lesson=${b.id}`} size="sm" variant="secondary">
                        Laisser un avis
                      </ButtonLink>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
