"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function resolveSuspensionAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (requestId && (decision === "approved" || decision === "rejected")) {
    await supabase
      .from("suspension_requests")
      .update({
        status: decision,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq("id", requestId);
  }

  revalidatePath("/admin/suspensions");
  redirect("/admin/suspensions");
}
