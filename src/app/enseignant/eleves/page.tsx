// Liste des élèves distincts ayant déjà réservé un cours avec l'enseignant
// connecté : âge, parent/tuteur, matière(s), date du dernier cours.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { computeAge, formatDateShortFr } from "@/lib/format";
import { guardianFullName } from "../_lib/queries";

type BookingRow = {
  starts_at: string;
  students: {
    id: string;
    first_name: string;
    birth_year: number | null;
    parent_id: string | null;
    self_profile_id: string | null;
    parent: { first_name: string | null; last_name: string | null } | null;
    self: { first_name: string | null; last_name: string | null } | null;
  } | null;
  subjects: { label: string } | null;
};

type StudentSummary = {
  id: string;
  first_name: string;
  birth_year: number | null;
  guardianLabel: string;
  subjects: Set<string>;
  lastLesson: string;
};

export default async function EnseignantElevesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data } = await supabase
    .from("bookings")
    .select(
      "starts_at, students(id, first_name, birth_year, parent_id, self_profile_id, parent:profiles!students_parent_id_fkey(first_name, last_name), self:profiles!students_self_profile_id_fkey(first_name, last_name)), subjects(label)"
    )
    .eq("teacher_id", user.id)
    .order("starts_at", { ascending: false });

  const bookings = (data ?? []) as unknown as BookingRow[];

  const byStudent = new Map<string, StudentSummary>();
  for (const b of bookings) {
    const s = b.students;
    if (!s) continue;
    let entry = byStudent.get(s.id);
    if (!entry) {
      const guardianLabel = s.parent_id
        ? guardianFullName(s.parent)
        : s.self_profile_id
          ? `${guardianFullName(s.self)} (élève)`
          : "—";
      entry = {
        id: s.id,
        first_name: s.first_name,
        birth_year: s.birth_year,
        guardianLabel,
        subjects: new Set(),
        lastLesson: b.starts_at,
      };
      byStudent.set(s.id, entry);
    }
    if (b.subjects?.label) entry.subjects.add(b.subjects.label);
  }

  const students = Array.from(byStudent.values());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Mes élèves</h1>

      {students.length === 0 ? (
        <Card>
          <p className="text-[13px] text-muted">Aucun élève pour l&apos;instant.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {students.map((s) => {
            const age = computeAge(s.birth_year);
            return (
              <Card key={s.id} className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-[15px]">{s.first_name}</p>
                  <p className="text-[12px] text-muted">
                    {age ? `${age} ans` : "Âge non renseigné"} · Parent/tuteur : {s.guardianLabel}
                  </p>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {Array.from(s.subjects).map((label) => (
                      <Badge key={label} tone="neutral">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-[12px] text-muted">
                  Dernier cours : {formatDateShortFr(s.lastLesson)}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
