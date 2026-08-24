"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminManagedCreatorDetail, CreatorManagementGroupSummary } from "@/lib/creator-management";
import { publicMediaUrl } from "@/lib/public-media-url";
import { creatorApprovalPresentation } from "@/lib/creator-approval-presentation";

const numberFormat = new Intl.NumberFormat("ko-KR");
const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

function dateLabel(value: string | null) {
  if (!value) return "확인 기록 없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

export default function AdminCreatorDetailManager({ creator, groups, durable }: {
  creator: AdminManagedCreatorDetail;
  groups: CreatorManagementGroupSummary[];
  durable: boolean;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(creator.display_name);
  const [approvalStatus, setApprovalStatus] = useState(creator.approval_status);
  const [email, setEmail] = useState(creator.google_email);
  const [profileImageUrl, setProfileImageUrl] = useState(creator.profile_image_url ?? "");
  const [specialty, setSpecialty] = useState(creator.specialty ?? "");
  const [bio, setBio] = useState(creator.bio ?? "");
  const [instagramHandle, setInstagramHandle] = useState(creator.instagram_handle ?? "");
  const [instagramUrl, setInstagramUrl] = useState(creator.instagram_url ?? "");
  const [instagramFollowers, setInstagramFollowers] = useState(String(creator.instagram_followers));
  const [tiktokHandle, setTiktokHandle] = useState(creator.tiktok_handle ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(creator.tiktok_url ?? "");
  const [tiktokFollowers, setTiktokFollowers] = useState(String(creator.tiktok_followers));
  const [targetGroup, setTargetGroup] = useState(creator.managementGroupId ?? "");
  const [busy, setBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [creatorGroupMessage, setCreatorGroupMessage] = useState("");
  const approval = creatorApprovalPresentation(approvalStatus);

  async function api(url: string, init: RequestInit) {
    const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "요청을 처리하지 못했습니다.");
    return body;
  }

  async function saveProfile() {
    setBusy(true);
    setProfileMessage("");
    try {
      const instagramFollowerCount = Number(instagramFollowers);
      const tiktokFollowerCount = Number(tiktokFollowers);
      const followersChanged = instagramFollowerCount !== creator.instagram_followers || tiktokFollowerCount !== creator.tiktok_followers;
      const body: Record<string, unknown> = durable ? {
        displayName,
        approvalStatus,
        profileImageUrl: profileImageUrl || null,
        specialty: specialty || null,
        bio: bio || null,
        instagramHandle: instagramHandle || null,
        instagramUrl: instagramUrl || null,
        instagramFollowers: instagramFollowerCount,
        tiktokHandle: tiktokHandle || null,
        tiktokUrl: tiktokUrl || null,
        tiktokFollowers: tiktokFollowerCount,
      } : {};
      if (followersChanged) body.followersVerifiedAt = new Date().toISOString();
      if (email.trim() && approvalStatus !== "pending") Object.assign(body, { email: email.trim(), status: approvalStatus });
      if (!Object.keys(body).length) throw new Error("회원 연결 이메일과 승인 상태를 입력해 주세요.");
      await api(`/api/admin/creators/${encodeURIComponent(creator.creator_key)}`, { method: "PATCH", body: JSON.stringify(body) });
      setProfileMessage(durable ? "크리에이터 정보를 저장했습니다." : "회원 레코드를 만들고 이메일을 연결했습니다.");
      router.refresh();
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "크리에이터 정보를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function changeApprovalStatus(nextStatus: "approved" | "disabled") {
    setBusy(true);
    setProfileMessage("");
    try {
      await api(`/api/admin/creators/${encodeURIComponent(creator.creator_key)}`, {
        method: "PATCH",
        body: JSON.stringify(durable ? { approvalStatus: nextStatus } : { email: email.trim(), status: nextStatus }),
      });
      setApprovalStatus(nextStatus);
      setProfileMessage(nextStatus === "approved" ? "크리에이터 신청을 승인했습니다." : "크리에이터 신청을 보류했습니다.");
      router.refresh();
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "승인 상태를 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function changeGroup(action: "assign" | "remove") {
    const groupId = action === "assign" ? targetGroup : creator.managementGroupId;
    if (!groupId) return;
    setBusy(true);
    setCreatorGroupMessage("");
    try {
      await api(`/api/admin/creator-groups/${encodeURIComponent(groupId)}/members`, {
        method: "PATCH",
        body: JSON.stringify({ action, creatorAccountIds: [creator.id] }),
      });
      setCreatorGroupMessage(action === "assign" ? "관리 그룹을 지정했습니다." : "관리 그룹에서 제거했습니다.");
      router.refresh();
    } catch (error) {
      setCreatorGroupMessage(error instanceof Error ? error.message : "관리 그룹을 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-creator-detail">
      <header className="admin-detail-head">
        <div><Link href="/dashboard/admin/creators">← 크리에이터 관리</Link><p className="st-eyebrow">CREATOR PROFILE</p><h1 className="st-title">{creator.display_name}</h1><p className="st-sub">공개 정보와 내부 회원·그룹 상태를 한 화면에서 관리합니다.</p></div>
        <div className="admin-creator-detail-image">{publicMediaUrl(profileImageUrl) ? <img src={publicMediaUrl(profileImageUrl) || ""} alt={`${creator.display_name} 프로필`} /> : creator.display_name.slice(0, 1)}</div>
      </header>

      <section className={`admin-creator-approval-panel is-${approval.tone}`} aria-label="크리에이터 신청 승인" aria-live="polite">
        <div className="admin-creator-approval-summary"><span>APPLICATION STATUS</span><strong><b aria-hidden="true">{approval.icon}</b>{approval.title}</strong><p>{approval.description}</p></div>
        <div className="admin-creator-approval-actions">
          <button className="st-btn dark" type="button" disabled={busy || approvalStatus === "approved"} onClick={() => changeApprovalStatus("approved")}>{approval.actionLabel}</button>
          <button className="st-btn light" type="button" disabled={busy || approvalStatus === "disabled"} onClick={() => changeApprovalStatus("disabled")}>승인 보류</button>
        </div>
      </section>

      {profileMessage ? <div className={`admin-approval-toast is-${approval.tone}`} role="status"><b aria-hidden="true">{approval.icon}</b><div><strong>{approval.title}</strong><span>{profileMessage}</span></div></div> : null}

      <section className="admin-detail-section" aria-labelledby="creator-profile-heading">
        <div className="admin-section-heading"><div><p>PUBLIC</p><h2 id="creator-profile-heading">공개 프로필</h2></div><span>{durable ? "저장된 회원 레코드" : "회원 레코드 없음"}</span></div>
        <div className="admin-detail-form-grid">
          <label><span>표시 이름</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={!durable || busy} /></label>
          <label><span>승인 상태</span><output className={`admin-approval-readonly is-${approval.tone}`}>{approval.icon} {approval.title}</output></label>
          <label className="is-wide"><span>프로필 이미지 URL</span><input value={profileImageUrl} onChange={(event) => setProfileImageUrl(event.target.value)} disabled={!durable || busy} /></label>
          <label><span>전문 분야</span><input value={specialty} onChange={(event) => setSpecialty(event.target.value)} disabled={!durable || busy} /></label>
          <label><span>Google 이메일</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="creator@gmail.com" disabled={busy} /></label>
          <label className="is-wide"><span>소개</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} disabled={!durable || busy} /></label>
        </div>
      </section>

      <section className="admin-detail-section" aria-labelledby="creator-social-heading">
        <div className="admin-section-heading"><div><p>SOCIAL</p><h2 id="creator-social-heading">SNS 및 팔로워</h2></div><span>확인 시각 {dateLabel(creator.followers_verified_at)}</span></div>
        <div className="admin-social-columns">
          <div><h3>Instagram</h3><label><span>핸들</span><input value={instagramHandle} onChange={(event) => setInstagramHandle(event.target.value)} disabled={!durable || busy} /></label><label><span>URL</span><input value={instagramUrl} onChange={(event) => setInstagramUrl(event.target.value)} disabled={!durable || busy} /></label><label><span>팔로워</span><input type="number" min="0" value={instagramFollowers} onChange={(event) => setInstagramFollowers(event.target.value)} disabled={!durable || busy} /></label></div>
          <div><h3>TikTok</h3><label><span>핸들</span><input value={tiktokHandle} onChange={(event) => setTiktokHandle(event.target.value)} disabled={!durable || busy} /></label><label><span>URL</span><input value={tiktokUrl} onChange={(event) => setTiktokUrl(event.target.value)} disabled={!durable || busy} /></label><label><span>팔로워</span><input type="number" min="0" value={tiktokFollowers} onChange={(event) => setTiktokFollowers(event.target.value)} disabled={!durable || busy} /></label></div>
        </div>
        <div className="admin-detail-actions"><button className="st-btn dark" type="button" disabled={busy} onClick={saveProfile}>정보 저장</button></div>
      </section>

      <section className="admin-detail-section" aria-labelledby="creator-internal-heading">
        <div className="admin-section-heading"><div><p>INTERNAL</p><h2 id="creator-internal-heading">회원·관리 상태</h2></div></div>
        <dl className="admin-detail-facts"><div><dt>가입 경로</dt><dd>{creator.onboarding_source === "admin" ? "관리자 등록" : "직접 가입"}</dd></div><div><dt>계정 상태</dt><dd>{creator.user_id ? "회원 연결" : "미연결"}</dd></div><div><dt>귀속 상태</dt><dd>{creator.claim_state === "claimed" ? "귀속 완료" : "미귀속"}</dd></div><div><dt>현재 관리 그룹</dt><dd>{creator.managementGroupName || "미지정"}</dd></div></dl>
        <div className="admin-group-inline-action"><select aria-label="관리 그룹 선택" value={targetGroup} onChange={(event) => setTargetGroup(event.target.value)} disabled={!durable || busy}><option value="">관리 그룹 선택</option>{groups.filter((group) => group.status === "active").map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select><button className="st-btn" type="button" disabled={!durable || busy || !targetGroup} onClick={() => changeGroup("assign")}>그룹 지정·이동</button><button className="st-btn light" type="button" disabled={!durable || busy || !creator.managementGroupId} onClick={() => changeGroup("remove")}>그룹에서 제거</button></div>
        {creatorGroupMessage ? <p className="admin-operation-message" role="status">{creatorGroupMessage}</p> : null}
      </section>

      <section className="admin-detail-section" aria-labelledby="creator-campaign-heading">
        <div className="admin-section-heading"><div><p>ACTIVITY</p><h2 id="creator-campaign-heading">캠페인 이력</h2></div></div>
        {creator.campaigns.length ? <div className="admin-creator-campaign-list">{creator.campaigns.map((campaign) => <article key={campaign.campaignId}><div><strong>{campaign.campaignTitle}</strong><span>{campaign.participationStatus}</span></div><p>예상 리워드 {campaign.expectedReward || "미입력"} · 정산 {campaign.settlementStatus || "없음"}</p></article>)}</div> : <p className="admin-factual-empty">연결된 캠페인 이력이 없습니다.</p>}
      </section>

      <section className="admin-detail-section" aria-labelledby="creator-settlement-heading">
        <div className="admin-section-heading"><div><p>SETTLEMENT</p><h2 id="creator-settlement-heading">정산 요약</h2></div></div>
        <dl className="admin-detail-facts"><div><dt>실적 금액 합계</dt><dd>{numberFormat.format(creator.settlement.expectedRewardTotal)}</dd></div><div><dt>정산 완료</dt><dd>{creator.settlement.settledCount}건</dd></div><div><dt>미정산</dt><dd>{creator.settlement.unsettledCount}건</dd></div></dl>
      </section>
    </div>
  );
}
