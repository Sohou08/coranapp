import Link from "next/link";
import { Card, Badge } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { listTeachers, listSubjects, COUNTRY_OPTIONS } from "../_lib/queries";
import { FORMAT_OPTIONS, FORMAT_LABELS } from "@/app/enseignant/_lib/queries";

// Server Component : searchParams est une Promise sous ce Next.js, à
// attendre avant lecture (voir node_modules/next/dist/docs).
export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const matiere = typeof sp.matiere === "string" ? sp.matiere : "";
  const format = typeof sp.format === "string" ? sp.format : "";
  const pays = typeof sp.pays === "string" ? sp.pays : "";

  const supabase = await createServerSupabaseClient();
  const [allTeachers, subjects] = await Promise.all([
    listTeachers(supabase),
    listSubjects(supabase),
  ]);

  // Petit jeu de données (quelques dizaines d'enseignants au plus pour
  // l'instant) : filtrer en JS après avoir tout chargé est plus simple et
  // suffisamment rapide plutôt que de complexifier la requête Supabase.
  const results = allTeachers.filter((t) => {
    if (matiere && !t.subjects.some((s) => s.slug === matiere)) return false;
    if (format && !t.formats.includes(format)) return false;
    if (pays && t.country !== pays) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 grid md:grid-cols-[260px_1fr] gap-8">
      {/* Filtres */}
      <aside>
        <Card>
          <form className="flex flex-col gap-4">
            <h2 className="text-[16px]">Filtres</h2>
            <SelectField label="Type de cours" name="matiere" defaultValue={matiere}>
              <option value="">Tous les cours</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </SelectField>
            <SelectField label="Format" name="format" defaultValue={format}>
              <option value="">Tous les formats</option>
              {FORMAT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABELS[f]}
                </option>
              ))}
            </SelectField>
            <SelectField label="Pays" name="pays" defaultValue={pays}>
              <option value="">Tous les pays</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
            <Button type="submit">Appliquer</Button>
          </form>
        </Card>
      </aside>

      {/* Résultats */}
      <div>
        <p className="text-[13px] text-muted mb-4">
          {results.length} enseignant{results.length > 1 ? "s" : ""} trouvé
          {results.length > 1 ? "s" : ""}
        </p>
        <div className="flex flex-col gap-4">
          {results.map((t) => (
            <Link key={t.id} href={`/enseignants/${t.slug}/`}>
              <Card className="hover:shadow-[var(--shadow-md)] transition-shadow">
                <div className="flex gap-4">
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-[var(--color-accent-700)] text-white font-bold text-[18px]">
                    {t.initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[16px]">{t.name}</p>
                      {t.verified && <Badge>Profil vérifié</Badge>}
                    </div>
                    <p className="text-[13px] text-muted mb-1">{t.headline}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.subjects.map((s) => (
                        <Badge key={s.id} tone="neutral">
                          {s.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] mb-1">
                      ⭐ {t.rating || "—"} ({t.reviewCount})
                    </p>
                    <p className="font-bold text-[16px]">{t.priceHour} €/h</p>
                    <p className="text-[12px] text-muted">
                      {t.city}, {t.country}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {results.length === 0 && (
            <Card>
              <p className="text-[14px] text-muted">
                Aucun enseignant ne correspond à ces critères pour le moment.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
