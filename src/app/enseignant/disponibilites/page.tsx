// Gestion des créneaux récurrents de disponibilité. L'édition d'un créneau
// existant se fait en le supprimant puis en en recréant un (pas d'édition
// inline pour cette première version — voir note de fin de session).
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { formatTimeStringFr } from "@/lib/format";
import { WEEKDAY_LABELS } from "../_lib/queries";
import { addAvailabilityAction, removeAvailabilityAction } from "./actions";

type AvailabilityRow = { id: string; weekday: number; start_time: string; end_time: string };

export default async function EnseignantDisponibilitesPage({
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

  const { data } = await supabase
    .from("availability")
    .select("id, weekday, start_time, end_time")
    .eq("teacher_id", user.id)
    .order("weekday")
    .order("start_time");
  const slots = (data ?? []) as AvailabilityRow[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Disponibilités</h1>

      {typeof error === "string" && (
        <Card className="border-red-300">
          <p className="text-[13px] text-red-700">{error}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-[15px] mb-3">Ajouter un créneau récurrent</h2>
        <form
          action={addAvailabilityAction}
          className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end"
        >
          <SelectField label="Jour" name="weekday" defaultValue="1">
            {WEEKDAY_LABELS.map((label, idx) => (
              <option key={idx} value={idx}>
                {label}
              </option>
            ))}
          </SelectField>
          <TextField label="Début" name="startTime" type="time" defaultValue="17:00" required />
          <TextField label="Fin" name="endTime" type="time" defaultValue="18:00" required />
          <Button type="submit">Ajouter</Button>
        </form>
      </Card>

      <section>
        <h2 className="text-[16px] mb-3">Mes créneaux</h2>
        {slots.length === 0 ? (
          <Card>
            <p className="text-[13px] text-muted">Aucun créneau enregistré pour l&apos;instant.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {slots.map((s) => (
              <Card key={s.id} className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-[14px] font-semibold">
                  {WEEKDAY_LABELS[s.weekday]} · {formatTimeStringFr(s.start_time)}–
                  {formatTimeStringFr(s.end_time)}
                </p>
                <form action={removeAvailabilityAction}>
                  <input type="hidden" name="availabilityId" value={s.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Retirer
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
