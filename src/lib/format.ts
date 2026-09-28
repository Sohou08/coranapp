// Petits helpers de formatage (dates/heures en français) — utilisés dans
// tout l'espace parent/élève pour éviter de répéter des appels
// Intl.DateTimeFormat partout.

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

// "lun. 6 oct."
export function formatDateFr(value: string | Date): string {
  const date = toDate(value);
  const s = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
  return s.replace(/\.?$/, ".");
}

// "6 oct. 2026" (sans jour de semaine — pour les tableaux)
export function formatDateShortFr(value: string | Date): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

// "18h00"
export function formatTimeFr(value: string | Date): string {
  const date = toDate(value);
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h}h${m.toString().padStart(2, "0")}`;
}

// "lun. 6 oct. · 18h00"
export function formatDateTimeFr(value: string | Date): string {
  return `${formatDateFr(value)} · ${formatTimeFr(value)}`;
}

export function computeAge(birthYear: number | null | undefined): number | null {
  if (!birthYear) return null;
  const now = new Date().getFullYear();
  const age = now - birthYear;
  return age > 0 && age < 120 ? age : null;
}

// "18h00" à partir d'une valeur "time" Postgres ("18:00:00").
export function formatTimeStringFr(value: string): string {
  const [h, m] = value.split(":");
  return `${parseInt(h, 10)}h${(m ?? "00").padStart(2, "0")}`;
}

export function formatPrice(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
}
