"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { campaignStatusActionLabel } from "@/lib/admin-campaign";
import type { AdminCampaignStatus, AdminParticipationAction, ParticipationStatus } from "@/lib/types";

const NEXT_CAMPAIGN_STATUSES: Record<AdminCampaignStatus, Exclude<AdminCampaignStatus, "draft">[]> = {
  draft: ["recruiting", "closed"],
  recruiting: ["active", "closed"],
  active: ["closed"],
  closed: [],
};

const PARTICIPATION_ACTIONS: Record<ParticipationStatus, Array<{ action: AdminParticipationAction; label: string }>> = {
  applied: [{ action: "approve", label: "신청 승인" }, { action: "reject", label: "신청 거절" }],
  invited: [{ action: "cancel", label: "초대 취소" }],
  matched: [{ action: "shipping", label: "배송 시작" }, { action: "cancel", label: "참여 취소" }],
  shipping: [{ action: "creating", label: "제작 시작" }, { action: "cancel", label: "참여 취소" }],
  creating: [{ action: "review", label: "검수 시작" }, { action: "cancel", label: "참여 취소" }],
  review: [{ action: "creating", label: "수정 요청" }, { action: "published", label: "콘텐츠 승인" }],
  published: [{ action: "settlement", label: "정산 시작" }, { action: "cancel", label: "참여 취소" }],
  settlement: [{ action: "completed", label: "운영 완료" }, { action: "cancel", label: "참여 취소" }],
  completed: [],
  cancelled: [],
};

async function mutate(url: string, body: object) {
  const response = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const result = response ? await response.json().catch(() => ({})) : {};
  return { ok: Boolean(response?.ok), error: typeof result.error === "string" ? result.error : "요청을 저장하지 못했습니다." };
}

export function BeautyCampaignStatusActions({ campaignId, status }: { campaignId: string; status: AdminCampaignStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function update(nextStatus: Exclude<AdminCampaignStatus, "draft">) {
    setBusy(true);
    setMessage("");
    const result = await mutate(`/api/beauty/campaigns/${campaignId}/status`, { status: nextStatus });
    setBusy(false);
    if (!result.ok) setMessage(result.error);
    else router.refresh();
  }

  return <div className="beauty-inline-actions">
    {NEXT_CAMPAIGN_STATUSES[status].map((nextStatus) => <button className="beauty-action" disabled={busy} key={nextStatus} onClick={() => update(nextStatus)} type="button">{campaignStatusActionLabel(nextStatus)}</button>)}
    {message ? <p className="beauty-form-error" role="alert">{message}</p> : null}
  </div>;
}

export function BeautyParticipationActions({ participationId, status, submissionId }: { participationId: string; status: ParticipationStatus; submissionId?: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const actions = PARTICIPATION_ACTIONS[status];
  if (!actions.length) return null;

  async function update(action: AdminParticipationAction) {
    if (status === "review" && action === "creating" && !note.trim()) {
      setMessage("수정 요청 사유를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setMessage("");
    const result = await mutate(`/api/beauty/participations/${participationId}`, { action, note, submissionId });
    setBusy(false);
    if (!result.ok) setMessage(result.error);
    else {
      setNote("");
      router.refresh();
    }
  }

  return <div className="beauty-participation-actions">
    {status === "review" ? <label>검수 메모<textarea onChange={(event) => setNote(event.target.value)} placeholder="승인 의견 또는 수정 요청 사유" value={note} /></label> : null}
    <div className="beauty-inline-actions">{actions.map(({ action, label }) => <button className="beauty-action" disabled={busy} key={action} onClick={() => update(action)} type="button">{busy ? "저장 중…" : label}</button>)}</div>
    {message ? <p className="beauty-form-error" role="alert">{message}</p> : null}
  </div>;
}
