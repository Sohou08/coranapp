"use server";

import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

// Publication d'un avis pour un cours terminé. Revalide que la réservation
// appartient bien à la famille, qu'elle est terminée, et qu'aucun avis
// n'existe déjà — RLS (reviews: author write) impose déjà author_id =
// auth.uid(), mais on vérifie ici pour donner un message d'erreur clair.
export async function submitReviewAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, teacher_id, status, student_id, students(parent_id, self_profile_id)")
    .eq("id", bookingId)
    .maybeSingle();

  const student = booking?.students as unknown as
    | { parent_id: string | null; self_profile_id: string | null }
    | null;
  const belongsToFamily =
    student && (student.parent_id === user.id || student.self_profile_id === user.id);

  if (!booking || !belongsToFamily || booking.status !== "completed") {
    redirect(`/espace/avis?lesson=${bookingId}&error=notfound`);
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (existing) {
    redirect(`/espace/avis?lesson=${bookingId}&error=already`);
  }

  const { error } = await supabase.from("reviews").insert({
    booking_id: bookingId,
    author_id: user.id,
    teacher_id: booking.teacher_id,
    rating: Math.min(5, Math.max(1, rating)),
    comment: comment || null,
  });

  if (error) {
    redirect(`/espace/avis?lesson=${bookingId}&error=notfound`);
  }

  redirect("/espace/cours");
}
