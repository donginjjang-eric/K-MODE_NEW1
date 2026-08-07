"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatorInvitationActions({ participationId }: { participationId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const respond = async (accept: boolean) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/creator/participations/${participationId}/invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "We could not update this invitation.");
        return;
      }
      setMessage(accept ? "Invitation accepted." : "Invitation declined.");
      router.refresh();
    } catch {
      setMessage("We could not reach the invitation service. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="creator-invitation-actions">
      <button type="button" onClick={() => respond(true)} disabled={busy}>Accept invitation</button>
      <button type="button" onClick={() => respond(false)} disabled={busy}>Decline invitation</button>
      <p role="status" aria-live="polite">{message}</p>
    </div>
  );
}
