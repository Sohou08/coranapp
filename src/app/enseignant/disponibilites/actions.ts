"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function addAvailabilityAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const weekday = parseInt(String(formData.get("weekday") ?? ""), 10);
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  if (Number.isNaN(weekday) || !startTime || !endTime || startTime >= endTime) {
    redirect(
      "/enseignant/disponibilites?error=" +
        encodeURIComponent("Merci de renseigner un jour et une plage horaire valides.")
    );
  }

  const { error } = await supabase.from("availability").insert({
    teacher_id: user.id,
    weekday,
    start_time: startTime,
    end_time: endTime,
  });

  if (error) {
    redirect(
      "/enseignant/disponibilites?error=" +
        encodeURIComponent("L'ajout du créneau a échoué. Réessayez dans un instant.")
    );
  }

  revalidatePath("/enseignant/disponibilites");
  redirect("/enseignant/disponibilites");
}

export async function removeAvailabilityAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const availabilityId = String(formData.get("availabilityId") ?? "");
  if (availabilityId) {
    await supabase
      .from("availability")
      .delete()
      .eq("id", availabilityId)
      .eq("teacher_id", user.id);
  }

  revalidatePath("/enseignant/disponibilites");
  redirect("/enseignant/disponibilites");
}
