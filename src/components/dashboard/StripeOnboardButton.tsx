"use client";

// Bouton "Activer les paiements" de l'espace enseignant. Appelle la route
// serveur qui crée (ou récupère) le compte Stripe Connect de l'enseignant
// et renvoie un lien d'inscription à usage unique, puis redirige le
// navigateur dessus (Stripe s'occupe du reste et ramène l'enseignant sur
// /enseignant/revenus une fois terminé).
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function StripeOnboardButton({ label = "Activer les paiements" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Impossible de démarrer l'inscription Stripe.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Impossible de contacter Stripe pour le moment.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={handleClick} disabled={loading}>
        {loading ? "Redirection vers Stripe…" : label}
      </Button>
      {error && <p className="text-[12px] text-red-800">{error}</p>}
    </div>
  );
}
