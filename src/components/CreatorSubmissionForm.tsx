"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatorSubmissionForm({ participationId }: { participationId: string }) {
  const [contentUrl, setContentUrl] = useState("");
  const [captionText, setCaptionText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/creator/participations/${participationId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentUrl, captionText }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "We could not submit your content. Please try again.");
        return;
      }
      setContentUrl("");
      setCaptionText("");
      setMessage(`Version ${result.submission?.version || ""} sent for review.`);
      router.refresh();
    } catch {
      setMessage("We could not reach the submission service. Your entered details are still here.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="creator-submission-form" onSubmit={submit}>
      <label>Published or draft URL<input type="url" value={contentUrl} onChange={(event) => setContentUrl(event.target.value)} placeholder="https://..." required /></label>
      <label>Caption<textarea value={captionText} onChange={(event) => setCaptionText(event.target.value)} rows={4} /></label>
      <button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</button>
      <p role="status" aria-live="polite">{message}</p>
    </form>
  );
}
