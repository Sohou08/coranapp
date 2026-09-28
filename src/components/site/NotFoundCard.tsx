import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export function NotFoundCard() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Card className="text-center py-10">
        <p className="text-[14px] text-muted mb-6">
          Cette étape n&apos;est pas accessible directement — reprenez la
          réservation depuis la fiche de l&apos;enseignant.
        </p>
        <ButtonLink href="/recherche/">Trouver un enseignant</ButtonLink>
      </Card>
    </div>
  );
}
