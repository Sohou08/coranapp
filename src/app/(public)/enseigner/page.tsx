import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export default function EnseignerPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 text-center">
      <h1 className="text-[28px] mb-3">Enseignez le Coran sur Sanad</h1>
      <p className="text-[14px] text-muted mb-6">
        Créez votre profil, fixez vos tarifs et vos disponibilités, et
        recevez vos réservations directement sur la plateforme.
      </p>
      <Card className="text-left">
        <p className="text-[13px] text-muted">
          Le formulaire de candidature enseignant (profil, vérification,
          disponibilités) fait partie de l&apos;espace enseignant — prochaine
          tranche à construire une fois le parcours public validé.
        </p>
      </Card>
      <ButtonLink href="/inscription" className="mt-6 inline-flex">
        Créer un compte enseignant
      </ButtonLink>
    </div>
  );
}
