// Vue semaine en lecture seule : disponibilités récurrentes + réservations
// de la semaine en cours, groupées par jour. Pas d'édition ici — voir
// /enseignant/disponibilites pour ajouter/retirer des créneaux.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui/Card";
import { formatTimeFr, formatTimeStringFr, formatDateShortFr } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/app/espace/_lib/queries";
import { WEEKDAY_LABELS } from "../_lib/queries";

type AvailabilityRow = { id: string; weekday: number; start_time: string; end_time: string };
type BookingRow = {
  id: string;
  starts_at: string;
  status: string;
  students: { first_name: string } | null;
  subjects: { label: string } | null;
};

export default async function EnseignantCalendrierPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const [availabilityRes, bookingsRes] = await Promise.all([
    supabase
      .from("availability")
      .select("id, weekday, start_time, end_time")
      .eq("teacher_id", user.id)
      .order("weekday")
      .order("start_time"),
    supabase
      .from("bookings")
      .select("id, starts_at, status, students(first_name), subjects(label)")
      .eq("teacher_id", user.id)
      .gte("starts_at", startOfWeek.toISOString())
      .lt("starts_at", endOfWeek.toISOString())
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true }),
  ]);

  const availability = (availabilityRes.data ?? []) as AvailabilityRow[];
  const bookings = (bookingsRes.data ?? []) as unknown as BookingRow[];

  // Colonnes lundi → dimanche pour l'affichage, avec la date réelle de la semaine.
  const columns = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    const weekday = date.getDay(); // 0-6, 0 = dimanche (même convention que le schéma)
    return { date, weekday };
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Calendrier</h1>
      <p className="text-[13px] text-muted">
        Semaine du {formatDateShortFr(startOfWeek)} — vue en lecture seule. Pour modifier vos
        créneaux, rendez-vous dans{" "}
        <a href="/enseignant/disponibilites" className="underline text-[var(--color-accent-800)]">
          Disponibilités
        </a>
        .
      </p>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {columns.map(({ date, weekday }) => {
          const dayAvailability = availability.filter((a) => a.weekday === weekday);
          const dayBookings = bookings.filter((b) => {
            const d = new Date(b.starts_at);
            return (
              d.getFullYear() === date.getFullYear() &&
              d.getMonth() === date.getMonth() &&
              d.getDate() === date.getDate()
            );
          });
          return (
            <Card key={weekday} className="flex flex-col gap-3">
              <div>
                <p className="font-semibold text-[13px]">{WEEKDAY_LABELS[weekday]}</p>
                <p className="text-[11px] text-muted">{formatDateShortFr(date)}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  Disponible
                </p>
                {dayAvailability.length === 0 ? (
                  <p className="text-[12px] text-muted">—</p>
                ) : (
                  dayAvailability.map((a) => (
                    <p key={a.id} className="text-[12px]">
                      {formatTimeStringFr(a.start_time)}–{formatTimeStringFr(a.end_time)}
                    </p>
                  ))
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Cours</p>
                {dayBookings.length === 0 ? (
                  <p className="text-[12px] text-muted">—</p>
                ) : (
                  dayBookings.map((b) => (
                    <div key={b.id} className="border-l-2 border-[var(--color-accent-700)] pl-2">
                      <p className="text-[12px] font-semibold">{formatTimeFr(b.starts_at)}</p>
                      <p className="text-[11px] text-muted">
                        {b.subjects?.label ?? "Cours"} · {b.students?.first_name ?? "—"}
                      </p>
                      <Badge tone={b.status === "confirmed" ? "accent" : "neutral"}>
                        {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
