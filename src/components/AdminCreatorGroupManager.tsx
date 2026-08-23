"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminManagedCreator, CreatorManagementGroupDetail, CreatorManagementGroupSummary } from "@/lib/creator-management";

const numberFormat = new Intl.NumberFormat("ko-KR");
const auditLabels: Record<string, string> = {
  group_created: "그룹 생성",
  group_updated: "그룹 정보 변경",
  creator_assigned: "크리에이터 배정",
  creator_moved: "크리에이터 그룹 이동",
  creator_removed: "크리에이터 제거",
  agency_user_invited: "대행사 사용자 초대",
  agency_user_revoked: "대행사 연결 해제",
};

export default function AdminCreatorGroupManager({ group, creators, groups }: {
  group: CreatorManagementGroupDetail;
  creators: AdminManagedCreator[];
  groups: CreatorManagementGroupSummary[];
}) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [agencyName, setAgencyName] = useState(group.agencyName ?? "");
  const [notes, setNotes] = useState(group.notes ?? "");
  const [availableSearch, setAvailableSearch] = useState("");
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState("");
  const [agencyEmail, setAgencyEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const memberIds = useMemo(() => new Set(group.creators.map((creator) => creator.id)), [group.creators]);
  const available = useMemo(() => {
    const term = availableSearch.trim().toLocaleLowerCase();
    return creators.filter((creator) => !memberIds.has(creator.id) && (!term || [creator.display_name, creator.creator_key, creator.instagram_handle, creator.tiktok_handle].filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(term))));
  }, [availableSearch, creators, memberIds]);

  async function api(url: string, init: RequestInit) {
    const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "요청을 처리하지 못했습니다.");
    return body;
  }

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
      setSelectedAvailable(new Set());
      setSelectedMembers(new Set());
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "작업을 완료하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(setter: typeof setSelectedMembers, id: string) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const memberPatch = (targetGroupId: string, action: "assign" | "remove", creatorAccountIds: string[]) => api(
    `/api/admin/creator-groups/${encodeURIComponent(targetGroupId)}/members`,
    { method: "PATCH", body: JSON.stringify({ action, creatorAccountIds }) },
  ).then(() => undefined);

  return (
    <div className="admin-group-detail">
      <header className="admin-detail-head"><div><Link href="/dashboard/admin/creator-groups">← 관리 그룹</Link><p className="st-eyebrow">MANAGEMENT GROUP</p><h1 className="st-title">{group.name}</h1><p className="st-sub">구성원과 대행사 접근 범위를 이 그룹 기준으로 관리합니다.</p></div><span className={`admin-group-status is-${group.status}`}>{group.status === "active" ? "운영 중" : "비활성"}</span></header>
      <dl className="admin-detail-facts admin-group-metrics"><div><dt>소속 크리에이터</dt><dd>{group.creatorCount}명</dd></div><div><dt>총 팔로워</dt><dd>{numberFormat.format(group.followerTotal)}</dd></div><div><dt>대행사</dt><dd>{group.agencyName || "미지정"}</dd></div><div><dt>상태</dt><dd>{group.status === "active" ? "운영 중" : "비활성"}</dd></div></dl>

      <section className="admin-detail-section" aria-labelledby="group-profile-heading"><div className="admin-section-heading"><div><p>SETTINGS</p><h2 id="group-profile-heading">그룹 정보 수정</h2></div></div><div className="admin-detail-form-grid"><label><span>그룹명</span><input value={name} onChange={(event) => setName(event.target.value)} disabled={busy} /></label><label><span>대행사명</span><input value={agencyName} onChange={(event) => setAgencyName(event.target.value)} disabled={busy} /></label><label className="is-wide"><span>관리 메모</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={busy} /></label></div><div className="admin-detail-actions"><button className="st-btn dark" type="button" disabled={busy || !name.trim()} onClick={() => run(() => api(`/api/admin/creator-groups/${group.id}`, { method: "PATCH", body: JSON.stringify({ name, agencyName: agencyName || null, notes: notes || null }) }).then(() => undefined), "그룹 정보를 저장했습니다.")}>저장</button><button className="st-btn light" type="button" disabled={busy || group.status === "inactive"} onClick={() => run(() => api(`/api/admin/creator-groups/${group.id}`, { method: "PATCH", body: JSON.stringify({ status: "inactive" }) }).then(() => undefined), "그룹을 비활성화했습니다.")}>비활성화</button>{message ? <p role="status">{message}</p> : null}</div></section>

      <section className="admin-detail-section" aria-labelledby="group-members-heading"><div className="admin-section-heading"><div><p>MEMBERS</p><h2 id="group-members-heading">구성원 관리</h2></div><span>{group.creators.length}명</span></div>
        <div className="admin-member-columns">
          <div><h3>현재 구성원</h3><div className="admin-member-list">{group.creators.length ? group.creators.map((creator) => <label key={creator.id}><input type="checkbox" checked={selectedMembers.has(creator.id)} onChange={() => toggle(setSelectedMembers, creator.id)} /><span><strong>{creator.display_name}</strong><small>{numberFormat.format(creator.followerTotal)} 팔로워 · {creator.market}</small></span></label>) : <p className="admin-factual-empty">배정된 크리에이터가 없습니다.</p>}</div><div className="admin-member-actions"><button className="st-btn light" type="button" disabled={busy || !selectedMembers.size} onClick={() => run(() => memberPatch(group.id, "remove", [...selectedMembers]), "선택한 구성원을 제거했습니다.")}>구성원 제거</button><select aria-label="이동할 관리 그룹" value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)}><option value="">이동할 그룹</option>{groups.filter((item) => item.id !== group.id && item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="st-btn" type="button" disabled={busy || !selectedMembers.size || !moveTarget} onClick={() => run(() => memberPatch(moveTarget, "assign", [...selectedMembers]), "선택한 구성원을 다른 그룹으로 이동했습니다.")}>그룹 이동</button></div></div>
          <div><h3>구성원 배정</h3><input className="admin-member-search" type="search" value={availableSearch} onChange={(event) => setAvailableSearch(event.target.value)} placeholder="이름 또는 핸들 검색" aria-label="배정할 크리에이터 검색" /><div className="admin-member-list">{available.slice(0, 30).map((creator) => <label key={creator.id}><input type="checkbox" checked={selectedAvailable.has(creator.id)} onChange={() => toggle(setSelectedAvailable, creator.id)} /><span><strong>{creator.display_name}</strong><small>{creator.managementGroupName ? `${creator.managementGroupName}에서 이동` : "미지정"} · {creator.market}</small></span></label>)}</div><button className="st-btn dark" type="button" disabled={busy || !selectedAvailable.size || group.status === "inactive"} onClick={() => run(() => memberPatch(group.id, "assign", [...selectedAvailable]), "선택한 크리에이터를 배정했습니다.")}>선택 구성원 배정</button></div>
        </div>
      </section>

      <section className="admin-detail-section" aria-labelledby="group-agency-heading"><div className="admin-section-heading"><div><p>AGENCY ACCESS</p><h2 id="group-agency-heading">대행사 접근 관리</h2></div><span>소속 캠페인·거래·정산 조회 전용</span></div><div className="admin-agency-invite"><label><span>대행사 이메일 초대</span><input type="email" value={agencyEmail} onChange={(event) => setAgencyEmail(event.target.value)} placeholder="agency@example.com" /></label><button className="st-btn dark" type="button" disabled={busy || !agencyEmail.trim()} onClick={() => run(() => api(`/api/admin/creator-groups/${group.id}/agency-users`, { method: "POST", body: JSON.stringify({ email: agencyEmail }) }).then(() => { setAgencyEmail(""); }), "대행사 이메일을 초대했습니다.")}>초대</button></div><div className="admin-agency-list">{group.agencyUsers.length ? group.agencyUsers.map((user) => <div key={`${user.email}-${user.status}`}><span><strong>{user.email}</strong><small>{user.status}</small></span><button className="st-btn light" type="button" disabled={busy || user.status === "revoked"} onClick={() => run(() => api(`/api/admin/creator-groups/${group.id}/agency-users`, { method: "DELETE", body: JSON.stringify({ email: user.email }) }).then(() => undefined), "대행사 연결을 해제했습니다.")}>대행사 연결 해제</button></div>) : <p className="admin-factual-empty">초대된 대행사 계정이 없습니다.</p>}</div></section>

      <section className="admin-detail-section" aria-labelledby="group-audit-heading"><div className="admin-section-heading"><div><p>HISTORY</p><h2 id="group-audit-heading">감사 이력</h2></div></div><ol className="admin-audit-list">{group.auditEvents.length ? group.auditEvents.map((event, index) => <li key={`${event.createdAt}-${index}`}><strong>{auditLabels[event.action] || event.action}</strong><span>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</span></li>) : <li>기록된 관리 작업이 없습니다.</li>}</ol></section>
    </div>
  );
}
