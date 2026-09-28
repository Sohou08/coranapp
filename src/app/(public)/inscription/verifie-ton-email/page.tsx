import Link from "next/link";
import { Card } from "@/components/ui/Card";

// Affichée après un signUp() réussi tant que la confirmation par email est
// activée côté Supabase (le compte existe mais n'a pas encore de session
// active) — voir signUpAction dans src/lib/auth/actions.ts.
export default async function VerifieTonEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { email } = await searchParams;
  const emailValue = typeof email === "string" ? email : Array.isArray(email) ? email[0] : "";

  return (
    <div className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-[28px] mb-2">Vérifie ta boîte mail</h1>
      <Card>
        <p className="text-[14px] text-[var(--color-text)]">
          Ton compte a bien été créé{emailValue ? ` pour ${emailValue}` : ""}. Un email de
          confirmation vient de t&apos;être envoyé — clique sur le lien qu&apos;il contient pour
          activer ton compte, puis reviens te connecter ici.
        </p>
        <p className="text-[13px] text-muted mt-4">
          Tu ne le vois pas ? Vérifie tes courriers indésirables (spam) : il vient de
          l&apos;adresse noreply@mail.app.supabase.io.
        </p>
      </Card>
      <p className="text-[13px] text-muted mt-4">
        Une fois confirmé,{" "}
        <Link href="/connexion" className="font-semibold text-[var(--color-accent-800)]">
          connecte-toi ici
        </Link>
        .
      </p>
    </div>
  );
}
