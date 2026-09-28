import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { signInAction } from "@/lib/auth/actions";

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error, next } = await searchParams;
  const nextValue = typeof next === "string" ? next : Array.isArray(next) ? next[0] : "";

  return (
    <div className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-[28px] mb-6">Connexion</h1>
      <Card>
        {error && (
          <p className="mb-4 border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800">
            {Array.isArray(error) ? error[0] : error}
          </p>
        )}
        <form action={signInAction} className="flex flex-col gap-4">
          {nextValue && <input type="hidden" name="next" value={nextValue} />}
          <TextField label="Email" name="email" type="email" required />
          <TextField label="Mot de passe" name="password" type="password" required />
          <Button type="submit" className="mt-2">
            Se connecter
          </Button>
        </form>
      </Card>
      <p className="text-[13px] text-muted mt-4">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-[var(--color-accent-800)]">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
