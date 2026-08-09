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
        setMessage("콘텐츠를 제출하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.");
        return;
      }
      setContentUrl("");
      setCaptionText("");
      setMessage(`제출본 ${result.submission?.version || ""}을 검수 요청했습니다.`);
      router.refresh();
    } catch {
      setMessage("제출 서비스에 연결하지 못했습니다. 입력 내용은 그대로 유지됩니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="creator-submission-form" onSubmit={submit}>
      <label>게시 또는 임시저장 URL<input type="url" value={contentUrl} onChange={(event) => setContentUrl(event.target.value)} placeholder="https://..." required /></label>
      <label>게시 문구<textarea value={captionText} onChange={(event) => setCaptionText(event.target.value)} rows={4} /></label>
      <button type="submit" disabled={busy}>{busy ? "제출 중…" : "검수 요청하기"}</button>
      <p role="status" aria-live="polite">{message}</p>
    </form>
  );
}
