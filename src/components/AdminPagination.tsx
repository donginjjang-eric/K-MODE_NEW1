"use client";

import { adminPageMeta } from "@/lib/admin-list-utils";

export default function AdminPagination({
  total,
  currentPage,
  onPageChange,
  unit = "건",
}: {
  total: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  unit?: string;
}) {
  const meta = adminPageMeta(total, currentPage);

  return (
    <div className="admin-pagination">
      <p><strong>총 {total}{unit}</strong><span>{meta.start}–{meta.end} 표시</span></p>
      <nav aria-label="목록 페이지">
        <button type="button" disabled={meta.currentPage === 1} onClick={() => onPageChange(meta.currentPage - 1)}>이전</button>
        <div className="admin-pagination-pages">
          {meta.pages.map((page) => (
            <button
              type="button"
              className={page === meta.currentPage ? "is-current" : ""}
              aria-current={page === meta.currentPage ? "page" : undefined}
              onClick={() => onPageChange(page)}
              key={page}
            >
              {page}
            </button>
          ))}
        </div>
        <button type="button" disabled={meta.currentPage === meta.totalPages} onClick={() => onPageChange(meta.currentPage + 1)}>다음</button>
      </nav>
    </div>
  );
}
