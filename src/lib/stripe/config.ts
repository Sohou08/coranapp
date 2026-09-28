// Taux de commission de la plateforme sur chaque paiement (cours ponctuel ou
// abonnement). Validé par Aida le 27/09/2026. Ajustable ici en un seul
// endroit si besoin de le revoir plus tard.
export const PLATFORM_COMMISSION_RATE = 0.15;

export function computeApplicationFeeAmount(totalAmountCents: number) {
  return Math.round(totalAmountCents * PLATFORM_COMMISSION_RATE);
}
