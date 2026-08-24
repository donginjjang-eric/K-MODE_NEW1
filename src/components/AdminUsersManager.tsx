"use client";

// 관리자 회원 관리: 세그먼트 필터·검색·정렬로 가입 계정을 빠르게 찾는다.
import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminUserRow } from "@/lib/db";
import { adminUserPresentation, type AdminUserSegment } from "@/lib/admin-user-presentation";

type Segment = AdminUserSegment;

function statusClass(status: string) {
  if (status === "approved") return "approved";
  if (status === "disabled" || status === "rejected") return "disabled";
  return "pending";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export default function AdminUsersManager({ users }: { users: AdminUserRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Segment>("all");
  // 기본은 최신순(가장 최근 가입자가 1번으로 맨 위 — 신규 가입이 바로 보이게)
  const [sortAsc, setSortAsc] = useState(false);

  const withSeg = useMemo(() => users.map((u) => ({ u, presentation: adminUserPresentation(u) })), [users]);

  // 안정 회원번호: 가입 순서대로 1번(가장 먼저 가입)부터. 정렬·필터와 무관하게 회원마다 고정.
  const numberById = useMemo(() => {
    const ordered = [...users].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const map: Record<string, number> = {};
    ordered.forEach((u, i) => { map[u.id] = i + 1; });
    return map;
  }, [users]);

  const counts = useMemo(() => {
    const c = { all: users.length, creator_approved: 0, creator_pending: 0, designer_approved: 0, designer_pending: 0, not_applied: 0, admin: 0, disabled: 0 };
    withSeg.forEach(({ presentation }) => { c[presentation.segment] += 1; });
    return c;
  }, [withSeg, users.length]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = withSeg.filter(({ u, presentation }) => {
      if (filter !== "all" && presentation.segment !== filter) return false;
      if (q && !(`${u.email} ${presentation.profileLabel}`.toLowerCase().includes(q))) return false;
      return true;
    });
    return rows.sort((a, b) => {
      const ta = new Date(a.u.created_at).getTime();
      const tb = new Date(b.u.created_at).getTime();
      return sortAsc ? ta - tb : tb - ta;
    });
  }, [withSeg, filter, search, sortAsc]);

  const chip = (key: "all" | Segment, label: string, n: number) =>
    n || key === "all" ? (
      <button type="button" key={key} className={`apm-chip${filter === key ? " is-active" : ""}`} onClick={() => setFilter(key)}>
        {label} <b>{n}</b>
      </button>
    ) : null;

  return (
    <div className="aum">
      <div className="apm-bar">
        <div className="apm-chips">
          {chip("all", "전체", counts.all)}
          {chip("creator_approved", "승인 크리에이터", counts.creator_approved)}
          {chip("creator_pending", "크리에이터 승인 대기", counts.creator_pending)}
          {chip("designer_approved", "승인 디자이너", counts.designer_approved)}
          {chip("designer_pending", "디자이너 승인 대기", counts.designer_pending)}
          {chip("not_applied", "계정만 가입", counts.not_applied)}
          {chip("admin", "관리자", counts.admin)}
          {chip("disabled", "비활성", counts.disabled)}
        </div>
        <div className="apm-controls">
          <input
            className="apm-search"
            type="search"
            placeholder="이메일·브랜드 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="apm-toggle" onClick={() => setSortAsc((v) => !v)}>
            {sortAsc ? "오래된 가입순" : "최신 가입순"}
          </button>
        </div>
      </div>

      <p className="apm-result">{visible.length}명 표시 중</p>

      {visible.length ? (
        <section className="st-card members-card">
          <div className="admin-table members-table">
            <div className="admin-table-head">
              <span className="col-no">번호</span>
              <span>계정</span>
              <span>역할</span>
              <span>브랜드 / 상태</span>
              <span className="col-date">가입일</span>
            </div>
            {visible.map(({ u, presentation }) => (
              <article className="admin-table-row" key={u.id}>
                <span className="col-no">{numberById[u.id]}</span>
                {presentation.href ? (
                  <Link className="acct-cell acct-link" href={presentation.href} title={`${presentation.roleLabel} 상세 보기`}>
                    <span className="acct-avatar" aria-hidden="true">{(u.email[0] || "?").toUpperCase()}</span>
                    <b>{u.email}</b>
                  </Link>
                ) : (
                  <div className="acct-cell">
                    <span className="acct-avatar" aria-hidden="true">{(u.email[0] || "?").toUpperCase()}</span>
                    <b>{u.email}</b>
                  </div>
                )}
                <span><em className={`role-tag ${presentation.roleLabel === "관리자" ? "is-admin" : presentation.roleLabel === "크리에이터" ? "is-creator" : ""}`}>{presentation.roleLabel}</em></span>
                <span className="brand-cell">
                  {presentation.href ? (
                    <>
                      <Link className="admin-title-link" href={presentation.href}>
                        {presentation.profileLabel}
                      </Link>
                      <em className={`status-badge ${statusClass(presentation.status || "pending")}`}>
                        {presentation.statusLabel}
                      </em>
                    </>
                  ) : u.role === "admin" ? (
                    <em className="brand-empty">-</em>
                  ) : (
                    <em className="status-badge pending">{presentation.statusLabel}</em>
                  )}
                </span>
                <span className="col-date">{formatDate(u.created_at)}</span>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className="st-empty compact"><p>조건에 맞는 회원이 없습니다.</p></div>
      )}
    </div>
  );
}
