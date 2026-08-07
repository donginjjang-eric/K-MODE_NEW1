"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminCreatorAccount } from "@/lib/db";
import type { AdminCampaignParticipant } from "@/lib/creator-campaigns";
import { adminCampaignOperationMessage, safeHttpsUrl } from "@/lib/admin-campaign-ui";
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
    <div><h2 id="campaign-operations-heading">Participants and invitations</h2><p>Actions are checked again on the server. If another admin changes the campaign first, the latest state is shown after refresh.</p></div>
    <label className="admin-campaign-note">Operation note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note recorded in the event timeline" /></label>
    <p aria-live="polite" className="admin-campaign-error">{message}</p>
    <div className="admin-campaign-participant-list">
      {participants.map((participant) => <article className="admin-campaign-participant" key={participant.id}>
        <header><div><h3>{participant.creator_display_name}</h3><p>{participant.creator_platform} · {participant.creator_market} · {participant.source}</p></div><span className={`admin-campaign-status is-${participant.status}`}>{participant.status}</span></header>
        <p>Next action: {participant.next_action || "-"} · Settlement: {participant.settlement_status}</p>
        <dl className="admin-campaign-operation-data"><div><dt>Submissions</dt><dd>{participant.submissions.length ? participant.submissions.map((submission) => <span key={submission.id}>v{submission.version} {submission.status}: {submission.review_note || "No review note"}<SubmissionLinks submission={submission} /></span>) : "None"}</dd></div><div><dt>Performance</dt><dd>{participant.performance ? `${participant.performance.views} views · ${participant.performance.orders} orders · ${participant.performance.revenue} ${participant.performance.currency}` : "Not reported"}</dd></div><div><dt>Timeline</dt><dd>{participant.events.length ? participant.events.map((event) => <span key={event.id}>{event.message}</span>) : "No activity"}</dd></div></dl>
        <div className="admin-campaign-form-actions">{ACTIONS[participant.status].map(({ action, label }) => <button className="st-btn" disabled={Boolean(busyId)} key={action} onClick={() => request(`/api/admin/participations/${participant.id}`, { action, note }, participant.id)} type="button">{busyId === participant.id ? "Saving…" : label}</button>)}</div>
      </article>)}
      {!participants.length ? <p>No applications or invitations yet.</p> : null}
    </div>
    <div className="admin-campaign-invite">
      <h2>Invite approved creators</h2>
      <label>Search approved creator accounts<input disabled={!canInvite} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, platform, or market" value={query} /></label>
      {!canInvite ? <p>Invitations are available only while the campaign is recruiting.</p> : null}
      {canInvite && invitees.map((creator) => <div className="admin-campaign-invite-row" key={creator.id}><span><strong>{creator.display_name}</strong><small>{creator.google_email || creator.creator_key} · {creator.platform} · {creator.market}</small></span><button className="st-btn" disabled={Boolean(busyId)} onClick={() => invite(creator.id)} type="button">{busyId === `invite-${creator.id}` ? "Sending…" : "Invite"}</button></div>)}
      {canInvite && !invitees.length ? <p>No approved creator accounts match this search.</p> : null}
    </div>
  </section>;
}
