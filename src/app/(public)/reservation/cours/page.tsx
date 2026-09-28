import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { StepIndicator } from "@/components/site/StepIndicator";
import { NotFoundCard } from "@/components/site/NotFoundCard";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getTeacherBySlug, getTeacherSubjects } from "../../_lib/queries";
import { FORMAT_LABELS } from "@/app/enseignant/_lib/queries";

export default async function ReservationCoursPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const teacherSlug = typeof sp.teacher === "string" ? sp.teacher : "";

  const supabase = await createServerSupabaseClient();
  const teacher = teacherSlug ? await getTeacherBySlug(supabase, teacherSlug) : null;
  if (!teacher) return <NotFoundCard />;

  const subjects = await getTeacherSubjects(supabase, teacher.id);
  const formatsLabel = teacher.formats.map((f) => FORMAT_LABELS[f] ?? f).join(", ") || "—";

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <StepIndicator current={0} />
      <h1 className="text-[24px] mb-1">Choisissez un cours</h1>
      <p className="text-[14px] text-muted mb-6">
        Avec {teacher.name} · {teacher.priceHour} €/heure
      </p>
      <div className="flex flex-col gap-3">
        {subjects.map((subject) => (
          <Card key={subject.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[15px]">{subject.label}</p>
              <p className="text-[12px] text-muted">Cours individuel · {formatsLabel}</p>
            </div>
            <ButtonLink
              href={`/reservation/date?teacher=${teacher.slug}&subject=${subject.id}`}
              size="sm"
            >
              Choisir
            </ButtonLink>
          </Card>
        ))}
        {subjects.length === 0 && (
          <Card>
            <p className="text-[13px] text-muted">
              Cet enseignant n&apos;a pas encore renseigné de matières enseignées.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
