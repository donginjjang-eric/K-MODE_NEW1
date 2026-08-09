"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApplyState = "idle" | "pending" | "success" | "duplicate" | "closed" | "error";

export default function CreatorCampaignApplyButton({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<ApplyState>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const busy = state === "pending";
  const terminalState = state === "success" || state === "duplicate" || state === "closed";

  const apply = async () => {
    setState("pending");
    setMessage("");
    try {
      const response = await fetch(`/api/creator/campaigns/${campaignId}/apply`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.code === "duplicate") {
          setState("duplicate");
          setMessage("이미 지원한 캠페인입니다.");
          return;
        }
        if (result.code === "closed") {
          setState("closed");
          setMessage("이 캠페인은 모집이 마감되었습니다.");
          return;
        }
        setState("error");
        setMessage("지원하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setState("success");
      setMessage("지원이 완료되었습니다. 진행 상황은 내 미션에서 확인할 수 있습니다.");
      router.refresh();
    } catch {
      setState("error");
      setMessage("지원 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const label = busy ? "지원 중…" : state === "success" ? "지원 완료" : state === "duplicate" ? "이미 지원함" : state === "closed" ? "모집 마감" : state === "error" ? "다시 시도" : "지금 지원하기";

  return (
    <div className="creator-apply-action">
      <button type="button" onClick={apply} disabled={busy || terminalState} aria-describedby={`application-status-${campaignId}`}>
        {label}
      </button>
      <p id={`application-status-${campaignId}`} aria-live="polite" role="status">{message}</p>
    </div>
  );
}
