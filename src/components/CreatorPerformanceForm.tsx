"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        setMessage(result.error || "Performance could not be saved.");
        return;
      }
      setMessage("Performance saved.");
      router.refresh();
    } catch {
      setMessage("We could not reach the performance service. Your entered values are still here.");
    } finally {
      setBusy(false);
    }
  };

  return <form className="creator-submission-form" onSubmit={submit}>
    {(["views", "likes", "comments", "orders"] as const).map((name) => <label key={name}>{name}<input type="number" min="0" step="1" value={values[name]} onChange={(event) => updateNumber(name, event.target.value)} required /></label>)}
    <label>Revenue<input type="number" min="0" step="0.01" value={values.revenue} onChange={(event) => updateNumber("revenue", event.target.value)} required /></label>
    <label>Currency<select value={values.currency} onChange={(event) => setValues((current) => ({ ...current, currency: event.target.value }))}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
    <button type="submit" disabled={busy}>{busy ? "Saving..." : "Save performance"}</button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
