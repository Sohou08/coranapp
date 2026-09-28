export function ProgressBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-[12px] text-muted">{clamped}%</span>
      </div>
      <div className="h-2 w-full bg-[var(--color-neutral-200)]">
        <div
          className="h-2 bg-[var(--color-accent-700)]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
