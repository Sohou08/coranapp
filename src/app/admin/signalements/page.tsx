// File de modération : messages signalés (flagged) ou déjà marqués comme en
// attente de revue. Le passage automatique en "pending" n'existe pas encore
// (voir la migration admin_moderation_and_suspensions) — cette liste est
// donc souvent vide pour l'instant, ce qui est normal.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDateTimeFr } from "@/lib/format";
import { resolveModerationAction } from "./actions";

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

export default async function AdminSignalementsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data } = await supabase
    .from("messages")
    .select("id, body, created_at, sender_id, profiles(first_name, last_name)")
    .or("moderation_status.eq.pending,and(flagged.eq.true,moderation_status.is.null)")
    .order("created_at", { ascending: true });

  const messages = (data ?? []) as unknown as MessageRow[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Signalements</h1>

      <Card>
        <p className="text-[12px] text-muted">
          Le signalement automatique des messages suspects (numéros, coordonnées personnelles…)
          n&apos;est pas encore branché — cette file ne contient que les messages marqués
          manuellement pour l&apos;instant.
        </p>
      </Card>

      {messages.length === 0 ? (
        <Card>
          <p className="text-[13px] text-muted">Aucun signalement en attente.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <Card key={m.id} className="flex flex-col gap-3">
              <div>
                <p className="font-semibold text-[14px]">
                  {m.profiles?.first_name} {m.profiles?.last_name}
                </p>
                <p className="text-[11px] text-muted">{formatDateTimeFr(m.created_at)}</p>
              </div>
              <p className="text-[13px]">{m.body}</p>
              <div className="flex gap-2">
                <form action={resolveModerationAction}>
                  <input type="hidden" name="messageId" value={m.id} />
                  <input type="hidden" name="decision" value="confirmed" />
                  <Button type="submit" variant="ghost" size="sm">
                    Confirmer l&apos;infraction
                  </Button>
                </form>
                <form action={resolveModerationAction}>
                  <input type="hidden" name="messageId" value={m.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <Button type="submit" variant="ghost" size="sm">
                    Faux positif
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
