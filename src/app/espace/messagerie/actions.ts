"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

// Envoi d'un message dans une conversation existante. Policy RLS dédiée :
// "messages: send as participant" (voir migration
// espace_family_write_policies). Note : la modération (masquage des
// numéros de téléphone, etc., documentée dans le schéma comme "prévue") est
// une amélioration future — ce message est inséré tel quel.
export async function sendMessageAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!conversationId || !body) {
    redirect(`/espace/messagerie?c=${conversationId}`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });

  revalidatePath("/espace/messagerie");
  redirect(`/espace/messagerie?c=${conversationId}`);
}
