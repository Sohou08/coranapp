"use server";

// Crée la réservation puis la session de paiement Stripe, déclenché par le
// clic sur "Payer et confirmer" (composant client PayButton) plutôt qu'au
// chargement de la page — pour ne pas créer de réservation "pending"
// orpheline simplement en visitant /paiement.
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherBySlug } from "../_lib/queries";
import { createCheckoutSessionForBooking } from "@/lib/stripe/checkout";
import { createWaveCheckoutSessionForBooking } from "@/lib/wave/checkout";

export type PayActionResult = { url: string } | { error: string };

export async function payAndConfirmAction(formData: FormData): Promise<PayActionResult> {
  const teacherSlug = String(formData.get("teacher") ?? "");
  const subjectId = String(formData.get("subject") ?? "");
  const start = String(formData.get("start") ?? "");
  const studentId = String(formData.get("student") ?? "");
  const origin = String(formData.get("origin") ?? "");
  const provider = String(formData.get("provider") ?? "stripe");

  if (!teacherSlug || !subjectId || !start || !studentId) {
    return { error: "Paramètres de réservation manquants." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Vous devez être connecté·e pour payer." };
  }

  const teacher = await getTeacherBySlug(supabase, teacherSlug);
  if (!teacher) {
    return { error: "Enseignant introuvable." };
  }

  // Le student doit appartenir à la famille connectée. RLS empêcherait
  // aussi l'insertion du booking pour un student qui n'est pas le sien,
  // mais on vérifie explicitement pour renvoyer un message clair plutôt
  // qu'une erreur RLS brute.
  const { data: student } = await supabase
    .from("students")
    .select("id, parent_id, self_profile_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!student || (student.parent_id !== user.id && student.self_profile_id !== user.id)) {
    return { error: "Cet élève n'appartient pas à votre compte." };
  }

  // `bookings` n'a qu'une policy RLS de lecture (participants) — pas
  // d'INSERT policy pour un parent/élève. On a déjà vérifié explicitement
  // ci-dessus que ce student appartient bien à l'utilisateur connecté, donc
  // on passe par le client admin (service_role) pour la création, comme le
  // fait déjà le webhook Stripe pour la mise à jour de statut.
  const admin = createAdminClient();

  // Idempotence : si une réservation "pending" identique existe déjà (ex.
  // retour en arrière depuis Stripe puis nouvel essai de paiement), on la
  // réutilise plutôt que d'en créer une deuxième.
  const { data: existing } = await admin
    .from("bookings")
    .select("id")
    .eq("teacher_id", teacher.id)
    .eq("student_id", studentId)
    .eq("subject_id", subjectId)
    .eq("starts_at", start)
    .eq("status", "pending")
    .maybeSingle();

  let bookingId = existing?.id;

  if (!bookingId) {
    const { data: created, error: insertError } = await admin
      .from("bookings")
      .insert({
        teacher_id: teacher.id,
        student_id: studentId,
        subject_id: subjectId,
        starts_at: start,
        duration_minutes: 60,
        price: teacher.priceHour,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !created) {
      return { error: "Impossible de créer la réservation pour le moment." };
    }
    bookingId = created.id;
  }

  if (provider === "wave") {
    return createWaveCheckoutSessionForBooking(admin, bookingId, origin);
  }
  return createCheckoutSessionForBooking(admin, bookingId, origin);
}
