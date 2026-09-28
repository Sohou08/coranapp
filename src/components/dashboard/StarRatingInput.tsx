"use client";

import { useState } from "react";

// Sélecteur d'étoiles pour le formulaire d'avis — champ radio caché +
// étoiles cliquables (pas de dépendance JS externe).
export function StarRatingInput({ name = "rating" }: { name?: string }) {
  const [value, setValue] = useState(5);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 text-[28px] leading-none">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            onClick={() => setValue(n)}
            className="transition-transform hover:scale-110"
            style={{ opacity: n <= value ? 1 : 0.3 }}
          >
            ⭐
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
