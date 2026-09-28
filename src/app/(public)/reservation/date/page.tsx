import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { StepIndicator } from "@/components/site/StepIndicator";
import { NotFoundCard } from "@/components/site/NotFoundCard";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getTeacherBySlug, getBookableSlots } from "../../_lib/queries";
import { formatDateTimeFr } from "@/lib/format";

export default async function ReservationDatePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const teacherSlug = typeof sp.teacher === "string" ? sp.teacher : "";
  const subjectId = typeof sp.subject === "string" ? sp.subject : "";

  const supabase = await createServerSupabaseClient();
  const teacher = teacherSlug ? await getTeacherBySlug(supabase, teacherSlug) : null;
  if (!teacher || !subjectId) return <NotFoundCard />;

  // Créneaux réservables des 14 prochains jours à partir de l'availability
  // réelle de l'enseignant, moins les créneaux déjà pris — voir
  // generateBookableSlots dans _lib/queries.ts pour la logique.
  const slots = await getBookableSlots(supabase, teacher.id);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <StepIndicator current={1} />
      <h1 className="text-[24px] mb-1">Choisissez un créneau</h1>
      <p className="text-[14px] text-muted mb-6">Avec {teacher.name}</p>
      {slots.length === 0 ? (
        <Card>
          <p className="text-[13px] text-muted">
            Aucun créneau disponible dans les 14 prochains jours pour cet enseignant.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {slots.map((slot) => (
            <Card key={slot.toISOString()} className="flex items-center justify-between">
              <p className="text-[14px] font-medium">{formatDateTimeFr(slot)}</p>
              <ButtonLink
                href={`/reservation/eleve?teacher=${teacher.slug}&subject=${subjectId}&start=${encodeURIComponent(
                  slot.toISOString()
                )}`}
                size="sm"
              >
                Choisir
              </ButtonLink>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
