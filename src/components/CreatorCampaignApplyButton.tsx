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
          setMessage(result.error || "You have already applied to this campaign.");
          return;
        }
        if (result.code === "closed") {
          setState("closed");
          setMessage(result.error || "This campaign is no longer accepting applications.");
          return;
        }
        setState("error");
        setMessage(result.error || "We could not submit your application. Try again.");
        return;
      }
      setState("success");
      setMessage("Application submitted. We will update your campaign status here.");
      router.refresh();
    } catch {
      setState("error");
      setMessage("We could not reach the application service. Try again.");
    }
  };

  const label = busy ? "Submitting…" : state === "success" ? "Applied" : state === "duplicate" ? "Already applied" : state === "closed" ? "Applications closed" : state === "error" ? "다시 시도" : "Apply now";

  return (
    <div className="creator-apply-action">
      <button type="button" onClick={apply} disabled={busy || terminalState} aria-describedby={`application-status-${campaignId}`}>
        {label}
      </button>
      <p id={`application-status-${campaignId}`} aria-live="polite" role="status">{message}</p>
    </div>
  );
}
