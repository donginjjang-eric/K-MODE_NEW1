"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminManagedCreator, CreatorManagementGroupSummary } from "@/lib/creator-management";

export type AdminCreatorManagementRow = AdminManagedCreator & { durable: boolean };

const ALL = "all";
const numberFormat = new Intl.NumberFormat("ko-KR");

function accountLabel(creator: AdminCreatorManagementRow) {
  return creator.user_id ? "회원 연결" : creator.durable ? "미연결" : "회원 레코드 없음";
}

function onboardingLabel(source: AdminCreatorManagementRow["onboarding_source"]) {
  return source === "admin" ? "관리자 등록" : "직접 가입";
}

function claimLabel(claim: AdminCreatorManagementRow["claim_state"]) {
  return claim === "claimed" ? "귀속 완료" : "미귀속";
}

function approvalLabel(status: AdminCreatorManagementRow["approval_status"]) {
  if (status === "approved") return "승인";
  if (status === "disabled") return "비활성";
  return "대기";
}

export default function AdminCreatorManagementTable({ creators, groups }: {
  creators: AdminCreatorManagementRow[];
  groups: CreatorManagementGroupSummary[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);
  const [groupId, setGroupId] = useState(ALL);
  const [onboarding, setOnboarding] = useState(ALL);
  const [claim, setClaim] = useState(ALL);
  const [approval, setApproval] = useState(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetGroup, setTargetGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const markets = useMemo(() => [...new Set(creators.map((creator) => creator.market).filter(Boolean))].sort(), [creators]);
  const platforms = useMemo(() => [...new Set(creators.map((creator) => creator.platform).filter(Boolean))].sort(), [creators]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return creators.filter((creator) => {
      const matchesSearch = !term || [creator.display_name, creator.creator_key, creator.instagram_handle, creator.tiktok_handle]
        .filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(term));
      return matchesSearch
        && (market === ALL || creator.market === market)
        && (platform === ALL || creator.platform === platform)
        && (groupId === ALL || (groupId === "none" ? !creator.managementGroupId : creator.managementGroupId === groupId))
        && (onboarding === ALL || creator.onboarding_source === onboarding)
        && (claim === ALL || creator.claim_state === claim)
        && (approval === ALL || creator.approval_status === approval);
    });
  }, [approval, claim, creators, groupId, market, onboarding, platform, search]);
  const selectableIds = filtered.filter((creator) => creator.durable).map((creator) => creator.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allSelected) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "요청을 처리하지 못했습니다.");
    return body;
  }

  async function assign(actionLabel: string) {
    if (!selected.size || !targetGroup) return;
    setBusy(true);
    setMessage("");
    try {
      await request(`/api/admin/creator-groups/${encodeURIComponent(targetGroup)}/members`, {
        method: "PATCH",
        body: JSON.stringify({ action: "assign", creatorAccountIds: [...selected] }),
      });
      setMessage(`${selected.size}명을 ${actionLabel}했습니다.`);
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "그룹을 지정하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function removeFromGroups() {
    if (!selected.size) return;
    const grouped = new Map<string, string[]>();
    creators.filter((creator) => selected.has(creator.id) && creator.managementGroupId).forEach((creator) => {
      const ids = grouped.get(creator.managementGroupId!) ?? [];
      ids.push(creator.id);
      grouped.set(creator.managementGroupId!, ids);
    });
    if (!grouped.size) {
      setMessage("선택한 크리에이터는 관리 그룹에 속해 있지 않습니다.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await Promise.all([...grouped].map(([currentGroupId, creatorAccountIds]) => request(
        `/api/admin/creator-groups/${encodeURIComponent(currentGroupId)}/members`,
        { method: "PATCH", body: JSON.stringify({ action: "remove", creatorAccountIds }) },
      )));
      setMessage("선택한 크리에이터를 그룹에서 제거했습니다.");
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "그룹에서 제거하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function createGroup() {
    const name = window.prompt("새 관리 그룹 이름을 입력해 주세요.")?.trim();
    if (!name) return;
    setBusy(true);
    setMessage("");
    try {
      await request("/api/admin/creator-groups", {
        method: "POST",
        body: JSON.stringify({ name, creatorAccountIds: [...selected] }),
      });
      setMessage("새 관리 그룹을 만들었습니다.");
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관리 그룹을 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-creator-management" aria-label="크리에이터 관리 목록">
      <div className="admin-creator-filters">
        <label className="is-search"><span>이름 · 핸들 검색</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름 또는 @handle" /></label>
        <label><span>국가</span><select value={market} onChange={(event) => setMarket(event.target.value)}><option value={ALL}>전체</option>{markets.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>플랫폼</span><select value={platform} onChange={(event) => setPlatform(event.target.value)}><option value={ALL}>전체</option>{platforms.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>관리 그룹</span><select value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value={ALL}>전체</option><option value="none">미지정</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label><span>가입 경로</span><select value={onboarding} onChange={(event) => setOnboarding(event.target.value)}><option value={ALL}>전체</option><option value="admin">관리자 등록</option><option value="self_registered">직접 가입</option></select></label>
        <label><span>귀속 상태</span><select value={claim} onChange={(event) => setClaim(event.target.value)}><option value={ALL}>전체</option><option value="unclaimed">미귀속</option><option value="claimed">귀속 완료</option></select></label>
        <label><span>승인 상태</span><select value={approval} onChange={(event) => setApproval(event.target.value)}><option value={ALL}>전체</option><option value="pending">대기</option><option value="approved">승인</option><option value="disabled">비활성</option></select></label>
      </div>

      <div className="admin-creator-bulk-tools" aria-label="선택 크리에이터 일괄 작업">
        <strong>{selected.size}명 선택</strong>
        <button className="st-btn" type="button" disabled={busy} onClick={createGroup}>새 관리 그룹 만들기</button>
        <select aria-label="대상 관리 그룹" value={targetGroup} onChange={(event) => setTargetGroup(event.target.value)} disabled={busy}>
          <option value="">관리 그룹 선택</option>{groups.filter((group) => group.status === "active").map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
        <button className="st-btn dark" type="button" disabled={busy || !selected.size || !targetGroup} onClick={() => assign("그룹에 지정")}>선택 크리에이터 그룹 지정</button>
        <button className="st-btn" type="button" disabled={busy || !selected.size || !targetGroup} onClick={() => assign("그룹으로 이동")}>그룹 이동</button>
        <button className="st-btn light" type="button" disabled={busy || !selected.size} onClick={removeFromGroups}>그룹에서 제거</button>
        {message ? <p role="status">{message}</p> : null}
      </div>

      <div className="admin-creator-result-line"><strong>{filtered.length}명</strong><span>저장된 회원 레코드만 선택·그룹 지정할 수 있습니다.</span></div>
      <div className="admin-creator-management-table-wrap">
        <table>
          <thead><tr><th><input type="checkbox" aria-label="전체 크리에이터 선택" checked={allSelected} onChange={toggleAll} disabled={!selectableIds.length} /></th><th>크리에이터</th><th>SNS · 팔로워</th><th>가입 경로</th><th>계정 상태</th><th>귀속 상태</th><th>승인 상태</th><th>관리 그룹</th></tr></thead>
          <tbody>{filtered.map((creator) => <tr key={creator.creator_key}>
            <td><input type="checkbox" aria-label={`${creator.display_name} 선택`} checked={selected.has(creator.id)} onChange={() => toggle(creator.id)} disabled={!creator.durable} /></td>
            <td><Link className="admin-creator-identity" href={`/dashboard/admin/creators/${encodeURIComponent(creator.creator_key)}`}><span className="admin-creator-thumb">{creator.profile_image_url ? <img src={creator.profile_image_url} alt="" /> : creator.display_name.slice(0, 1)}</span><span><strong>{creator.display_name}</strong><small>{creator.creator_key}</small></span></Link></td>
            <td><strong>{numberFormat.format(creator.followerTotal)}</strong><small>{creator.instagram_handle ? `IG @${creator.instagram_handle.replace(/^@/, "")}` : ""}{creator.instagram_handle && creator.tiktok_handle ? " · " : ""}{creator.tiktok_handle ? `TT @${creator.tiktok_handle.replace(/^@/, "")}` : ""}</small></td>
            <td>{onboardingLabel(creator.onboarding_source)}</td><td><span className={`admin-creator-state ${creator.durable ? "is-durable" : ""}`}>{accountLabel(creator)}</span></td><td>{claimLabel(creator.claim_state)}</td><td>{approvalLabel(creator.approval_status)}</td><td>{creator.managementGroupName || "미지정"}</td>
          </tr>)}</tbody>
        </table>
        {!filtered.length ? <div className="st-empty"><p>조건에 맞는 크리에이터가 없습니다.</p></div> : null}
      </div>
    </section>
  );
}
