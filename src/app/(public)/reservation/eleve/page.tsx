import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ButtonLink, Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { StepIndicator } from "@/components/site/StepIndicator";
import { NotFoundCard } from "@/components/site/NotFoundCard";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getTeacherBySlug } from "../../_lib/queries";
import { getFamilyStudents } from "@/app/espace/_lib/queries";
import { computeAge } from "@/lib/format";
import { addChildAction } from "./actions";

export default async function ReservationElevePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const teacherSlug = typeof sp.teacher === "string" ? sp.teacher : "";
  const subjectId = typeof sp.subject === "string" ? sp.subject : "";
  const start = typeof sp.start === "string" ? sp.start : "";
  const error = typeof sp.error === "string" ? sp.error : "";

  if (!teacherSlug || !subjectId || !start) return <NotFoundCard />;

  const currentUrl = `/reservation/eleve?teacher=${teacherSlug}&subject=${subjectId}&start=${encodeURIComponent(start)}`;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/connexion?error=${encodeURIComponent("Connectez-vous pour réserver un cours.")}&next=${encodeURIComponent(currentUrl)}`);
  }

  const teacher = await getTeacherBySlug(supabase, teacherSlug);
  if (!teacher) return <NotFoundCard />;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name")
    .eq("id", user.id)
    .maybeSingle();

  let students = await getFamilyStudents(supabase, user.id);

  // Compte "élève" (adulte auto-formé) : sa propre ligne `students`
  // (self_profile_id = son id) sert d'option "Moi-même" — on la crée si
  // elle n'existe pas encore (première réservation de ce compte).
  if (profile?.role === "eleve" && !students.some((s) => s.self_profile_id === user.id)) {
    const { data: created } = await supabase
      .from("students")
      .insert({ self_profile_id: user.id, first_name: profile.first_name || "Moi-même" })
      .select("id, parent_id, self_profile_id, first_name, birth_year, notes")
      .single();
    if (created) students = [...students, created];
  }

  const qs = `teacher=${teacher.slug}&subject=${subjectId}&start=${encodeURIComponent(start)}`;

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <StepIndicator current={2} />
      <h1 className="text-[24px] mb-1">Pour qui est ce cours ?</h1>
      <p className="text-[14px] text-muted mb-6">Avec {teacher.name}</p>

      {error && (
        <p className="mb-4 border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {students.map((s) => {
          const age = computeAge(s.birth_year);
          const isSelf = s.self_profile_id === user.id;
          return (
            <Card key={s.id} className="flex items-center justify-between">
              <p className="text-[14px] font-medium">
                {isSelf ? "Moi-même" : s.first_name}
                {!isSelf && age ? ` (${age} ans)` : ""}
              </p>
              <ButtonLink href={`/paiement?${qs}&student=${s.id}`} size="sm">
                Choisir
              </ButtonLink>
            </Card>
          );
        })}

        {students.length === 0 && (
          <Card>
            <p className="text-[13px] text-muted">
              Aucun enfant enregistré pour l&apos;instant — ajoutez-en un ci-dessous.
            </p>
          </Card>
        )}

        <Card className="border-dashed">
          <p className="text-[13px] font-semibold mb-3">+ Ajouter un enfant</p>
          <form action={addChildAction} className="flex flex-col gap-3">
            <input type="hidden" name="returnTo" value={currentUrl} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Prénom" name="firstName" required />
              <TextField label="Année de naissance (optionnel)" name="birthYear" type="number" min={1970} max={new Date().getFullYear()} />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="self-start">
              Ajouter
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
