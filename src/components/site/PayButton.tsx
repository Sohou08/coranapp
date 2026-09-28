"use client";

// Bouton "Payer et confirmer" du tunnel de réservation. Même schéma que
// StripeOnboardButton (src/components/dashboard/StripeOnboardButton.tsx) :
// on appelle une action serveur qui renvoie une URL Stripe Checkout, puis on
// redirige le navigateur dessus. Ici l'action est une Server Action
// (payAndConfirmAction) plutôt qu'une route API, car elle doit aussi créer
// la réservation avant d'appeler Stripe.
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { payAndConfirmAction } from "@/app/(public)/paiement/actions";

export function PayButton({
  teacher,
  subject,
  start,
  student,
  waveAvailable = false,
}: {
  teacher: string;
  subject: string;
  start: string;
  student: string;
  // Masqué tant qu'aucune clé Wave (sandbox ou production) n'est
  // configurée côté serveur — voir src/lib/wave/server.ts.
  waveAvailable?: boolean;
}) {
  const [provider, setProvider] = useState<"stripe" | "wave">("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("teacher", teacher);
    formData.set("subject", subject);
    formData.set("start", start);
    formData.set("student", student);
    formData.set("origin", window.location.origin);
    formData.set("provider", provider);

    try {
      const result = await payAndConfirmAction(formData);
      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError(
        provider === "wave"
          ? "Impossible de contacter Wave pour le moment."
          : "Impossible de contacter Stripe pour le moment."
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {waveAvailable && (
        <div className="flex gap-2" role="radiogroup" aria-label="Moyen de paiement">
          <button
            type="button"
            onClick={() => setProvider("stripe")}
            aria-pressed={provider === "stripe"}
            className={`flex-1 border px-3 py-2 text-[13px] font-semibold transition-colors ${
              provider === "stripe"
                ? "border-[var(--color-accent-800)] bg-[var(--color-accent-100)]"
                : "border-[var(--color-divider)]"
            }`}
          >
            Carte bancaire
          </button>
          <button
            type="button"
            onClick={() => setProvider("wave")}
            aria-pressed={provider === "wave"}
            className={`flex-1 border px-3 py-2 text-[13px] font-semibold transition-colors ${
              provider === "wave"
                ? "border-[var(--color-accent-800)] bg-[var(--color-accent-100)]"
                : "border-[var(--color-divider)]"
            }`}
          >
            Wave
          </button>
        </div>
      )}
      <Button type="button" onClick={handleClick} disabled={loading} className="w-full">
        {loading
          ? provider === "wave"
            ? "Redirection vers Wave…"
            : "Redirection vers Stripe…"
          : "Payer et confirmer"}
      </Button>
      {error && <p className="text-[12px] text-red-800">{error}</p>}
    </div>
  );
}
