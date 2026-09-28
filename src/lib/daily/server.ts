// Client REST minimal pour l'API Daily.co (salle vidéo intégrée des cours
// en ligne). Pas de SDK serveur officiel nécessaire — l'API REST est un
// simple JSON sur https://api.daily.co/v1, voir
// https://docs.daily.co/reference/rest-api. Le SDK JS (@daily-co/daily-js)
// n'intervient que côté client, pour l'iframe elle-même (voir
// CallFrame.tsx).
//
// ⚠️ Ne JAMAIS importer ce fichier depuis un composant client :
// DAILY_API_KEY ne doit jamais atteindre le navigateur (même convention que
// src/lib/stripe/server.ts, qui n'utilise pas non plus le package
// "server-only" — absent des dépendances du projet).

const DAILY_API_BASE = "https://api.daily.co/v1";

function dailyHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function dailyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${DAILY_API_BASE}${path}`, {
    ...init,
    headers: { ...dailyHeaders(), ...(init?.headers ?? {}) },
    // Les salles/tokens doivent refléter l'état courant du booking — pas de
    // cache Next.js sur ces appels.
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Daily API ${path} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export type DailyRoom = {
  id: string;
  name: string;
  url: string;
  api_created: boolean;
  privacy: "private" | "public";
  config: Record<string, unknown>;
};

// Crée une salle Daily privée pour un cours donné. `roomName` doit être
// unique par booking (on utilise l'id du booking, préfixé pour lisibilité
// dans le dashboard Daily). `expiresAt` fixe l'auto-expiration de la salle
// (Daily la supprime après ce délai) — voir getRoomExpiryForLesson().
export async function createDailyRoom(params: {
  roomName: string;
  expiresAt: Date;
}): Promise<DailyRoom> {
  return dailyFetch<DailyRoom>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: params.roomName,
      privacy: "private",
      properties: {
        enable_recording: "cloud",
        exp: Math.floor(params.expiresAt.getTime() / 1000),
      },
    }),
  });
}

// Salle courante à partir de son `name` (utile si on a déjà
// bookings.video_room_id mais qu'on veut revérifier son état côté Daily) —
// non utilisé pour l'instant mais gardé pour cohérence avec le reste de
// l'API, coût nul.
export async function getDailyRoom(roomName: string): Promise<DailyRoom | null> {
  const res = await fetch(`${DAILY_API_BASE}/rooms/${encodeURIComponent(roomName)}`, {
    headers: dailyHeaders(),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Daily API /rooms/${roomName} → ${res.status}`);
  return res.json() as Promise<DailyRoom>;
}

// Calcule une date d'expiration "raisonnable" pour une salle de cours : la
// fin du cours + 2h de marge (dépassement de séance, retard côté famille,
// etc.), sans laisser la salle vivre indéfiniment.
export function getRoomExpiryForLesson(endsAt: Date): Date {
  return new Date(endsAt.getTime() + 2 * 60 * 60 * 1000);
}

export type DailyMeetingToken = { token: string };

// Jeton de participation signé, propre à un utilisateur + une salle.
// is_owner=true donne les droits d'enseignant (peut démarrer
// l'enregistrement, expulser, etc.) — réservé au teacher_id du booking.
export async function createDailyMeetingToken(params: {
  roomName: string;
  userName: string;
  isOwner: boolean;
  expiresAt: Date;
}): Promise<DailyMeetingToken> {
  return dailyFetch<DailyMeetingToken>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: params.roomName,
        user_name: params.userName,
        is_owner: params.isOwner,
        exp: Math.floor(params.expiresAt.getTime() / 1000),
      },
    }),
  });
}

export type DailyRecording = {
  id: string;
  room_name: string;
  start_ts: number;
  status: "in-progress" | "finished";
  duration?: number;
  max_participants: number;
};

// Enregistrements terminés d'une salle donnée. On ne s'intéresse qu'aux
// enregistrements "finished" (voir sync des ressources) — un cours encore
// en cours d'enregistrement n'a pas encore de fichier exploitable.
export async function listDailyRecordingsForRoom(roomName: string): Promise<DailyRecording[]> {
  const res = await dailyFetch<{ data: DailyRecording[]; total_count: number }>(
    `/recordings?room_name=${encodeURIComponent(roomName)}`
  );
  return res.data;
}

export type DailyAccessLink = { download_link: string; expires: number };

// Lien d'accès à un enregistrement — volontairement court-lived (Daily
// limite entre 15 min et 12h). Ne jamais stocker `download_link` en base :
// on ne conserve que `recording_id` (voir resources.file_path) et on
// redemande un lien frais à chaque clic sur "Ouvrir" (voir
// /api/resources/[id]/open).
export async function getDailyRecordingAccessLink(
  recordingId: string,
  validForSecs = 3600
): Promise<DailyAccessLink> {
  return dailyFetch<DailyAccessLink>(
    `/recordings/${encodeURIComponent(recordingId)}/access-link?valid_for_secs=${validForSecs}`
  );
}
