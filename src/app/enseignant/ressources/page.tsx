// Ressources de l'enseignant + partage ciblé par élève (resource_shares).
// Pas d'upload de fichier réel dans cette version — voir actions.ts.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { addResourceAction, toggleResourceShareAction } from "./actions";
import { syncLessonRecordings } from "./_lib/syncRecordings";

type ResourceRow = {
  id: string;
  title: string;
  mime_type: string | null;
  is_shared: boolean;
  source: string;
};
type ShareRow = { resource_id: string; student_id: string };
type StudentOption = { id: string; first_name: string };

export default async function EnseignantRessourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Fallback synchrone (pas de webhook Daily — voir le même schéma pour
  // Stripe Connect dans enseignant/revenus/page.tsx) : importe les
  // enregistrements de cours terminés avant d'afficher la liste, pour que
  // les nouveaux enregistrements apparaissent sans action manuelle.
  await syncLessonRecordings(supabase, user.id);

  const [resourcesRes, bookingStudentsRes] = await Promise.all([
    supabase
      .from("resources")
      .select("id, title, mime_type, is_shared, source")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("bookings").select("students(id, first_name)").eq("teacher_id", user.id),
  ]);

  const resources = (resourcesRes.data ?? []) as ResourceRow[];
  const resourceIds = resources.map((r) => r.id);

  let shares: ShareRow[] = [];
  if (resourceIds.length) {
    const { data } = await supabase
      .from("resource_shares")
      .select("resource_id, student_id")
      .in("resource_id", resourceIds);
    shares = data ?? [];
  }
  const sharesByResource = new Map<string, Set<string>>();
  for (const s of shares) {
    if (!sharesByResource.has(s.resource_id)) sharesByResource.set(s.resource_id, new Set());
    sharesByResource.get(s.resource_id)!.add(s.student_id);
  }

  const rawStudents = (bookingStudentsRes.data ?? []) as unknown as Array<{
    students: StudentOption | null;
  }>;
  const studentsSeen = new Map<string, StudentOption>();
  for (const row of rawStudents) {
    if (row.students) studentsSeen.set(row.students.id, row.students);
  }
  const students = Array.from(studentsSeen.values());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Mes ressources</h1>

      {typeof error === "string" && (
        <Card className="border-red-300">
          <p className="text-[13px] text-red-700">{error}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-[15px] mb-3">Ajouter une ressource</h2>
        <form action={addResourceAction} className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
          <TextField label="Titre" name="title" required placeholder="Ex. Fiche Tajwid — Noun sakinah" />
          <TextField label="Type / format" name="mimeType" placeholder="Ex. PDF, vidéo, audio" />
          <label className="flex items-center gap-2 text-[13px] pb-3">
            <input type="checkbox" name="isShared" />
            Partager avec toute la plateforme
          </label>
          <Button type="submit">Ajouter</Button>
        </form>
        <p className="text-[11px] text-muted mt-2">
          L&apos;upload de fichier réel (Supabase Storage) est prévu dans un prochain lot — cette
          ressource n&apos;enregistre pour l&apos;instant que ses métadonnées.
        </p>
      </Card>

      <section>
        <h2 className="text-[16px] mb-3">Mes ressources</h2>
        {resources.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucune ressource pour l&apos;instant.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {resources.map((r) => {
              const sharedWith = sharesByResource.get(r.id) ?? new Set<string>();
              return (
                <Card key={r.id} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="font-semibold text-[15px]">{r.title}</p>
                    <div className="flex items-center gap-2">
                      {r.source === "lesson_recording" && <Badge>Enregistrement auto</Badge>}
                      {r.is_shared && <Badge>Plateforme</Badge>}
                      <Badge tone="neutral">{r.mime_type ?? "Fichier"}</Badge>
                      {r.source === "lesson_recording" && (
                        // <a> classique plutôt que ButtonLink (next/link) :
                        // cette URL n'est pas une page mais une route API
                        // qui répond par une redirection HTTP 307 vers un
                        // lien Daily — une vraie navigation de document,
                        // pas une navigation interne App Router.
                        <a
                          href={`/api/resources/${r.id}/open`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] font-extrabold uppercase tracking-wide px-4 py-2 border border-[var(--color-divider)] hover:bg-[var(--color-neutral-100)] transition-colors"
                        >
                          Ouvrir
                        </a>
                      )}
                    </div>
                  </div>
                  {students.length === 0 ? (
                    <p className="text-[12px] text-muted">
                      Aucun élève à qui partager cette ressource pour l&apos;instant.
                    </p>
                  ) : (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">
                        Partager avec
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {students.map((s) => {
                          const shared = sharedWith.has(s.id);
                          return (
                            <form key={s.id} action={toggleResourceShareAction}>
                              <input type="hidden" name="resourceId" value={r.id} />
                              <input type="hidden" name="studentId" value={s.id} />
                              <input type="hidden" name="shared" value={String(shared)} />
                              <button
                                type="submit"
                                className={`text-[12px] font-semibold px-3 py-1.5 border transition-colors ${
                                  shared
                                    ? "bg-[var(--color-accent-800)] text-white border-[var(--color-accent-800)]"
                                    : "border-[var(--color-divider)] hover:bg-[var(--color-neutral-100)]"
                                }`}
                              >
                                {s.first_name}
                              </button>
                            </form>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
