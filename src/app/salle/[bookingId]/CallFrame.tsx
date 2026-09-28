"use client";

// Salle vidéo embarquée : instancie l'iframe Daily prête à l'emploi
// (mute/caméra/quitter déjà fournis par Daily) directement dans notre page,
// via le SDK JS (@daily-co/daily-js). C'est ce qui garantit qu'enseignant
// et famille restent sur sanad.* pendant tout le cours — condition du
// principe anti-désintermédiation de Sanad (voir le contexte produit fourni
// pour cette tâche) : jamais de redirection vers une URL daily.co qui
// donnerait l'impression de quitter la plateforme.
import { useEffect, useRef, useState } from "react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

export function CallFrame({ roomUrl, token }: { roomUrl: string; token: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0",
      },
      showLeaveButton: true,
    });
    callFrameRef.current = callFrame;

    callFrame
      .join({ url: roomUrl, token })
      .catch(() => setError("Impossible de rejoindre la salle vidéo pour le moment."));

    return () => {
      // Détruit systématiquement l'iframe au démontage — sinon Daily garde
      // la connexion WebRTC ouverte même après avoir quitté la page.
      callFrame.destroy();
      callFrameRef.current = null;
    };
  }, [roomUrl, token]);

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[13px] text-red-800">{error}</p>}
      <div ref={containerRef} className="w-full" style={{ height: "70vh", minHeight: 420 }} />
    </div>
  );
}
