"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function resolveModerationAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const messageId = String(formData.get("messageId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (messageId && (decision === "confirmed" || decision === "rejected")) {
    await supabase
      .from("messages")
      .update({ moderation_status: decision })
      .eq("id", messageId);
  }

  revalidatePath("/admin/signalements");
  redirect("/admin/signalements");
}
