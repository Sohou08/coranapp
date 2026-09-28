// Tableau de bord de l'espace parent/élève : tuiles de stats, prochain
// cours, et grille des enfants de la famille.
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { StatTile } from "@/components/dashboard/StatTile";
import { formatDateTimeFr, computeAge } from "@/lib/format";
import { getFamilyStudents, teacherFullName } from "./_lib/queries";

export default async function EspaceHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const students = await getFamilyStudents(supabase, user.id);
  const studentIds = students.map((s) => s.id);

  const now = new Date().toISOString();

  const [bookingsRes, resourcesRes] = await Promise.all([
    studentIds.length
      ? supabase
          .from("bookings")
          .select(
            "id, starts_at, status, students(id, first_name), teacher_profiles(id, slug, profiles(first_name, last_name)), subjects(label)"
          )
          .in("student_id", studentIds)
          .order("starts_at", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("is_shared", true),
  ]);

  const bookings = (bookingsRes.data ?? []) as unknown as Array<{
    id: string;
    starts_at: string;
    status: string;
    students: { id: string; first_name: string } | null;
    teacher_profiles: {
      id: string;
      slug: string;
      profiles: { first_name: string | null; last_name: string | null } | null;
    } | null;
    subjects: { label: string } | null;
  }>;

  const upcoming = bookings.filter(
    (b) => b.starts_at >= now && b.status !== "cancelled"
  );
  const nextBooking = upcoming[0];

  const distinctTeacherIds = new Set(
    bookings.map((b) => b.teacher_profiles?.id).filter(Boolean)
  );

  const resourcesCount = resourcesRes.count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Tableau de bord</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Cours à venir" value={upcoming.length} />
        <StatTile label="Enfants" value={students.length} />
        <StatTile label="Enseignants" value={distinctTeacherIds.size} />
        <StatTile label="Ressources visibles" value={resourcesCount} />
      </div>

      <Card>
        <h2 className="text-[16px] mb-3">Prochain cours</h2>
        {nextBooking ? (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-[15px]">
                {formatDateTimeFr(nextBooking.starts_at)}
              </p>
              <p className="text-[13px] text-muted">
                {nextBooking.subjects?.label ?? "Cours"} · avec{" "}
                {teacherFullName(nextBooking.teacher_profiles?.profiles)} · pour{" "}
                {nextBooking.students?.first_name ?? "—"}
              </p>
            </div>
            <Badge>{nextBooking.status === "confirmed" ? "Confirmé" : "En attente"}</Badge>
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            Aucun cours à venir pour le moment.{" "}
            <Link href="/recherche" className="underline text-[var(--color-accent-800)]">
              Trouver un enseignant
            </Link>
          </p>
        )}
      </Card>

      <div>
        <h2 className="text-[16px] mb-3">Mes enfants</h2>
        {students.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">
              Aucun enfant enregistré pour l&apos;instant.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {students.map((s) => {
              const age = computeAge(s.birth_year);
              return (
                <Link key={s.id} href={`/espace/enfant?id=${s.id}`}>
                  <Card className="hover:shadow-[var(--shadow-md)] transition-shadow">
                    <p className="font-semibold text-[15px]">{s.first_name}</p>
                    <p className="text-[12px] text-muted">
                      {age ? `${age} ans` : "Âge non renseigné"}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
