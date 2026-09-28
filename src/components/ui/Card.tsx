import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-[var(--color-divider)] ${
        padded ? "p-5" : ""
      } ${className}`}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "neutral";
}) {
  const cls =
    tone === "accent"
      ? "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
      : "bg-[var(--color-neutral-200)] text-[var(--color-neutral-700)]";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-1 ${cls}`}
    >
      {children}
    </span>
  );
}
