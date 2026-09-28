"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

// "Signaler à l'admin" sur un paiement en retard = demande de suspension
// visant la famille concernée (l'admin approuve ou rejette depuis
// /admin/suspensions).
export async function reportOverduePaymentAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const studentId = String(formData.get("studentId") ?? "");
  const reason = String(formData.get("reason") ?? "Paiement en retard.");

  if (studentId) {
    await supabase.from("suspension_requests").insert({
      teacher_id: user.id,
      student_id: studentId,
      reason,
    });
  }

  revalidatePath("/enseignant/revenus");
  redirect("/enseignant/revenus?success=signalement");
}

// "Relancer" : envoie un rappel dans la conversation existante avec le
// parent/tuteur concerné. Si aucune conversation n'existe encore, le bouton
// est désactivé côté page — on ne crée pas de conversation ici.
export async function sendPaymentReminderAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const conversationId = String(formData.get("conversationId") ?? "");
  const message = String(
    formData.get("message") ?? "Petit rappel amical : un paiement est en attente. Merci !"
  );

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: message,
    });
  }

  revalidatePath("/enseignant/revenus");
  redirect("/enseignant/revenus?success=relance");
}
