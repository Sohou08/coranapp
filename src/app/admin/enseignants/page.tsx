// File d'attente de vérification des enseignants. Chaque inscription
// "enseignant" crée déjà une ligne teacher_profiles (verified=false par
// défaut, via le déclencheur handle_new_user) — il n'y a donc qu'une seule
// liste ici, pas de distinction "candidat" / "compte" côté schéma réel.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDateShortFr } from "@/lib/format";
import { verifyTeacherAction } from "./actions";

type TeacherRow = {
  id: string;
  slug: string;
  headline: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

export default async function AdminEnseignantsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data } = await supabase
    .from("teacher_profiles")
    .select("id, slug, headline, city, country, created_at, profiles(first_name, last_name)")
    .eq("verified", false)
    .order("created_at", { ascending: true });

  const teachers = (data ?? []) as unknown as TeacherRow[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Enseignants</h1>

      <section>
        <h2 className="text-[16px] mb-3">En attente de vérification</h2>
        {teachers.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucun enseignant en attente pour l&apos;instant.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {teachers.map((t) => (
              <Card key={t.id} className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-[15px]">
                    {t.profiles?.first_name} {t.profiles?.last_name}
                  </p>
                  <p className="text-[12px] text-muted">
                    {t.headline ?? "Sans titre"} · {t.city ?? "—"}, {t.country ?? "—"}
                  </p>
                  <p className="text-[11px] text-muted">
                    Inscrit le {formatDateShortFr(t.created_at)}
                  </p>
                </div>
                <form action={verifyTeacherAction}>
                  <input type="hidden" name="teacherId" value={t.id} />
                  <Button type="submit" size="sm">
                    Vérifier &amp; activer
                  </Button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
