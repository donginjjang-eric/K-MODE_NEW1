"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AdminDesignerActions from "@/components/AdminDesignerActions";
import AdminPagination from "@/components/AdminPagination";
import { paginateAdminItems } from "@/lib/admin-list-utils";
import { getApprovalStatusLabel } from "@/lib/status-labels";
import type { Designer } from "@/lib/types";

const CATEGORIES = ["K-뷰티", "K-패션", "복합"];
const STATUS_ORDER: Record<string, number> = { pending: 0, approved: 1, rejected: 2, disabled: 3 };

function statusClass(status: string) {
  if (status === "approved") return "approved";
  if (status === "disabled" || status === "rejected") return "disabled";
  return "pending";
}

export default function AdminBrandPartnersManager({ designers }: { designers: Designer[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return [...designers]
      .filter((designer) => {
        if (category !== "all" && designer.brand_category !== category) return false;
        if (status !== "all" && designer.approval_status !== status) return false;
        if (!query) return true;
        return [designer.brand_name, designer.designer_name, designer.contact_email, designer.country]
          .some((value) => value?.toLocaleLowerCase().includes(query));
      })
      .sort((a, b) => (STATUS_ORDER[a.approval_status] ?? 9) - (STATUS_ORDER[b.approval_status] ?? 9));
  }, [category, designers, search, status]);
  const pageDesigners = useMemo(() => paginateAdminItems(filtered, currentPage), [currentPage, filtered]);

  const resetPage = () => setCurrentPage(1);

  return (
    <section className="st-card admin-brand-manager">
      <div className="apm-bar admin-brand-filters">
        <input
          className="apm-search"
          type="search"
          aria-label="브랜드 파트너 검색"
          placeholder="브랜드·담당자·이메일 검색"
          value={search}
          onChange={(event) => { setSearch(event.target.value); resetPage(); }}
        />
        <select aria-label="브랜드 분야" value={category} onChange={(event) => { setCategory(event.target.value); resetPage(); }}>
          <option value="all">전체 분야</option>
          {CATEGORIES.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
        <select aria-label="승인 상태" value={status} onChange={(event) => { setStatus(event.target.value); resetPage(); }}>
          <option value="all">전체 승인 상태</option>
          <option value="pending">승인 대기</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
          <option value="disabled">비활성</option>
        </select>
      </div>

      <AdminPagination total={filtered.length} currentPage={currentPage} onPageChange={setCurrentPage} unit="팀" />

      {pageDesigners.length ? (
        <div className="admin-table admin-brand-table">
          <div className="admin-table-head">
            <span>브랜드</span><span>국가·분야</span><span>상태</span><span>관리</span>
          </div>
          {pageDesigners.map((designer) => {
            const contact = [designer.designer_name, designer.contact_email, designer.contact_phone].filter(Boolean).join(" · ");
            return (
              <article className="admin-table-row" key={designer.id}>
                <div>
                  <Link className="admin-title-link" href={`/dashboard/admin/designers/${designer.id}`}>{designer.brand_name}</Link>
                  <p>{contact || "연락 정보 미입력"}</p>
                  {designer.description || designer.mood ? <p>{designer.description || designer.mood}</p> : null}
                </div>
                <span>{[designer.country, designer.brand_category].filter(Boolean).join(" · ") || "-"}</span>
                <span><em className={`status-badge ${statusClass(designer.approval_status)}`}>{getApprovalStatusLabel(designer.approval_status)}</em></span>
                <div className="admin-brand-actions"><AdminDesignerActions designerId={designer.id} status={designer.approval_status} /></div>
              </article>
            );
          })}
        </div>
      ) : <div className="st-empty compact"><p>조건에 맞는 브랜드 파트너가 없습니다.</p></div>}
    </section>
  );
}
