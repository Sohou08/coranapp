import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { StepIndicator } from "@/components/site/StepIndicator";
import { NotFoundCard } from "@/components/site/NotFoundCard";
import { PayButton } from "@/components/site/PayButton";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getTeacherBySlug } from "../_lib/queries";
import { formatDateTimeFr, formatPrice } from "@/lib/format";
import { isWaveConfigured } from "@/lib/wave/server";

export default async function PaiementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const teacherSlug = typeof sp.teacher === "string" ? sp.teacher : "";
  const subjectId = typeof sp.subject === "string" ? sp.subject : "";
  const start = typeof sp.start === "string" ? sp.start : "";
  const studentId = typeof sp.student === "string" ? sp.student : "";

  if (!teacherSlug || !subjectId || !start || !studentId) return <NotFoundCard />;

  const currentUrl = `/paiement?teacher=${teacherSlug}&subject=${subjectId}&start=${encodeURIComponent(start)}&student=${studentId}`;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/connexion?error=${encodeURIComponent("Connectez-vous pour finaliser le paiement.")}&next=${encodeURIComponent(currentUrl)}`);
  }

  const teacher = await getTeacherBySlug(supabase, teacherSlug);
  if (!teacher) return <NotFoundCard />;

  const [{ data: subject }, { data: student }] = await Promise.all([
    supabase.from("subjects").select("label").eq("id", subjectId).maybeSingle(),
    supabase
      .from("students")
      .select("id, first_name, parent_id, self_profile_id")
      .eq("id", studentId)
      .maybeSingle(),
  ]);

  if (!student || (student.parent_id !== user.id && student.self_profile_id !== user.id)) {
    return <NotFoundCard />;
  }

  const isSelf = student.self_profile_id === user.id;
  const waveAvailable = isWaveConfigured();

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <StepIndicator current={3} />
      <h1 className="text-[24px] mb-6">Paiement</h1>

      <div className="grid md:grid-cols-[1fr_260px] gap-6">
        <Card>
          <h2 className="text-[15px] mb-3">Paiement sécurisé</h2>
          <p className="text-[13px] text-muted">
            {waveAvailable
              ? "Choisissez votre moyen de paiement, puis finalisez sur la page sécurisée de Stripe ou de Wave. Sanad ne stocke jamais vos données de paiement."
              : "En cliquant sur « Payer et confirmer », vous serez redirigé·e vers Stripe pour saisir vos coordonnées de paiement. Sanad ne stocke jamais vos données de carte."}
          </p>
          <PayButton
            teacher={teacher.slug}
            subject={subjectId}
            start={start}
            student={studentId}
            waveAvailable={waveAvailable}
          />
        </Card>

        <Card>
          <h2 className="text-[14px] mb-3">Récapitulatif</h2>
          <dl className="text-[13px] flex flex-col gap-2">
            <div className="flex justify-between">
              <dt className="text-muted">Enseignant</dt>
              <dd>{teacher.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Cours</dt>
              <dd>{subject?.label ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Créneau</dt>
              <dd className="text-right">{formatDateTimeFr(start)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Élève</dt>
              <dd>{isSelf ? "Moi-même" : student.first_name}</dd>
            </div>
            <hr className="divider my-1" />
            <div className="flex justify-between font-bold text-[15px]">
              <dt>Total</dt>
              <dd>{formatPrice(teacher.priceHour)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
