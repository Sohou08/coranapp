// Messagerie : liste des conversations de la famille avec les enseignants,
// fil de discussion, et formulaire d'envoi.
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDateTimeFr } from "@/lib/format";
import { teacherFullName } from "../_lib/queries";
import { sendMessageAction } from "./actions";

type ConversationRow = {
  id: string;
  teacher_id: string;
  created_at: string;
  teacher_profiles: {
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default async function EspaceMessagerie({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { c } = await searchParams;
  const conversationId = typeof c === "string" ? c : "";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: convRows } = await supabase
    .from("conversations")
    .select("id, teacher_id, created_at, teacher_profiles(profiles(first_name, last_name))")
    .eq("other_id", user.id)
    .order("created_at", { ascending: false });
  const conversations = (convRows ?? []) as unknown as ConversationRow[];

  const activeId = conversationId || conversations[0]?.id || "";
  const active = conversations.find((cv) => cv.id === activeId);

  let messages: MessageRow[] = [];
  if (active) {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", active.id)
      .order("created_at", { ascending: true });
    messages = data ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px]">Messagerie</h1>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <div className="flex flex-col gap-2">
          {conversations.length === 0 ? (
            <Card>
              <p className="text-[13px] text-muted">Aucune conversation pour l&apos;instant.</p>
            </Card>
          ) : (
            conversations.map((cv) => (
              <Link key={cv.id} href={`/espace/messagerie?c=${cv.id}`}>
                <Card
                  className={
                    cv.id === activeId
                      ? "border-[var(--color-accent-700)]"
                      : "hover:shadow-[var(--shadow-md)] transition-shadow"
                  }
                >
                  <p className="font-semibold text-[14px]">
                    {teacherFullName(cv.teacher_profiles?.profiles)}
                  </p>
                </Card>
              </Link>
            ))
          )}
        </div>

        <div className="flex flex-col gap-4">
          {!active ? (
            <Card>
              <p className="text-[13px] text-muted">
                Sélectionnez une conversation pour afficher les messages.
              </p>
            </Card>
          ) : (
            <>
              <Card>
                <p className="font-semibold text-[15px] mb-3">
                  {teacherFullName(active.teacher_profiles?.profiles)}
                </p>
                <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-[13px] text-muted">Aucun message pour l&apos;instant.</p>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender_id === user.id;
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[75%] px-3 py-2 text-[13px] ${
                            mine
                              ? "self-end bg-[var(--color-accent-800)] text-white"
                              : "self-start bg-[var(--color-neutral-200)]"
                          }`}
                        >
                          <p>{m.body}</p>
                          <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-muted"}`}>
                            {formatDateTimeFr(m.created_at)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              <form action={sendMessageAction} className="flex gap-2">
                <input type="hidden" name="conversationId" value={active.id} />
                <textarea
                  name="body"
                  required
                  rows={2}
                  placeholder="Écrire un message…"
                  className="flex-1 border border-[var(--color-divider)] bg-white px-3 py-2.5 text-[14px] outline-none focus-visible:border-[var(--color-accent-700)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-200)]"
                />
                <Button type="submit">Envoyer</Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
