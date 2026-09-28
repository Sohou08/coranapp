// Layout partagé de l'espace admin : même structure que
// src/app/espace/layout.tsx, avec la liste de liens "admin".
import { redirect } from "next/navigation";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { DashNav } from "@/components/dashboard/DashNav";
import { signOutAction } from "@/lib/auth/actions";

export default async function AdminLayout({
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

  // Garde-fou léger : seul un compte admin accède à cet espace.
  if (profile?.role !== "admin") {
    redirect("/espace");
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 grid md:grid-cols-[240px_1fr] gap-8">
      <aside className="flex flex-col gap-4">
        <div className="px-1">
          <p className="font-semibold text-[15px]">
            {profile?.first_name} {profile?.last_name}
          </p>
          <p className="text-[12px] text-muted">Administrateur</p>
        </div>
        <div className="divider" />
        <DashNav kind="admin" />
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
