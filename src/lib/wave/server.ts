// Client Wave for Business côté serveur uniquement (route handlers, server
// actions). Ne JAMAIS importer ce fichier depuis un composant client :
// WAVE_API_KEY ne doit jamais atteindre le navigateur.
//
// Contrairement à Stripe Connect, l'API Checkout de Wave ne documente pas de
// mécanisme de répartition multi-parties (pas d'équivalent à
// transfer_data.destination) : l'argent collecté va intégralement dans le
// wallet Wave Business de Sanad. Le reversement à l'enseignant pour les
// paiements Wave devra donc être un virement/payout séparé (API Payout Wave,
// voir docs.wave.com/payout) plutôt qu'automatique comme avec Stripe — à
// construire une fois la première transaction réelle testée.
//
// WAVE_API_KEY n'est pas encore configurée (aucune clé — sandbox ou
// production — obtenue à ce stade). Tant qu'elle est absente, chaque appel
// échoue avec un message clair plutôt qu'une erreur réseau confuse ; le
// bouton "Payer avec Wave" reste masqué côté interface (voir
// src/app/(public)/paiement/page.tsx).
const WAVE_API_BASE_URL = process.env.WAVE_API_BASE_URL || "https://api.wave.com";

// Devise Wave for Business : XOF (franc CFA), la seule opérationnelle pour un
// wallet business enregistré au Sénégal. Les enseignants sont aujourd'hui
// tarifés en EUR (teacher_profiles / bookings.price) — tant qu'aucune
// conversion réelle n'est branchée, le montant EUR est envoyé tel quel comme
// montant XOF. C'est correct pour un test sandbox (aucun argent réel ne
// circule) mais devra être résolu avant un lancement réel (soit convertir au
// taux du jour, soit demander aux enseignants un tarif dédié en XOF pour les
// familles basées au Sénégal).
export const WAVE_CURRENCY = "XOF";

export function isWaveConfigured() {
  return Boolean(process.env.WAVE_API_KEY);
}

function waveApiKey() {
  const key = process.env.WAVE_API_KEY;
  if (!key) {
    throw new Error(
      "WAVE_API_KEY n'est pas configurée — aucun paiement Wave ne peut être initié pour le moment."
    );
  }
  return key;
}

async function waveFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${WAVE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${waveApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Wave API ${res.status} sur ${path} : ${body}`);
  }
  return res.json();
}

export type WaveCheckoutSession = {
  id: string;
  wave_launch_url: string;
  transaction_id?: string;
  checkout_status: "open" | "complete" | "expired";
  payment_status: "processing" | "cancelled" | "succeeded";
};

export async function createWaveCheckoutSession(params: {
  amount: number; // montant en XOF, sans décimales
  successUrl: string;
  errorUrl: string;
  clientReference: string; // booking_id, pour retrouver/idempotence
}): Promise<WaveCheckoutSession> {
  return waveFetch("/v1/checkout/sessions", {
    method: "POST",
    body: JSON.stringify({
      amount: String(Math.round(params.amount)),
      currency: WAVE_CURRENCY,
      success_url: params.successUrl,
      error_url: params.errorUrl,
      client_reference: params.clientReference,
    }),
  });
}

export async function getWaveCheckoutSession(sessionId: string): Promise<WaveCheckoutSession> {
  return waveFetch(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export async function findWaveCheckoutSessionByClientReference(
  clientReference: string
): Promise<WaveCheckoutSession | null> {
  const result = await waveFetch(
    `/v1/checkout/sessions/search?client_reference=${encodeURIComponent(clientReference)}`
  );
  // Le format exact de la réponse de recherche (liste vs objet unique)
  // n'est pas détaillé dans la doc consultée — on gère les deux formes
  // plausibles plutôt que de supposer.
  if (Array.isArray(result)) return result[0] ?? null;
  if (Array.isArray(result?.items)) return result.items[0] ?? null;
  return result ?? null;
}
