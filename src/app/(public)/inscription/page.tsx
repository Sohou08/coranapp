import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TextField, SelectField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { signUpAction } from "@/lib/auth/actions";

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-[28px] mb-2">Créer un compte</h1>
      <p className="text-[14px] text-muted mb-6">
        Rejoignez Sanad en tant qu&apos;élève, parent ou enseignant.
      </p>
      <Card>
        {error && (
          <p className="mb-4 border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800">
            {Array.isArray(error) ? error[0] : error}
          </p>
        )}
        <form action={signUpAction} className="flex flex-col gap-4">
          <SelectField label="Je suis" name="role" defaultValue="parent">
            <option value="parent">Parent</option>
            <option value="eleve">Élève (adulte)</option>
            <option value="enseignant">Enseignant</option>
          </SelectField>
          <TextField label="Prénom" name="firstName" required />
          <TextField label="Nom" name="lastName" required />
          <TextField label="Email" name="email" type="email" required />
          <TextField label="Mot de passe" name="password" type="password" required minLength={8} />
          <Button type="submit" className="mt-2">
            Créer mon compte
          </Button>
        </form>
      </Card>
      <p className="text-[13px] text-muted mt-4">
        Déjà inscrit·e ?{" "}
        <Link href="/connexion" className="font-semibold text-[var(--color-accent-800)]">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
