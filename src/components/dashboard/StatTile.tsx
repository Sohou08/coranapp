import { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="text-[28px] font-extrabold leading-none">{value}</p>
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </Card>
  );
}
