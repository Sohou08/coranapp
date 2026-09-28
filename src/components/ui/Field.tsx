import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const fieldWrap = "flex flex-col gap-1.5";
const labelCls = "text-[12px] font-semibold text-[var(--color-neutral-700)]";
const controlCls =
  "border border-[var(--color-divider)] bg-white px-3 py-2.5 text-[14px] text-[var(--color-text)] outline-none focus-visible:border-[var(--color-accent-700)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-200)]";

export function TextField({
  label,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={fieldWrap}>
      <span className={labelCls}>{label}</span>
      <input className={controlCls} {...rest} />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...rest
}: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={fieldWrap}>
      <span className={labelCls}>{label}</span>
      <select className={controlCls} {...rest}>
        {children}
      </select>
    </label>
  );
}
