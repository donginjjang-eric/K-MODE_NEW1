"use client";

// 관리자 회원 관리: 세그먼트 필터·검색·정렬로 가입 계정을 빠르게 찾는다.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminPagination from "@/components/AdminPagination";
import type { AdminUserRow } from "@/lib/db";
import { paginateAdminItems } from "@/lib/admin-list-utils";
import { adminUserPresentation, adminUserQuickApproval, formatAdminJoinDate, type AdminUserSegment } from "@/lib/admin-user-presentation";

type Segment = AdminUserSegment;

function statusClass(status: string) {
  if (status === "approved") return "approved";
  if (status === "disabled" || status === "rejected") return "disabled";
  return "pending";
}

export default function AdminUsersManager({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Segment>("all");
  const [currentPage, setCurrentPage] = useState(1);
  // 기본은 최신순(가장 최근 가입자가 1번으로 맨 위 — 신규 가입이 바로 보이게)
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, { kind: "creator" | "designer"; status: "approved" }>>({});
  const drawerRef = useRef<HTMLElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const effectiveUsers = useMemo(() => users.map((user) => {
    const override = statusOverrides[user.id];
    if (!override) return user;
    return override.kind === "creator"
      ? { ...user, creator_approval_status: override.status }
      : { ...user, designer_approval_status: override.status };
  }), [statusOverrides, users]);

  const withSeg = useMemo(() => effectiveUsers.map((u) => ({ u, presentation: adminUserPresentation(u) })), [effectiveUsers]);
  const selected = useMemo(() => withSeg.find(({ u }) => u.id === selectedId) || null, [selectedId, withSeg]);
  const quickApproval = selected ? adminUserQuickApproval(selected.u) : null;

  useEffect(() => {
    if (!selectedId) return;
    const drawer = drawerRef.current;
    const siblings = drawer?.parentElement?.parentElement
      ? Array.from(drawer.parentElement.parentElement.children).filter((element) => element !== drawer.parentElement)
      : [];
    siblings.forEach((element) => { if (element instanceof HTMLElement) element.inert = true; });
    drawer?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
      if (event.key !== "Tab" || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.classList.add("admin-review-open");
    window.addEventListener("keydown", close);
    return () => {
      document.body.classList.remove("admin-review-open");
      window.removeEventListener("keydown", close);
      siblings.forEach((element) => { if (element instanceof HTMLElement) element.inert = false; });
      lastTriggerRef.current?.focus();
    };
  }, [selectedId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const review = async () => {
    if (!selected || !quickApproval || busy) return;
    const url = quickApproval.approveUrl;
    const method = quickApproval.approveMethod;
    const body = quickApproval.approveBody;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "처리에 실패했습니다.");
      setStatusOverrides((current) => ({ ...current, [selected.u.id]: { kind: quickApproval.kind, status: "approved" } }));
      setToast(`${quickApproval.kind === "creator" ? selected.u.creator_name : selected.u.brand_name || selected.presentation.profileLabel} 승인 완료`);
      setSelectedId(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

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
  const pageUsers = useMemo(() => paginateAdminItems(visible, currentPage), [currentPage, visible]);

  const changePage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const holdReview = () => {
    if (!selected) return;
    setToast(`${selected.presentation.profileLabel} 승인 대기 유지`);
    setSelectedId(null);
  };

  const chip = (key: "all" | Segment, label: string, n: number) =>
    n || key === "all" ? (
      <button type="button" key={key} className={`apm-chip${filter === key ? " is-active" : ""}`} onClick={() => { setFilter(key); setCurrentPage(1); }}>
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
          {chip("designer_approved", "승인 브랜드 파트너", counts.designer_approved)}
          {chip("designer_pending", "브랜드 파트너 승인 대기", counts.designer_pending)}
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
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          <button type="button" className="apm-toggle" onClick={() => { setSortAsc((v) => !v); setCurrentPage(1); }}>
            {sortAsc ? "오래된 가입순" : "최신 가입순"}
          </button>
        </div>
      </div>

      <AdminPagination total={visible.length} currentPage={currentPage} onPageChange={changePage} unit="명" />

      {visible.length ? (
        <section className="st-card members-card">
          <div className="admin-table members-table">
            <div className="admin-table-head">
              <span className="col-no">번호</span>
              <span>계정</span>
              <span>역할</span>
              <span>브랜드 / 상태</span>
              <span className="col-action">승인 관리</span>
              <span className="col-date">가입일</span>
            </div>
            {pageUsers.map(({ u, presentation }) => (
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
                <span className="col-action">
                  {adminUserQuickApproval(u) ? (
                    <button className="aum-review-button" type="button" onClick={(event) => { lastTriggerRef.current = event.currentTarget; setError(""); setSelectedId(u.id); }}>검토·승인</button>
                  ) : presentation.href ? (
                    <Link className="aum-detail-link" href={presentation.href}>상세 보기</Link>
                  ) : <em className="brand-empty">-</em>}
                </span>
                <span className="col-date">{formatAdminJoinDate(u.created_at)}</span>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className="st-empty compact"><p>조건에 맞는 회원이 없습니다.</p></div>
      )}
      {selected && quickApproval ? (
        <div className="aum-review-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <aside className="aum-review-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="aum-review-title" tabIndex={-1}>
            <header>
              <div><span>QUICK APPROVAL</span><h2 id="aum-review-title">{quickApproval.kind === "creator" ? "크리에이터" : "브랜드 파트너"} 승인 검토</h2></div>
              <button type="button" aria-label="승인 패널 닫기" onClick={() => setSelectedId(null)}>×</button>
            </header>
            <section className="aum-review-identity">
              <div>{(selected.u.email[0] || "?").toUpperCase()}</div>
              <span><em>승인 대기</em><strong>{quickApproval.kind === "creator" ? selected.u.creator_name || "활동명 미입력" : selected.u.brand_name || "브랜드명 미입력"}</strong><small>{selected.u.email}</small></span>
            </section>
            <dl className="aum-review-facts">
              <div><dt>신청 유형</dt><dd>{quickApproval.kind === "creator" ? "크리에이터" : "브랜드 파트너"}</dd></div>
              <div><dt>가입일</dt><dd>{formatAdminJoinDate(selected.u.created_at)}</dd></div>
              {quickApproval.kind === "creator" ? <>
                <div><dt>활동 국가</dt><dd>{selected.u.creator_market || "미입력"}</dd></div>
                <div><dt>플랫폼</dt><dd>{selected.u.creator_platform || "미입력"}</dd></div>
                <div className="is-wide"><dt>활동 분야</dt><dd>{selected.u.creator_categories?.join(", ") || "미입력"}</dd></div>
                <div className="is-wide"><dt>SNS</dt><dd>{selected.u.creator_instagram_url ? <a href={selected.u.creator_instagram_url} target="_blank" rel="noreferrer">Instagram 확인</a> : null}{selected.u.creator_tiktok_url ? <a href={selected.u.creator_tiktok_url} target="_blank" rel="noreferrer">TikTok 확인</a> : null}{!selected.u.creator_instagram_url && !selected.u.creator_tiktok_url ? "미입력" : null}</dd></div>
              </> : <>
                <div><dt>담당자</dt><dd>{selected.u.designer_name || "미입력"}</dd></div>
                <div><dt>국가</dt><dd>{selected.u.designer_country || "미입력"}</dd></div>
                <div className="is-wide"><dt>브랜드 소개</dt><dd>{selected.u.designer_description || "미입력"}</dd></div>
              </>}
            </dl>
            {error ? <p className="aum-review-error" role="alert">{error}</p> : null}
            <footer>
              <button className="aum-hold-button" type="button" disabled={busy} onClick={holdReview}>승인 보류</button>
              <button className="aum-approve-button" type="button" disabled={busy} onClick={review}>{busy ? "처리 중…" : "승인하기"}</button>
            </footer>
            <Link className="aum-full-detail" href={selected.presentation.href || "#"}>전체 상세 정보 보기</Link>
          </aside>
        </div>
      ) : null}
      {toast ? <div className="aum-toast" role="status"><b>✓</b><span><strong>{toast}</strong><small>회원 목록에 즉시 반영되었습니다.</small></span></div> : null}
    </div>
  );
}
