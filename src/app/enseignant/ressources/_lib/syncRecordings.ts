// Import automatique des enregistrements de cours Daily.co dans la
// médiathèque de l'enseignant — même logique que le fallback synchrone de
// src/app/enseignant/revenus/page.tsx pour Stripe Connect (pas de webhook
// Daily configuré pour l'instant, faute d'URL publique — voir
// STRIPE_WEBHOOK_SECRET dans .env.local pour le précédent identique) : on
// vérifie directement auprès de Daily à chaque chargement de la page
// "Mes ressources" plutôt que d'attendre une notification.
//
// Idempotence : on ne traite que les bookings passés ayant un
// video_room_id, et pour chacun on ne réinsère pas un enregistrement déjà
// représenté par une ligne resources (jointure sur resources.booking_id +
// resources.source = 'lesson_recording' — une salle Daily n'a normalement
// qu'un seul enregistrement "finished" par cours, mais on gère aussi le cas
// de plusieurs segments en les important tous, un par recording_id).
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDailyRecordingsForRoom } from "@/lib/daily/server";
import { formatDateShortFr } from "@/lib/format";

type PastBookingWithRoom = {
  id: string;
  video_room_id: string;
  student_id: string;
  starts_at: string;
  subjects: { label: string } | null;
};

// `supabase` = client RLS de l'enseignant connecté (lecture de ses propres
// bookings/resources, déjà autorisée par les policies existantes).
// L'écriture (insert resources + resource_shares) passe par le client
// admin : `resources: owner write` autoriserait déjà l'enseignant à
// insérer ses propres ressources, mais `resource_shares: owner manage`
// exige que la ressource existe déjà au moment du insert (sous-requête sur
// resources.owner_id) — on utilise donc le client admin pour les deux
// écritures de ce flux automatique, exécutées ensemble, pour éviter tout
// ordre de policy fragile. Aucune vérification d'appartenance
// supplémentaire n'est nécessaire ici : `teacherId` vient de
// `auth.getUser()` dans la page appelante, jamais d'une entrée utilisateur.
export async function syncLessonRecordings(
  supabase: SupabaseClient,
  teacherId: string
): Promise<void> {
  const nowIso = new Date().toISOString();

  const { data: pastBookings } = await supabase
    .from("bookings")
    .select("id, video_room_id, student_id, starts_at, subjects(label)")
    .eq("teacher_id", teacherId)
    .not("video_room_id", "is", null)
    .lt("starts_at", nowIso);

  const bookings = (pastBookings ?? []) as unknown as PastBookingWithRoom[];
  if (bookings.length === 0) return;

  const bookingIds = bookings.map((b) => b.id);
  const { data: existingResources } = await supabase
    .from("resources")
    .select("booking_id")
    .eq("owner_id", teacherId)
    .eq("source", "lesson_recording")
    .in("booking_id", bookingIds);
  const alreadyImportedBookingIds = new Set(
    (existingResources ?? []).map((r) => r.booking_id).filter(Boolean)
  );

  const toImport = bookings.filter((b) => !alreadyImportedBookingIds.has(b.id));
  if (toImport.length === 0) return;

  const admin = createAdminClient();

  for (const booking of toImport) {
    let recordings;
    try {
      recordings = await listDailyRecordingsForRoom(booking.video_room_id);
    } catch {
      // Un problème réseau ou une salle déjà supprimée côté Daily ne doit
      // pas bloquer le chargement de la page pour les autres bookings —
      // on passe au suivant, la synchronisation réessaiera au prochain
      // chargement.
      continue;
    }

    const finished = recordings.filter((r) => r.status === "finished");
    for (const recording of finished) {
      const title = `Enregistrement — ${booking.subjects?.label ?? "Cours"} du ${formatDateShortFr(
        booking.starts_at
      )}`;

      const { data: inserted, error: insertError } = await admin
        .from("resources")
        .insert({
          owner_id: teacherId,
          title,
          // Pas une URL directe : les liens Daily expirent. On stocke
          // l'identifiant stable de l'enregistrement et on résout un lien
          // frais à la demande via /api/resources/[id]/open (voir
          // getDailyRecordingAccessLink).
          file_path: recording.id,
          mime_type: "video/mp4",
          is_shared: false,
          source: "lesson_recording",
          booking_id: booking.id,
        })
        .select("id")
        .single();

      if (insertError || !inserted) continue;

      // Zéro action manuelle pour l'enseignant : la famille doit voir
      // l'enregistrement immédiatement, comme pour tout partage ciblé via
      // resource_shares (voir enseignant/ressources/actions.ts).
      await admin.from("resource_shares").insert({
        resource_id: inserted.id,
        student_id: booking.student_id,
      });
    }
  }
}
