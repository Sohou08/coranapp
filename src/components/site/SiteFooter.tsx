export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-divider)] bg-white">
      <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between text-[13px] text-muted">
        <p className="font-extrabold text-[15px] text-[var(--color-text)]">
          SANAD
        </p>
        <p>Cours de Coran en ligne — France · Belgique · Suisse · Canada · Royaume-Uni · Sénégal</p>
        <p>&copy; {new Date().getFullYear()} Sanad. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
