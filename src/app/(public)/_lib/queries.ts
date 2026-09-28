// Helpers de requêtage partagés entre les pages publiques (accueil,
// recherche, fiche enseignant, tunnel de réservation). Lectures anonymes —
// RLS applique les policies "public read" de teacher_profiles / subjects /
// reviews, donc createClient() (client anon + cookies) fonctionne aussi bien
// pour un visiteur non connecté que pour un parent connecté.
import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicTeacher = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  verified: boolean;
  headline: string | null;
  bio: string | null;
  languages: string[];
  formats: string[];
  city: string | null;
  country: string | null;
  priceHour: number;
  yearsExperience: number | null;
  rating: number;
  reviewCount: number;
  subjects: { id: string; slug: string; label: string }[];
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string;
};

type TeacherRow = {
  id: string;
  slug: string;
  headline: string | null;
  bio: string | null;
  languages: string[] | null;
  formats: string[] | null;
  city: string | null;
  country: string | null;
  price_hour: number | string | null;
  verified: boolean;
  years_experience: number | null;
  profiles: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null;
  teacher_subjects: { subjects: { id: string; slug: string; label: string } | { id: string; slug: string; label: string }[] | null }[] | null;
};

function initialsFor(firstName: string | null, lastName: string | null): string {
  const a = (firstName ?? "").trim().charAt(0);
  const b = (lastName ?? "").trim().charAt(0);
  return (a + b).toUpperCase() || "??";
}

function oneOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function attachRatings(
  supabase: SupabaseClient,
  teacherIds: string[]
): Promise<Map<string, { rating: number; count: number }>> {
  const stats = new Map<string, { rating: number; count: number }>();
  if (teacherIds.length === 0) return stats;

  const { data } = await supabase
    .from("reviews")
    .select("teacher_id, rating")
    .in("teacher_id", teacherIds);

  const sums = new Map<string, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const cur = sums.get(row.teacher_id) ?? { sum: 0, count: 0 };
    cur.sum += row.rating;
    cur.count += 1;
    sums.set(row.teacher_id, cur);
  }
  for (const [teacherId, { sum, count }] of sums) {
    stats.set(teacherId, { rating: count > 0 ? Math.round((sum / count) * 10) / 10 : 0, count });
  }
  return stats;
}

function mapTeacherRow(
  row: TeacherRow,
  ratingStats: Map<string, { rating: number; count: number }>
): PublicTeacher {
  const profile = oneOf(row.profiles);
  const subjects =
    row.teacher_subjects
      ?.map((ts) => oneOf(ts.subjects))
      .filter((s): s is { id: string; slug: string; label: string } => Boolean(s)) ?? [];
  const stats = ratingStats.get(row.id) ?? { rating: 0, count: 0 };

  return {
    id: row.id,
    slug: row.slug,
    name: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Enseignant",
    initials: initialsFor(profile?.first_name ?? null, profile?.last_name ?? null),
    verified: row.verified,
    headline: row.headline,
    bio: row.bio,
    languages: row.languages ?? [],
    formats: row.formats ?? [],
    city: row.city,
    country: row.country,
    priceHour: Number(row.price_hour ?? 0),
    yearsExperience: row.years_experience,
    rating: stats.rating,
    reviewCount: stats.count,
    subjects,
  };
}

const TEACHER_SELECT =
  "id, slug, headline, bio, languages, formats, city, country, price_hour, verified, years_experience, profiles!teacher_profiles_id_fkey(first_name, last_name), teacher_subjects(subjects(id, slug, label))";

// Liste des enseignants publics, vérifiés en premier puis les plus récents.
export async function listTeachers(
  supabase: SupabaseClient,
  options: { limit?: number } = {}
): Promise<PublicTeacher[]> {
  let query = supabase
    .from("teacher_profiles")
    .select(TEACHER_SELECT)
    .order("verified", { ascending: false })
    .order("created_at", { ascending: false });

  if (options.limit) query = query.limit(options.limit);

  const { data } = await query;
  const rows = (data ?? []) as unknown as TeacherRow[];
  const ratingStats = await attachRatings(supabase, rows.map((r) => r.id));
  return rows.map((r) => mapTeacherRow(r, ratingStats));
}

export async function getTeacherBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<PublicTeacher | null> {
  const { data } = await supabase.from("teacher_profiles").select(TEACHER_SELECT).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as unknown as TeacherRow;
  const ratingStats = await attachRatings(supabase, [row.id]);
  return mapTeacherRow(row, ratingStats);
}

export async function getTeacherReviews(
  supabase: SupabaseClient,
  teacherId: string
): Promise<PublicReview[]> {
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, profiles!reviews_author_id_fkey(first_name, last_name)")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => {
    const author = oneOf(
      r.profiles as { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null
    );
    const name = `${author?.first_name ?? ""} ${(author?.last_name ?? "").charAt(0)}${author?.last_name ? "." : ""}`.trim();
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      authorName: name || "Utilisateur Sanad",
    };
  });
}

