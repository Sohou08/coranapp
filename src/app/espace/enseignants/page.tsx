// Liste des enseignants distincts avec lesquels la famille a déjà réservé.
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { formatDateFr } from "@/lib/format";
import { getFamilyStudents, teacherFullName } from "../_lib/queries";

type BookingRow = {
  starts_at: string;
  teacher_profiles: {
    id: string;
    slug: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  subjects: { label: string } | null;
};

export default async function EspaceEnseignantsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const students = await getFamilyStudents(supabase, user.id);
  const studentIds = students.map((s) => s.id);

  let bookings: BookingRow[] = [];
  if (studentIds.length) {
    const { data } = await supabase
      .from("bookings")
      .select(
        "starts_at, teacher_profiles(id, slug, profiles(first_name, last_name)), subjects(label)"
      )
      .in("student_id", studentIds)
      .order("starts_at", { ascending: true });
    bookings = (data ?? []) as unknown as BookingRow[];
  }

  const now = new Date().toISOString();

  type TeacherAgg = {
    id: string;
    slug: string;
    name: string;
    subjects: Set<string>;
    lastPast?: string;
    nextUpcoming?: string;
  };

  const byTeacher = new Map<string, TeacherAgg>();
  for (const b of bookings) {
    const t = b.teacher_profiles;
    if (!t) continue;
    const agg =
      byTeacher.get(t.id) ??
      ({ id: t.id, slug: t.slug, name: teacherFullName(t.profiles), subjects: new Set<string>() } as TeacherAgg);
    if (b.subjects?.label) agg.subjects.add(b.subjects.label);
    if (b.starts_at < now) {
      if (!agg.lastPast || b.starts_at > agg.lastPast) agg.lastPast = b.starts_at;
    } else {
      if (!agg.nextUpcoming || b.starts_at < agg.nextUpcoming) agg.nextUpcoming = b.starts_at;
    }
    byTeacher.set(t.id, agg);
  }

  const teachers = Array.from(byTeacher.values());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Mes enseignants</h1>

      {teachers.length === 0 ? (
        <Card>
          <p className="text-[13px] text-muted">
            Vous n&apos;avez pas encore réservé de cours avec un enseignant.{" "}
            <Link href="/recherche" className="underline text-[var(--color-accent-800)]">
              Trouver un enseignant
            </Link>
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {teachers.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-[16px]">{t.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Array.from(t.subjects).map((s) => (
                      <Badge key={s} tone="neutral">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[12px] text-muted mt-2">
                    {t.nextUpcoming
                      ? `Prochain cours : ${formatDateFr(t.nextUpcoming)}`
                      : t.lastPast
                      ? `Dernier cours : ${formatDateFr(t.lastPast)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-stretch shrink-0">
                  <ButtonLink href={`/enseignants/${t.slug}`} size="sm" variant="secondary">
                    Voir le profil
                  </ButtonLink>
                  <ButtonLink href={`/reservation/cours?teacher=${t.slug}`} size="sm">
                    Réserver à nouveau
                  </ButtonLink>
                  <Link
                    href="/espace/messagerie"
                    className="text-[12px] text-center font-semibold text-[var(--color-accent-800)] underline"
                  >
                    Envoyer un message
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
