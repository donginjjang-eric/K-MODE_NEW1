"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminCreatorAccount } from "@/lib/db";
import type { AdminCampaignParticipant } from "@/lib/creator-campaigns";
import { adminCampaignOperationMessage, safeHttpsUrl } from "@/lib/admin-campaign-ui";
import { campaignEventMessageLabel, participationNextActionLabel, participationSourceLabel, participationStatusLabel, settlementStatusLabel, submissionStatusLabel } from "@/lib/admin-campaign";
import type { AdminParticipationAction, CampaignStatus, ContentSubmission, ParticipationStatus } from "@/lib/types";

const ACTIONS: Record<ParticipationStatus, Array<{ action: AdminParticipationAction; label: string }>> = {
  applied: [{ action: "approve", label: "신청 승인" }, { action: "reject", label: "신청 거절" }],
  invited: [{ action: "cancel", label: "초대 취소" }],
  matched: [{ action: "shipping", label: "배송 시작" }, { action: "cancel", label: "참여 취소" }],
  shipping: [{ action: "creating", label: "제작 시작" }, { action: "cancel", label: "참여 취소" }],
  creating: [{ action: "review", label: "검수 요청" }, { action: "cancel", label: "참여 취소" }],
  review: [{ action: "creating", label: "수정 요청" }, { action: "published", label: "게시 승인" }, { action: "cancel", label: "참여 취소" }],
  published: [{ action: "settlement", label: "정산 시작" }, { action: "cancel", label: "참여 취소" }],
  settlement: [{ action: "completed", label: "완료 처리" }, { action: "cancel", label: "참여 취소" }],
  completed: [],
  cancelled: [],
};

function SubmissionLinks({ submission }: { submission: ContentSubmission }) {
  const contentUrl = safeHttpsUrl(submission.content_url);
  const publishedUrl = safeHttpsUrl(submission.published_url);
  return <span className="admin-campaign-submission-links">
    {contentUrl ? <a href={contentUrl} rel="noopener noreferrer" target="_blank">제출 콘텐츠</a> : <span>제출 링크를 확인할 수 없습니다.</span>}
    {submission.published_url ? publishedUrl ? <a href={publishedUrl} rel="noopener noreferrer" target="_blank">게시 콘텐츠</a> : <span>게시 링크를 확인할 수 없습니다.</span> : null}
  </span>;
}

export default function AdminCampaignOperations({ campaignId, campaignStatus, participants, creators }: {
  campaignId: string;
  campaignStatus: CampaignStatus;
  participants: AdminCampaignParticipant[];
  creators: AdminCreatorAccount[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const participantCreatorIds = useMemo(() => new Set(participants.map((participant) => participant.creator_account_id)), [participants]);
  const invitees = useMemo(() => creators.filter((creator) => creator.approval_status === "approved" && !participantCreatorIds.has(creator.id) && `${creator.display_name} ${creator.google_email} ${creator.platform} ${creator.market}`.toLowerCase().includes(query.trim().toLowerCase())), [creators, participantCreatorIds, query]);
  const canInvite = campaignStatus === "recruiting";

  async function request(url: string, body: object, id: string) {
    setBusyId(id);
    setMessage("");
    const response = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    setBusyId("");
    if (!response?.ok) {
      const code = typeof result.code === "string" ? result.code : response ? "" : "network_error";
      setMessage(adminCampaignOperationMessage({ status: response?.status ?? 0, code }));
      return;
    }
    setNote("");
    router.refresh();
  }

  async function invite(creatorId: string) {
    setBusyId(`invite-${creatorId}`);
    setMessage("");
    const response = await fetch(`/api/admin/campaigns/${campaignId}/invitations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creatorId }) }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    setBusyId("");
    if (!response?.ok) {
      const code = typeof result.code === "string" ? result.code : response ? "" : "network_error";
      setMessage(adminCampaignOperationMessage({ status: response?.status ?? 0, code }));
      return;
    }
    router.refresh();
  }

  return <section className="admin-campaign-operations" aria-labelledby="campaign-operations-heading">
    <div><h2 id="campaign-operations-heading">참여자 및 초대 관리</h2><p>운영 작업은 서버에서 다시 확인합니다. 다른 관리자가 먼저 변경한 경우 새로고침 후 최신 상태가 표시됩니다.</p></div>
    <label className="admin-campaign-note">운영 메모<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="선택 사항: 운영 이력에 남길 메모를 입력하세요." /></label>
    <p aria-live="polite" className="admin-campaign-error">{message}</p>
    <div className="admin-campaign-participant-list">
      {participants.map((participant) => <article className="admin-campaign-participant" key={participant.id}>
        <header><div><h3>{participant.creator_display_name}</h3><p>{participant.creator_platform} · {participant.creator_market} · {participationSourceLabel(participant.source)}</p></div><span className={`admin-campaign-status is-${participant.status}`}>{participationStatusLabel(participant.status)}</span></header>
        <p>다음 작업: {participant.next_action ? participationNextActionLabel(participant.next_action) : "없음"} · 정산 상태: {settlementStatusLabel(participant.settlement_status)}</p>
        <dl className="admin-campaign-operation-data"><div><dt>콘텐츠 제출</dt><dd>{participant.submissions.length ? participant.submissions.map((submission) => <span key={submission.id}>v{submission.version} {submissionStatusLabel(submission.status)}: {submission.review_note || "검수 메모 없음"}<SubmissionLinks submission={submission} /></span>) : "제출된 콘텐츠 없음"}</dd></div><div><dt>성과</dt><dd>{participant.performance ? `조회 ${participant.performance.views} · 주문 ${participant.performance.orders} · ${participant.performance.revenue} ${participant.performance.currency}` : "집계된 성과 없음"}</dd></div><div><dt>운영 이력</dt><dd>{participant.events.length ? participant.events.map((event) => <span key={event.id}>{campaignEventMessageLabel(event.message)}</span>) : "운영 이력 없음"}</dd></div></dl>
        <div className="admin-campaign-form-actions">{ACTIONS[participant.status].map(({ action, label }) => <button className="st-btn" disabled={Boolean(busyId)} key={action} onClick={() => request(`/api/admin/participations/${participant.id}`, { action, note }, participant.id)} type="button">{busyId === participant.id ? "저장 중…" : label}</button>)}</div>
      </article>)}
      {!participants.length ? <p>아직 신청하거나 초대된 크리에이터가 없습니다.</p> : null}
    </div>
    <div className="admin-campaign-invite">
      <h2>승인된 크리에이터 초대</h2>
      <label>승인된 크리에이터 검색<input disabled={!canInvite} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 이메일, 플랫폼 또는 시장" value={query} /></label>
      {!canInvite ? <p>크리에이터 초대는 캠페인 모집 중에만 가능합니다.</p> : null}
      {canInvite && invitees.map((creator) => <div className="admin-campaign-invite-row" key={creator.id}><span><strong>{creator.display_name}</strong><small>{creator.google_email || creator.creator_key} · {creator.platform} · {creator.market}</small></span><button className="st-btn" disabled={Boolean(busyId)} onClick={() => invite(creator.id)} type="button">{busyId === `invite-${creator.id}` ? "초대 전송 중…" : "초대하기"}</button></div>)}
      {canInvite && !invitees.length ? <p>검색 조건에 맞는 승인된 크리에이터가 없습니다.</p> : null}
    </div>
  </section>;
}
