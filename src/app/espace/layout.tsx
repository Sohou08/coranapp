// Layout partagé de l'espace parent/élève : colonne de navigation
// ("dashShell" du prototype) + zone de contenu. Le rôle enseignant/admin
// n'a pas encore son propre espace — ce layout s'applique quel que soit le
// rôle pour l'instant.
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { DashNav } from "@/components/dashboard/DashNav";
import { signOutAction } from "@/lib/auth/actions";

const ROLE_LABELS: Record<string, string> = {
  parent: "Parent",
  eleve: "Élève",
  enseignant: "Enseignant",
  admin: "Administrateur",
};

export default async function EspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 grid md:grid-cols-[240px_1fr] gap-8">
      <aside className="flex flex-col gap-4">
        <div className="px-1">
          <p className="font-semibold text-[15px]">
            {profile?.first_name} {profile?.last_name}
          </p>
          <p className="text-[12px] text-muted">
            {profile?.role ? ROLE_LABELS[profile.role] ?? profile.role : "—"}
          </p>
        </div>
        <div className="divider" />
        <DashNav />
        <div className="divider" />
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-[13px] font-semibold text-[var(--color-accent-800)] px-3 py-2 hover:underline"
          >
            Se déconnecter
          </button>
        </form>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
