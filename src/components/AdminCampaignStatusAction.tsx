"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminCampaignOperationMessage } from "@/lib/admin-campaign-ui";
import { campaignStatusActionLabel, campaignStatusLabel } from "@/lib/admin-campaign";
import type { AdminCampaignStatus } from "@/lib/types";

const NEXT_STATUSES: Record<AdminCampaignStatus, Exclude<AdminCampaignStatus, "draft">[]> = {
  draft: ["recruiting", "closed"],
  recruiting: ["active", "closed"],
  active: ["closed"],
  closed: [],
};

export default function AdminCampaignStatusAction({ campaignId, status }: { campaignId: string; status: AdminCampaignStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function updateStatus(nextStatus: Exclude<AdminCampaignStatus, "draft">) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/campaigns/${campaignId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    setBusy(false);
    if (!response?.ok) {
      const code = typeof result.code === "string" ? result.code : response ? "" : "network_error";
      setMessage(adminCampaignOperationMessage({ status: response?.status ?? 0, code }));
      return;
    }
    router.refresh();
  }

  return <section className="admin-campaign-status-action" aria-labelledby="campaign-status-action-heading">
    <h2 id="campaign-status-action-heading">캠페인 상태</h2>
    <p>현재 상태: <strong>{campaignStatusLabel(status)}</strong></p>
    <div className="admin-campaign-form-actions">
      {NEXT_STATUSES[status].map((nextStatus) => <button className="st-btn" disabled={busy} key={nextStatus} onClick={() => updateStatus(nextStatus)} type="button">{busy ? "상태 변경 중…" : campaignStatusActionLabel(nextStatus)}</button>)}
    </div>
    <p aria-live="polite" className="admin-campaign-error">{message}</p>
  </section>;
}
