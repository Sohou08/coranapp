import { notFound } from "next/navigation";
import { Card, Badge } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getTeacherBySlug, getTeacherReviews } from "../../_lib/queries";
import { FORMAT_LABELS } from "@/app/enseignant/_lib/queries";
import { formatDateShortFr } from "@/lib/format";

// Données dynamiques (Supabase) : pas de generateStaticParams — la liste
// des enseignants change en continu, la page est rendue à la demande (ƒ)
// plutôt que pré-générée à la construction.
export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createServerSupabaseClient();
  const teacher = await getTeacherBySlug(supabase, slug);
  if (!teacher) notFound();

  const reviews = await getTeacherReviews(supabase, teacher.id);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 grid md:grid-cols-[1fr_320px] gap-8">
      <div className="flex flex-col gap-6">
        {/* En-tête profil */}
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 shrink-0 flex items-center justify-center bg-[var(--color-accent-700)] text-white font-bold text-[24px]">
            {teacher.initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px]">{teacher.name}</h1>
              {teacher.verified && <Badge>Profil vérifié</Badge>}
            </div>
            <p className="text-[15px] text-muted">{teacher.headline}</p>
            <p className="text-[13px] text-muted mt-1">
              {teacher.city}, {teacher.country}
              {teacher.yearsExperience ? ` · ${teacher.yearsExperience} ans d'expérience` : ""}
            </p>
          </div>
        </div>

        <Card>
          <h2 className="text-[16px] mb-2">Présentation</h2>
          <p className="text-[14px] text-muted">{teacher.bio || "Pas encore de présentation."}</p>
        </Card>

        <Card>
          <h2 className="text-[16px] mb-3">Spécialités &amp; modalités</h2>
          <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
            <dt className="text-muted">Cours proposés</dt>
            <dd className="flex flex-wrap gap-1.5">
              {teacher.subjects.length > 0 ? (
                teacher.subjects.map((s) => (
                  <Badge key={s.id} tone="neutral">
                    {s.label}
                  </Badge>
                ))
              ) : (
                <span className="text-muted">—</span>
              )}
            </dd>
            <dt className="text-muted">Langues</dt>
            <dd>{teacher.languages.length > 0 ? teacher.languages.join(", ") : "—"}</dd>
            <dt className="text-muted">Format</dt>
            <dd>
              {teacher.formats.length > 0
                ? teacher.formats.map((f) => FORMAT_LABELS[f] ?? f).join(", ")
                : "—"}
            </dd>
          </dl>
        </Card>

        <Card>
          <h2 className="text-[16px] mb-3">Avis ({teacher.reviewCount})</h2>
          {reviews.length === 0 && (
            <p className="text-[13px] text-muted">Pas encore d&apos;avis publié.</p>
          )}
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="border-t border-[var(--color-divider)] pt-3 first:border-0 first:pt-0">
                <p className="text-[13px] font-semibold">
                  {r.authorName} — {"⭐".repeat(r.rating)}
                  <span className="text-muted font-normal"> · {formatDateShortFr(r.createdAt)}</span>
                </p>
                {r.comment && <p className="text-[13px] text-muted">{r.comment}</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Colonne réservation */}
      <div>
        <Card className="sticky top-20">
          <p className="text-[24px] font-extrabold mb-1">
            {teacher.priceHour} €<span className="text-[14px] font-normal">/heure</span>
          </p>
          <p className="text-[13px] text-muted mb-4">
            ⭐ {teacher.rating || "—"} · {teacher.reviewCount} avis
          </p>
          <ButtonLink
            href={`/reservation/cours?teacher=${teacher.slug}`}
            className="w-full"
          >
            Réserver un cours
          </ButtonLink>
          <p className="text-[11px] text-muted mt-3">
            Le paiement et le cours se déroulent entièrement sur Sanad — les
            coordonnées personnelles ne sont jamais échangées.
          </p>
        </Card>
      </div>
    </div>
  );
}
