"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function verifyTeacherAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const teacherId = String(formData.get("teacherId") ?? "");
  if (teacherId) {
    await supabase.from("teacher_profiles").update({ verified: true }).eq("id", teacherId);
  }

  revalidatePath("/admin/enseignants");
  redirect("/admin/enseignants");
}