export async function listSubjects(supabase: SupabaseClient) {
  const { data } = await supabase.from("subjects").select("id, slug, label").order("label");
  return data ?? [];
}

// Sujets réellement enseignés par cet enseignant (jointure teacher_subjects
// -> subjects), utilisés à l'étape 1 du tunnel de réservation.
export async function getTeacherSubjects(supabase: SupabaseClient, teacherId: string) {
  const { data } = await supabase
    .from("teacher_subjects")
    .select("subjects(id, slug, label)")
    .eq("teacher_id", teacherId);
  return (data ?? [])
    .map((row) => oneOf(row.subjects as { id: string; slug: string; label: string } | { id: string; slug: string; label: string }[] | null))
    .filter((s): s is { id: string; slug: string; label: string } => Boolean(s));
}

// Liste fixe des pays réellement représentés dans le prototype/les données
// de test actuelles. Un filtre pays dérivé dynamiquement de
// `teacher_profiles.country` marcherait aussi, mais sur un jeu de données
// encore petit une liste fixe évite un menu qui se vide/change sans arrêt ;
// à revisiter une fois qu'il y a un volume réel d'enseignants.
export const COUNTRY_OPTIONS = [
  "France",
  "Belgique",
  "Suisse",
  "Canada",
  "Royaume-Uni",
  "Sénégal",
];

export type AvailabilityRow = {
  weekday: number;
  start_time: string;
  end_time: string;
  recurring: boolean;
  valid_from: string | null;
  valid_to: string | null;
};

export type BookedRow = { starts_at: string; ends_at: string };

// Génère les créneaux réservables d'un enseignant pour les `days` prochains
// jours (par défaut 14), en tranches de `slotMinutes` (par défaut 60,
// alignée avec bookings.duration_minutes), à partir de ses lignes
// `availability`, puis retire tout créneau qui chevauche une réservation
// existante (pending/confirmed). Fonction pure — testable indépendamment de
// toute requête Supabase : on lui passe déjà les lignes availability et les
// réservations existantes.
export function generateBookableSlots(
  availability: AvailabilityRow[],
  existingBookings: BookedRow[],
  {
    days = 14,
    slotMinutes = 60,
    now = new Date(),
  }: { days?: number; slotMinutes?: number; now?: Date } = {}
): Date[] {
  const slots: Date[] = [];
  const bookedRanges = existingBookings.map((b) => ({
    start: new Date(b.starts_at).getTime(),
    end: new Date(b.ends_at).getTime(),
  }));

  const overlapsBooking = (start: Date, end: Date) => {
    const s = start.getTime();
    const e = end.getTime();
    return bookedRanges.some((r) => s < r.end && e > r.start);
  };

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);
    const weekday = day.getDay(); // 0 = dimanche, aligné avec availability.weekday

    const dayRules = availability.filter((a) => {
      if (a.weekday !== weekday) return false;
      if (a.valid_from && day < new Date(a.valid_from)) return false;
      if (a.valid_to && day > new Date(a.valid_to)) return false;
      return true;
    });

    for (const rule of dayRules) {
      const [startH, startM] = rule.start_time.split(":").map(Number);
      const [endH, endM] = rule.end_time.split(":").map(Number);
      const rangeStart = new Date(day);
      rangeStart.setHours(startH, startM, 0, 0);
      const rangeEnd = new Date(day);
      rangeEnd.setHours(endH, endM, 0, 0);

      for (
        let slotStart = new Date(rangeStart);
        slotStart.getTime() + slotMinutes * 60_000 <= rangeEnd.getTime();
        slotStart = new Date(slotStart.getTime() + slotMinutes * 60_000)
      ) {
        const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);
        if (slotStart <= now) continue; // pas de créneau déjà passé
        if (overlapsBooking(slotStart, slotEnd)) continue;
        slots.push(new Date(slotStart));
      }
    }
  }

  slots.sort((a, b) => a.getTime() - b.getTime());
  return slots;
}

// Charge availability + bookings existants pour un enseignant et renvoie les
// créneaux réservables (voir generateBookableSlots pour la logique pure).
export async function getBookableSlots(
  supabase: SupabaseClient,
  teacherId: string,
  options: { days?: number; slotMinutes?: number; now?: Date } = {}
): Promise<Date[]> {
  const now = options.now ?? new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + (options.days ?? 14) + 1);

  const [availabilityRes, bookingsRes] = await Promise.all([
    supabase
      .from("availability")
      .select("weekday, start_time, end_time, recurring, valid_from, valid_to")
      .eq("teacher_id", teacherId),
    supabase
      .from("bookings")
      .select("starts_at, ends_at")
      .eq("teacher_id", teacherId)
      .in("status", ["pending", "confirmed"])
      .gte("starts_at", now.toISOString())
      .lt("starts_at", windowEnd.toISOString()),
  ]);

  return generateBookableSlots(
    (availabilityRes.data ?? []) as AvailabilityRow[],
    (bookingsRes.data ?? []) as BookedRow[],
    options
  );
}
