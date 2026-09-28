const steps = ["Cours", "Date & heure", "Élève", "Paiement", "Confirmation"];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {steps.map((label, i) => {
        const state =
          i < current ? "done" : i === current ? "active" : "pending";
        return (
          <div
            key={label}
            className="flex items-center gap-2 text-[12px] font-semibold px-3 py-1.5"
            style={{
              background:
                state === "done"
                  ? "var(--color-accent-800)"
                  : state === "active"
                    ? "var(--color-accent-200)"
                    : "var(--color-neutral-100)",
              color:
                state === "done"
                  ? "#fff"
                  : state === "active"
                    ? "var(--color-accent-900)"
                    : "var(--color-neutral-600)",
            }}
          >
            {i + 1}. {label}
          </div>
        );
      })}
    </div>
  );
}
