"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateTeacherProfileAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const priceHour = parseFloat(String(formData.get("priceHour") ?? "0"));
  const yearsExperienceRaw = String(formData.get("yearsExperience") ?? "").trim();
  const yearsExperience = yearsExperienceRaw ? parseInt(yearsExperienceRaw, 10) : null;
  const languages = formData.getAll("languages").map(String);
  const formats = formData.getAll("formats").map(String);
  const subjectIds = formData.getAll("subjects").map(String);

  const { error } = await supabase
    .from("teacher_profiles")
    .update({
      headline: headline || null,
      bio: bio || null,
      city: city || null,
      country: country || null,
      price_hour: Number.isNaN(priceHour) ? 0 : priceHour,
      years_experience: yearsExperience,
      languages,
      formats,
    })
    .eq("id", user.id);

  if (error) {
    redirect(
      "/enseignant/profil?error=" +
        encodeURIComponent("La mise à jour a échoué. Réessayez dans un instant.")
    );
  }

  // Resynchronisation des matières enseignées : on remplace l'ensemble
  // (suppression + réinsertion) plutôt qu'un diff fin — assez simple pour
  // une liste de quelques cases à cocher.
  await supabase.from("teacher_subjects").delete().eq("teacher_id", user.id);
  if (subjectIds.length) {
    await supabase
      .from("teacher_subjects")
      .insert(subjectIds.map((subject_id) => ({ teacher_id: user.id, subject_id })));
  }

  revalidatePath("/enseignant/profil");
  redirect("/enseignant/profil?success=1");
}
