import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-20 bg-[var(--color-bg)] border-b-2 border-[var(--color-divider)]"
    >
      <div className="mx-auto max-w-6xl flex items-center gap-6 px-5 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-extrabold text-[19px] tracking-tight">
            SANAD
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium flex-1">
          <Link href="/recherche" className="hover:text-[var(--color-accent-800)]">
            Trouver un enseignant
          </Link>
          <Link href="/enseigner" className="hover:text-[var(--color-accent-800)]">
            Enseigner
          </Link>
        </nav>
        <div className="flex-1 md:flex-none" />
        <div className="flex items-center gap-2">
          <ButtonLink href="/connexion" variant="ghost" size="sm">
            Connexion
          </ButtonLink>
          <ButtonLink href="/inscription" variant="primary" size="sm">
            Créer un compte
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
