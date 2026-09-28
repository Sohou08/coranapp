// Médiathèque : ressources visibles par la famille — partagées par la
// plateforme (is_shared = true), par un enseignant déjà réservé, ou
// partagées explicitement avec l'un des enfants via resource_shares (ajoutée
// pour l'espace enseignant).
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { getFamilyStudents } from "../_lib/queries";

type ResourceRow = {
  id: string;
  title: string;
  mime_type: string | null;
  is_shared: boolean;
  source: string;
  subjects: { label: string } | null;
  created_at: string;
};

export default async function EspaceMediathequePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const students = await getFamilyStudents(supabase, user.id);
  const studentIds = students.map((s) => s.id);

  let teacherIds: string[] = [];
  if (studentIds.length) {
    const { data: bookingRows } = await supabase
      .from("bookings")
      .select("teacher_id")
      .in("student_id", studentIds);
    teacherIds = Array.from(new Set((bookingRows ?? []).map((b) => b.teacher_id)));
  }

  // Ressources partagées explicitement avec l'un des enfants de la famille
  // (table resource_shares, ajoutée pour l'espace enseignant) — en plus des
  // règles pré-existantes (plateforme / enseignant déjà réservé).
  let sharedResourceIds: string[] = [];
  if (studentIds.length) {
    const { data: shareRows } = await supabase
      .from("resource_shares")
      .select("resource_id")
      .in("student_id", studentIds);
    sharedResourceIds = Array.from(new Set((shareRows ?? []).map((r) => r.resource_id)));
  }

  const orFilters = [
    "is_shared.eq.true",
    teacherIds.length ? `owner_id.in.(${teacherIds.join(",")})` : null,
    sharedResourceIds.length ? `id.in.(${sharedResourceIds.join(",")})` : null,
  ].filter(Boolean) as string[];

  const { data } = await supabase
    .from("resources")
    .select("id, title, mime_type, is_shared, source, subjects(label), created_at")
    .or(orFilters.join(","))
    .order("created_at", { ascending: false });

  const resources = (data ?? []) as unknown as ResourceRow[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Médiathèque</h1>

      {resources.length === 0 ? (
        <Card>
          <p className="text-[13px] text-muted">Aucune ressource disponible pour l&apos;instant.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {resources.map((r) => (
            <Card key={r.id} className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-[14px] font-semibold">{r.title}</p>
                <p className="text-[12px] text-muted">
                  {r.subjects?.label ?? "Général"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.source === "lesson_recording" && <Badge>Enregistrement de cours</Badge>}
                {r.is_shared && <Badge>Plateforme</Badge>}
                <Badge tone="neutral">{r.mime_type ?? "Fichier"}</Badge>
                {r.source === "lesson_recording" && (
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
