"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminCampaignOperationMessage, isAdminCampaignEditable } from "@/lib/admin-campaign-ui";
import type { AdminCampaignStatus } from "@/lib/types";

export default function AdminCampaignListActions({ campaignId, status }: { campaignId: string; status: AdminCampaignStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function closeCampaign() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/campaigns/${campaignId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
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

  return <div className="admin-campaign-list-actions">
    {isAdminCampaignEditable(status) ? <Link className="st-btn" href={`/dashboard/admin/campaigns/${campaignId}/edit`}>수정</Link> : null}
    {status !== "closed" ? <button className="st-btn" data-campaign-close={campaignId} disabled={busy} onClick={closeCampaign} type="button">{busy ? "마감 중…" : "마감"}</button> : null}
    {message ? <span aria-live="polite" className="admin-campaign-error">{message}</span> : null}
  </div>;
}
