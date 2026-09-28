import Link from "next/link";
import { Card, Badge } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { listTeachers, listSubjects, COUNTRY_OPTIONS } from "./_lib/queries";
import { FORMAT_OPTIONS, FORMAT_LABELS } from "@/app/enseignant/_lib/queries";

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient();
  const [featured, subjects] = await Promise.all([
    listTeachers(supabase, { limit: 3 }),
    listSubjects(supabase),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-14 grid md:grid-cols-2 gap-10 items-start">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent-700)] mb-3">
            Cours de Coran — en ligne et en présentiel
          </p>
          <h1 className="text-[40px] md:text-[48px] mb-4">
            Trouvez votre enseignant de Coran.
          </h1>
          <p className="text-[16px] text-muted max-w-md">
            Des enseignants aux profils vérifiés, des cours adaptés à votre
            niveau, et un espace unique pour réserver, apprendre et suivre
            votre progression.
          </p>
          <div className="mt-6 flex gap-3">
            <ButtonLink href="/recherche">Trouver un enseignant</ButtonLink>
            <ButtonLink href="/enseigner" variant="secondary">
              Devenir enseignant
            </ButtonLink>
          </div>
        </div>

        <Card>
          <form action="/recherche" className="flex flex-col gap-4">
            <h2 className="text-[18px]">Que souhaitez-vous apprendre&nbsp;?</h2>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Type de cours" name="matiere" defaultValue="">
                <option value="">Tous les cours</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Format" name="format" defaultValue="">
                <option value="">Tous les formats</option>
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Pays / région" name="pays" defaultValue="">
                <option value="">Tous les pays</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
            </div>
            <ButtonLink href="/recherche" className="mt-1">
              Rechercher un enseignant
            </ButtonLink>
          </form>
        </Card>
      </section>

      {/* Enseignants en avant */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-[24px]">Enseignants recommandés</h2>
          <Link
            href="/recherche"
            className="text-[13px] font-semibold text-[var(--color-accent-800)]"
          >
            Voir tous les enseignants →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {featured.map((t) => (
            <Link key={t.id} href={`/enseignants/${t.slug}`}>
              <Card className="h-full hover:shadow-[var(--shadow-md)] transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 flex items-center justify-center bg-[var(--color-accent-700)] text-white font-bold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-[15px] flex items-center gap-1.5">
                      {t.name}
                      {t.verified && <Badge>Vérifié</Badge>}
                    </p>
                    <p className="text-[12px] text-muted">
                      {t.city}, {t.country}
                    </p>
                  </div>
                </div>
                <p className="text-[13px] text-muted mb-3">{t.headline}</p>
                <div className="flex items-center justify-between text-[13px]">
                  <span>
                    ⭐ {t.rating || "—"} ({t.reviewCount} avis)
                  </span>
                  <span className="font-bold">{t.priceHour} €/h</span>
                </div>
              </Card>
            </Link>
          ))}
          {featured.length === 0 && (
            <Card>
              <p className="text-[13px] text-muted">Aucun enseignant publié pour l&apos;instant.</p>
            </Card>
          )}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-white border-t border-[var(--color-divider)]">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-[24px] mb-8">Comment ça marche</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              ["1", "Trouvez", "Recherchez un enseignant selon niveau, langue et disponibilités."],
              ["2", "Réservez", "Choisissez un créneau et payez en ligne en toute sécurité."],
              ["3", "Apprenez", "Suivez le cours dans la salle virtuelle intégrée, sans lien externe."],
              ["4", "Progressez", "Consultez les comptes rendus et suivez la progression après chaque cours."],
            ].map(([n, title, desc]) => (
              <div key={n}>
                <div className="w-9 h-9 flex items-center justify-center bg-[var(--color-accent-800)] text-white font-extrabold mb-3">
                  {n}
                </div>
                <h3 className="text-[16px] mb-1">{title}</h3>
                <p className="text-[13px] text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
