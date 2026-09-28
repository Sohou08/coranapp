// Ouvre un enregistrement de cours (resources.source = 'lesson_recording').
// resources.file_path stocke l'identifiant stable Daily du recording (pas
// un lien direct : les liens Daily expirent, voir src/lib/daily/server.ts)
// — cette route résout un lien d'accès frais à chaque appel et redirige
// dessus. Réservé aux ressources "lesson_recording" : les ressources
// ajoutées manuellement gardent leur comportement placeholder existant
// (upload de fichier réel = suivi séparé, hors périmètre ici).
import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getDailyRecordingAccessLink } from "@/lib/daily/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  // Les policies RLS existantes couvrent déjà exactement les cas
  // d'autorisation voulus (owner, is_shared, ou partagé via
  // resource_shares pour la famille de l'élève concerné) — voir
  // "resources: owner write" / "resources: shared or owner" / "resources:
  // shared via resource_shares" dans le schéma. Une requête simple avec le
  // client RLS renvoie donc naturellement 0 ligne pour quiconque n'a pas
  // accès, sans logique d'autorisation dupliquée ici.
  const { data: resource } = await supabase
    .from("resources")
    .select("id, file_path, source")
    .eq("id", id)
    .maybeSingle();

  if (!resource || resource.source !== "lesson_recording") {
    return NextResponse.json(
      { error: "Ressource introuvable ou non disponible via ce lien." },
      { status: 404 }
    );
  }

  try {
    const { download_link } = await getDailyRecordingAccessLink(resource.file_path);
    return NextResponse.redirect(download_link, { status: 307 });
  } catch {
    return NextResponse.json(
      { error: "Impossible de récupérer l'enregistrement pour le moment." },
      { status: 502 }
    );
  }
}
