// Salle de cours vidéo intégrée pour un booking donné. Get-or-create la
// salle Daily (bookings.video_room_id), génère un jeton de participation
// pour l'utilisateur connecté, et embarque l'appel dans notre propre page
// via le SDK JS Daily (voir CallFrame.tsx) — jamais de redirection vers un
// daily.co hébergé, pour préserver le principe anti-désintermédiation de
// Sanad.
//
// Protection : pas d'entrée dans src/proxy.ts (qui ne protège que
// /espace, /enseignant, /admin — voir la consigne de la tâche) ; on
// applique ici le même schéma de redirection en page que le tunnel public
// (voir src/app/(public)/paiement/page.tsx) plutôt que de toucher un
// fichier partagé entre plusieurs sessions.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { NotFoundCard } from "@/components/site/NotFoundCard";
import { ButtonLink } from "@/components/ui/Button";
import { formatDateTimeFr } from "@/lib/format";
import {
  createDailyMeetingToken,
  createDailyRoom,
  getDailyRoom,
  getRoomExpiryForLesson,
} from "@/lib/daily/server";
import { CallFrame } from "./CallFrame";

type BookingRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  starts_at: string;
  ends_at: string | null;
  duration_minutes: number;
  status: string;
  video_room_id: string | null;
  subjects: { label: string } | null;
  students: {
    id: string;
    first_name: string;
    parent_id: string | null;
    self_profile_id: string | null;
  } | null;
  teacher_profiles: {
    id: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

// Fenêtre de participation : on ouvre la salle 15 minutes avant le début
// (le temps d'installer sa caméra, tester son micro…) et on la referme 30
// minutes après la fin prévue (marge pour un cours qui déborde un peu,
// sans laisser la salle ouverte indéfiniment comme le permettrait la seule
// expiration Daily, réglée elle bien plus large — voir
// getRoomExpiryForLesson).
const JOIN_WINDOW_BEFORE_MS = 15 * 60 * 1000;
const JOIN_WINDOW_AFTER_MS = 30 * 60 * 1000;

export default async function SallePage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/connexion?next=${encodeURIComponent(`/salle/${bookingId}`)}`);
  }

  // RLS ("bookings: participants") restreint déjà le SELECT aux lignes où
  // l'utilisateur connecté est soit le teacher_id, soit le parent/élève du
  // student du booking — une requête simple avec le client "anon + cookies"
  // renvoie donc naturellement 0 ligne pour quiconque n'est pas concerné,
  // sans avoir à ré-implémenter cette vérification ici.
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(
      "id, teacher_id, student_id, starts_at, ends_at, duration_minutes, status, video_room_id, subjects(label), students(id, first_name, parent_id, self_profile_id), teacher_profiles(id, profiles(first_name, last_name))"
    )
    .eq("id", bookingId)
    .maybeSingle();

  const booking = bookingData as unknown as BookingRow | null;

  if (!booking) {
    return <NotFoundCard />;
  }

  const isTeacher = booking.teacher_id === user.id;
  const isGuardian =
    booking.students?.parent_id === user.id || booking.students?.self_profile_id === user.id;
  if (!isTeacher && !isGuardian) {
    // Ne devrait pas arriver (RLS l'exclut déjà) mais on garde une garde
    // explicite par défense en profondeur.
    return <NotFoundCard />;
  }

  const startsAt = new Date(booking.starts_at);
  const endsAt = booking.ends_at
    ? new Date(booking.ends_at)
    : new Date(startsAt.getTime() + booking.duration_minutes * 60 * 1000);
  const now = new Date();
  const joinOpensAt = new Date(startsAt.getTime() - JOIN_WINDOW_BEFORE_MS);
  const joinClosesAt = new Date(endsAt.getTime() + JOIN_WINDOW_AFTER_MS);

  const subjectLabel = booking.subjects?.label ?? "Cours";
  const teacherName = booking.teacher_profiles?.profiles
    ? `${booking.teacher_profiles.profiles.first_name ?? ""} ${
        booking.teacher_profiles.profiles.last_name ?? ""
      }`.trim()
    : "Enseignant";

  const header = (
    <div>
      <p className="text-[13px] text-muted">{formatDateTimeFr(booking.starts_at)}</p>
      <h1 className="text-[22px]">
        {subjectLabel} {isTeacher ? `avec ${booking.students?.first_name ?? "l'élève"}` : `avec ${teacherName}`}
      </h1>
    </div>
  );

  if (booking.status === "cancelled") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8 flex flex-col gap-4">
        {header}
        <Card>
          <p className="text-[13px] text-muted">Ce cours a été annulé.</p>
        </Card>
      </div>
    );
  }

  if (now < joinOpensAt) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8 flex flex-col gap-4">
        {header}
        <Card>
          <p className="text-[14px] font-semibold mb-1">Ce n&apos;est pas encore l&apos;heure</p>
          <p className="text-[13px] text-muted">
            La salle ouvre 15 minutes avant le début du cours, à {formatDateTimeFr(joinOpensAt.toISOString())}.
          </p>
        </Card>
      </div>
    );
  }

  if (now > joinClosesAt) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8 flex flex-col gap-4">
        {header}
        <Card>
          <p className="text-[14px] font-semibold mb-1">Ce cours est terminé</p>
          <p className="text-[13px] text-muted">
            La salle vidéo de ce cours n&apos;est plus accessible.
            {isTeacher && (
              <>
                {" "}
                Retrouvez l&apos;enregistrement dans{" "}
                <a href="/enseignant/ressources" className="underline text-[var(--color-accent-800)]">
                  Mes ressources
                </a>
                .
              </>
            )}
          </p>
        </Card>
      </div>
    );
  }

  // Get-or-create de la salle Daily. `bookings` n'a pas de policy RLS
  // UPDATE utilisable par un participant (seulement INSERT pour la famille
  // et SELECT pour les participants, voir pg_policies) — même situation que
  // la création du booking dans
  // src/app/(public)/paiement/actions.ts. On suit exactement le même
  // schéma choisi là-bas plutôt que d'ajouter une nouvelle policy RLS : on
  // a déjà vérifié explicitement ci-dessus (isTeacher/isGuardian) que
  // l'utilisateur connecté est bien participant de CE booking précis, donc
  // l'écriture via le client admin (service_role) est sûre.
  let roomName: string;
  let roomUrl: string;
  if (!booking.video_room_id) {
    const admin = createAdminClient();
    const room = await createDailyRoom({
      roomName: `sanad-${booking.id}`,
      expiresAt: getRoomExpiryForLesson(endsAt),
    });
    roomName = room.name;
    roomUrl = room.url;

    // Une deuxième personne qui arrive en même temps pourrait relancer une
    // création si on ne revérifie pas — on écrit uniquement si la colonne
    // est toujours vide, pour ne pas écraser une salle déjà créée par
    // l'autre participant entre-temps.
    await admin
      .from("bookings")
      .update({ video_room_id: roomName })
      .eq("id", booking.id)
      .is("video_room_id", null);

    // On relit au cas où la mise à jour ci-dessus a été perdante (l'autre
    // participant a écrit en premier) — pour que les deux utilisent la
    // même salle Daily plutôt que deux salles distinctes.
    const { data: refreshed } = await admin
      .from("bookings")
      .select("video_room_id")
      .eq("id", booking.id)
      .single();
    if (refreshed?.video_room_id && refreshed.video_room_id !== roomName) {
      roomName = refreshed.video_room_id;
      const existing = await getDailyRoom(roomName);
      if (existing) roomUrl = existing.url;
    }
  } else {
    // Salle déjà créée par un participant précédent (ou lors d'une visite
    // antérieure) — on ne recrée rien, on récupère juste son URL réelle
    // auprès de Daily plutôt que de la reconstruire nous-mêmes (le
    // sous-domaine dépend du compte Daily, on ne veut pas le deviner).
    roomName = booking.video_room_id;
    const existing = await getDailyRoom(roomName);
    if (!existing) {
      // Cas limite : la salle a expiré côté Daily (properties.exp dépassé,
      // ou supprimée manuellement) alors que le booking pointe toujours
      // vers son ancien nom. On affiche un message plutôt que de planter —
      // recréer une salle du même nom n'est pas garanti de fonctionner.
      return (
        <div className="mx-auto max-w-2xl px-5 py-8 flex flex-col gap-4">
          {header}
          <Card>
            <p className="text-[13px] text-muted">
              La salle vidéo de ce cours a expiré. Contactez l&apos;équipe Sanad si le cours est
              toujours à venir.
            </p>
          </Card>
        </div>
      );
    }
    roomUrl = existing.url;
  }

  const userName =
    (isTeacher ? teacherName : booking.students?.first_name) || "Participant";

  const { token } = await createDailyMeetingToken({
    roomName,
    userName,
    isOwner: isTeacher,
    // Jeton valable jusqu'à la fermeture de la fenêtre de participation —
    // pas besoin qu'il survive plus longtemps.
    expiresAt: joinClosesAt,
  });

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 flex flex-col gap-4">
      {header}
      <Card padded={false} className="overflow-hidden">
        <CallFrame roomUrl={roomUrl} token={token} />
      </Card>
      <div className="flex justify-end">
        <ButtonLink
          href={isTeacher ? "/enseignant" : "/espace/cours"}
          variant="ghost"
          size="sm"
        >
          Retour au tableau de bord
        </ButtonLink>
      </div>
    </div>
  );
}
