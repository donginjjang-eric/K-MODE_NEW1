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
        setMessage("초대 상태를 변경하지 못했습니다.");
        return;
      }
      setMessage(accept ? "초대를 수락했습니다." : "초대를 거절했습니다.");
      router.refresh();
    } catch {
      setMessage("초대 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="creator-invitation-actions">
      <button type="button" onClick={() => respond(true)} disabled={busy}>초대 수락</button>
      <button type="button" onClick={() => respond(false)} disabled={busy}>초대 거절</button>
      <p role="status" aria-live="polite">{message}</p>
    </div>
  );
}
