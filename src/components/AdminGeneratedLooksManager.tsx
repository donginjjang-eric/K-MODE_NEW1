"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AdminGeneratedLookActions from "@/components/AdminGeneratedLookActions";
import AdminImageWithFallback from "@/components/AdminImageWithFallback";
import AdminPagination from "@/components/AdminPagination";
import { paginateAdminItems } from "@/lib/admin-list-utils";
import type { AdminGeneratedLook } from "@/lib/db";
import { getGenerationTypeLabel } from "@/lib/status-labels";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminGeneratedLooksManager({ looks }: { looks: AdminGeneratedLook[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageLooks = useMemo(() => paginateAdminItems(looks, currentPage), [currentPage, looks]);

  return (
    <div className="admin-generated-manager">
      <AdminPagination total={looks.length} currentPage={currentPage} onPageChange={setCurrentPage} unit="개" />
      <div className="admin-gallery">
        {pageLooks.map((look, index) => (
          <article className="st-pcard" key={look.id}>
            <div className="img">
              <AdminImageWithFallback
                src={look.image_url}
                alt="AI 생성 룩 이미지"
                width={600}
                height={800}
                eager={currentPage === 1 && index === 0}
              />
            </div>
            <div className="b">
              <div className="c"><Link href={`/dashboard/admin/designers/${look.designer_id}`}>{look.designer_brand_name || "브랜드 정보 없음"}</Link></div>
              <div className="n">{getGenerationTypeLabel(look.cache_hit)}</div>
              <div className="st-prices"><span className="supply">{formatDate(look.created_at)}</span><span className="retail">{look.provider}</span></div>
              <AdminGeneratedLookActions lookId={look.id} status={look.status} videoStatus={look.video_status} videoUrl={look.video_url} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
