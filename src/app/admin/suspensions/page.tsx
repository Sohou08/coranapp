// File des demandes de suspension (enseignant → admin) en attente.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDateTimeFr } from "@/lib/format";
import { guardianFullName } from "@/app/enseignant/_lib/queries";
import { resolveSuspensionAction } from "./actions";

type SuspensionRow = {
  id: string;
  reason: string;
  requested_at: string;
  teacher_profiles: {
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  students: {
    first_name: string;
    parent: { first_name: string | null; last_name: string | null } | null;
    self: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

export default async function AdminSuspensionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data } = await supabase
    .from("suspension_requests")
    .select(
      "id, reason, requested_at, teacher_profiles(profiles(first_name, last_name)), students(first_name, parent:profiles!students_parent_id_fkey(first_name, last_name), self:profiles!students_self_profile_id_fkey(first_name, last_name))"
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  const requests = (data ?? []) as unknown as SuspensionRow[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Suspensions</h1>

      {requests.length === 0 ? (
        <Card>
          <p className="text-[13px] text-muted">Aucune demande de suspension en attente.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => {
            const guardian = r.students?.parent
              ? guardianFullName(r.students.parent)
              : r.students?.self
                ? `${guardianFullName(r.students.self)} (élève)`
                : "—";
            return (
              <Card key={r.id} className="flex flex-col gap-3">
                <div>
                  <p className="font-semibold text-[14px]">
                    Enseignant : {r.teacher_profiles?.profiles?.first_name}{" "}
                    {r.teacher_profiles?.profiles?.last_name}
                  </p>
                  <p className="text-[13px] text-muted">
                    Famille : {r.students?.first_name ?? "—"} · {guardian}
                  </p>
                  <p className="text-[11px] text-muted">{formatDateTimeFr(r.requested_at)}</p>
                </div>
                <p className="text-[13px]">{r.reason}</p>
                <div className="flex gap-2">
                  <form action={resolveSuspensionAction}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <Button type="submit" size="sm">
                      Approuver
                    </Button>
                  </form>
                  <form action={resolveSuspensionAction}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <Button type="submit" variant="ghost" size="sm">
                      Rejeter
                    </Button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
