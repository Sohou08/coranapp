"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

const PARENT_NAV_ITEMS: NavItem[] = [
  { href: "/espace", label: "Tableau de bord" },
  { href: "/espace/cours", label: "Mes cours" },
  { href: "/espace/enseignants", label: "Mes enseignants" },
  { href: "/espace/progression", label: "Progression" },
  { href: "/espace/abonnements", label: "Abonnements" },
  { href: "/espace/mediatheque", label: "Médiathèque" },
  { href: "/espace/paiements", label: "Paiements" },
  { href: "/espace/messagerie", label: "Messagerie" },
];

const ENSEIGNANT_NAV_ITEMS: NavItem[] = [
  { href: "/enseignant", label: "Tableau de bord" },
  { href: "/enseignant/profil", label: "Mon profil" },
  { href: "/enseignant/calendrier", label: "Calendrier" },
  { href: "/enseignant/disponibilites", label: "Disponibilités" },
  { href: "/enseignant/eleves", label: "Mes élèves" },
  { href: "/enseignant/ressources", label: "Mes ressources" },
  { href: "/enseignant/revenus", label: "Revenus" },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/enseignants", label: "Enseignants" },
  { href: "/admin/signalements", label: "Signalements" },
  { href: "/admin/suspensions", label: "Suspensions" },
];

const NAV_ITEMS_BY_KIND: Record<"parent" | "enseignant" | "admin", NavItem[]> = {
  parent: PARENT_NAV_ITEMS,
  enseignant: ENSEIGNANT_NAV_ITEMS,
  admin: ADMIN_NAV_ITEMS,
};

// `kind` sélectionne la liste de liens intégrée (parent par défaut, pour ne
// rien changer à /espace) ; `items` permet de passer une liste personnalisée
// si besoin plus tard sans toucher ce fichier.
export function DashNav({
  kind = "parent",
  items,
}: {
  kind?: "parent" | "enseignant" | "admin";
  items?: NavItem[];
}) {
  const pathname = usePathname();
  const navItems = items ?? NAV_ITEMS_BY_KIND[kind];
  const rootHref = navItems[0]?.href;

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive =
          item.href === rootHref
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2.5 text-[13px] font-semibold transition-colors ${
              isActive
                ? "bg-[var(--color-accent-800)] text-white"
                : "text-[var(--color-text)] hover:bg-[var(--color-neutral-200)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
