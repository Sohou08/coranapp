import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 font-extrabold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const sizes: Record<Size, string> = {
  md: "text-[13px] px-5 py-3",
  sm: "text-[12px] px-4 py-2",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent-800)] text-white hover:bg-[var(--color-accent-900)]",
  secondary:
    "bg-transparent text-[var(--color-accent-800)] border border-[var(--color-accent-800)] hover:bg-[var(--color-accent-100)]",
  ghost:
    "bg-transparent text-[var(--color-text)] border border-[var(--color-divider)] hover:bg-[var(--color-neutral-100)]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
