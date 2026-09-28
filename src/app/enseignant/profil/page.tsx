// Formulaire d'édition du profil enseignant public (teacher_profiles +
// matières enseignées via teacher_subjects).
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import {
  FORMAT_LABELS,
  FORMAT_OPTIONS,
  LANGUAGE_OPTIONS,
} from "../_lib/queries";
import { updateTeacherProfileAction } from "./actions";

type Subject = { id: string; label: string };

export default async function EnseignantProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error, success } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [profileRes, subjectsRes, teacherSubjectsRes] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select(
        "slug, headline, bio, city, country, price_hour, years_experience, languages, formats"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("subjects").select("id, label").order("label"),
    supabase.from("teacher_subjects").select("subject_id").eq("teacher_id", user.id),
  ]);

  const profile = profileRes.data;
  const subjects = (subjectsRes.data ?? []) as Subject[];
  const selectedSubjectIds = new Set(
    (teacherSubjectsRes.data ?? []).map((r) => r.subject_id as string)
  );

  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-[26px]">Mon profil</h1>
        <Card>
          <p className="text-[13px] text-muted">
            Profil enseignant introuvable pour ce compte.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[26px]">Mon profil</h1>
        <Link
          href={`/enseignants/${profile.slug}`}
          className="text-[12px] font-semibold text-[var(--color-accent-800)] underline"
        >
          Voir ma fiche publique
        </Link>
      </div>

      {typeof error === "string" && (
        <Card className="border-red-300">
          <p className="text-[13px] text-red-700">{error}</p>
        </Card>
      )}
      {typeof success === "string" && (
        <Card className="border-[var(--color-accent-700)]">
          <p className="text-[13px] text-[var(--color-accent-800)]">Profil mis à jour.</p>
        </Card>
      )}

      <Card>
        <form action={updateTeacherProfileAction} className="flex flex-col gap-5">
          <TextField
            label="Titre / accroche"
            name="headline"
            defaultValue={profile.headline ?? ""}
            placeholder="Ex. Professeur de Tajwid diplômé, 10 ans d'expérience"
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-[var(--color-neutral-700)]">
              Bio
            </span>
            <textarea
              name="bio"
              rows={5}
              defaultValue={profile.bio ?? ""}
              className="border border-[var(--color-divider)] bg-white px-3 py-2.5 text-[14px] outline-none focus-visible:border-[var(--color-accent-700)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-200)]"
            />
          </label>

          <div className="grid md:grid-cols-2 gap-4">
            <TextField label="Ville" name="city" defaultValue={profile.city ?? ""} />
            <TextField label="Pays" name="country" defaultValue={profile.country ?? ""} />
            <TextField
              label="Tarif horaire (€)"
              name="priceHour"
              type="number"
              step="0.01"
              min="0"
              defaultValue={profile.price_hour ?? 0}
            />
            <TextField
              label="Années d'expérience"
              name="yearsExperience"
              type="number"
              min="0"
              defaultValue={profile.years_experience ?? ""}
            />
          </div>

          <div>
            <p className="text-[12px] font-semibold text-[var(--color-neutral-700)] mb-2">
              Langues parlées
            </p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <label
                  key={lang}
                  className="flex items-center gap-2 border border-[var(--color-divider)] px-3 py-2 text-[13px] cursor-pointer has-[:checked]:border-[var(--color-accent-700)] has-[:checked]:bg-[var(--color-accent-100)]"
                >
                  <input
                    type="checkbox"
                    name="languages"
                    value={lang}
                    defaultChecked={profile.languages?.includes(lang)}
                  />
                  {lang}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-[var(--color-neutral-700)] mb-2">
              Formats proposés
            </p>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map((fmt) => (
                <label
                  key={fmt}
                  className="flex items-center gap-2 border border-[var(--color-divider)] px-3 py-2 text-[13px] cursor-pointer has-[:checked]:border-[var(--color-accent-700)] has-[:checked]:bg-[var(--color-accent-100)]"
                >
                  <input
                    type="checkbox"
                    name="formats"
                    value={fmt}
                    defaultChecked={profile.formats?.includes(fmt)}
                  />
                  {FORMAT_LABELS[fmt]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-[var(--color-neutral-700)] mb-2">
              Matières enseignées
            </p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 border border-[var(--color-divider)] px-3 py-2 text-[13px] cursor-pointer has-[:checked]:border-[var(--color-accent-700)] has-[:checked]:bg-[var(--color-accent-100)]"
                >
                  <input
                    type="checkbox"
                    name="subjects"
                    value={s.id}
                    defaultChecked={selectedSubjectIds.has(s.id)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
