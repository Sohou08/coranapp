"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

// Ajout d'une ressource — métadonnées uniquement pour l'instant (pas
// d'upload de fichier réel : l'intégration Supabase Storage est un suivi à
// faire séparément, voir file_path placeholder ci-dessous).
export async function addResourceAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const title = String(formData.get("title") ?? "").trim();
  const mimeType = String(formData.get("mimeType") ?? "").trim();
  const isShared = formData.get("isShared") === "on";

  if (!title) {
    redirect(
      "/enseignant/ressources?error=" + encodeURIComponent("Merci de renseigner un titre.")
    );
  }

  const { error } = await supabase.from("resources").insert({
    owner_id: user.id,
    title,
    // Pas d'upload réel dans cette version : file_path est un placeholder en
    // attendant l'intégration Supabase Storage (TODO suivi séparément).
    file_path: `pending/${crypto.randomUUID()}`,
    mime_type: mimeType || null,
    is_shared: isShared,
  });

  if (error) {
    redirect(
      "/enseignant/ressources?error=" +
        encodeURIComponent("L'ajout de la ressource a échoué. Réessayez dans un instant.")
    );
  }

  revalidatePath("/enseignant/ressources");
  redirect("/enseignant/ressources");
}

export async function toggleResourceShareAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const resourceId = String(formData.get("resourceId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const shared = String(formData.get("shared") ?? "") === "true";

  if (resourceId && studentId) {
    if (shared) {
      // Déjà partagé → on retire.
      await supabase
        .from("resource_shares")
        .delete()
        .eq("resource_id", resourceId)
        .eq("student_id", studentId);
    } else {
      await supabase.from("resource_shares").insert({
        resource_id: resourceId,
        student_id: studentId,
      });
    }
  }

  revalidatePath("/enseignant/ressources");
  redirect("/enseignant/ressources");
}
