"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creatorFieldLabel } from "@/lib/creator-copy";

const currencies = ["KRW", "USD", "VND", "TWD", "MYR"] as const;

export default function CreatorPerformanceForm({ participationId }: { participationId: string }) {
  const [values, setValues] = useState({ views: 0, likes: 0, comments: 0, orders: 0, revenue: 0, currency: "KRW" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const updateNumber = (name: "views" | "likes" | "comments" | "orders" | "revenue", value: string) => {
    setValues((current) => ({ ...current, [name]: Number(value) }));
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/creator/participations/${participationId}/performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage("성과를 저장하지 못했습니다. 입력 내용을 확인해 주세요.");
        return;
      }
      setMessage("성과가 저장되었습니다.");
      router.refresh();
    } catch {
      setMessage("성과 서비스에 연결하지 못했습니다. 입력한 값은 그대로 유지됩니다.");
    } finally {
      setBusy(false);
    }
  };

  return <form className="creator-submission-form" onSubmit={submit}>
    {(["views", "likes", "comments", "orders"] as const).map((name) => <label key={name}>{creatorFieldLabel(name)}<input type="number" min="0" step="1" value={values[name]} onChange={(event) => updateNumber(name, event.target.value)} required /></label>)}
    <label>{creatorFieldLabel("revenue")}<input type="number" min="0" step="0.01" value={values.revenue} onChange={(event) => updateNumber("revenue", event.target.value)} required /></label>
    <label>{creatorFieldLabel("currency")}<select value={values.currency} onChange={(event) => setValues((current) => ({ ...current, currency: event.target.value }))}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
    <button type="submit" disabled={busy}>{busy ? "저장 중…" : "성과 저장"}</button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
