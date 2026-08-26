// 관리자: 디자이너 승인 관리 목록 (승인 대기 우선 정렬, 상태별 액션)
import Link from "next/link";
import AdminBrandPartnersManager from "@/components/AdminBrandPartnersManager";
import GenerationLimitControl from "@/components/GenerationLimitControl";
import { getAllDesigners, getDesignerGenerationUsage } from "@/lib/db";

export default async function AdminDesignersPage() {
  const [designers, usage] = await Promise.all([getAllDesigners(), getDesignerGenerationUsage()]);
  const totalToday = usage.reduce((sum, u) => sum + u.today_count, 0);
  const pendingCount = designers.filter((designer) => designer.approval_status === "pending").length;
  const approvedCount = designers.filter((designer) => designer.approval_status === "approved").length;

  return (
    <>
      <h1 className="st-title">브랜드 파트너 관리</h1>
      <p className="st-sub">K-뷰티·K-패션 브랜드의 접수 정보와 분야를 확인하고 승인 상태를 관리합니다.</p>

      <p className="admin-brand-summary">{pendingCount ? `승인 대기 ${pendingCount}팀 · ` : ""}승인 {approvedCount}팀 · 전체 {designers.length}팀</p>
      <AdminBrandPartnersManager designers={designers} />

      <section className="st-card" style={{ marginTop: 18 }}>
        <div className="st-sec-head">
          <div>
            <h2>AI 생성 사용량 · 일일 한도</h2>
            <p className="st-sub tight">공개 화면에서 발생하는 실제 AI 생성(비용)을 브랜드 파트너별로 보고 한도를 조정합니다. 캐시 재사용은 비용이 없어요. 오늘 합계 {totalToday}건.</p>
          </div>
        </div>
        {usage.length ? (
          <div className="admin-table gen-usage-table">
            <div className="admin-table-head">
              <span>브랜드</span>
              <span>오늘 생성</span>
              <span>일일 한도</span>
            </div>
            {usage.map((u) => {
              const ratio = u.daily_generation_limit ? Math.min(100, Math.round((u.today_count / u.daily_generation_limit) * 100)) : 0;
              return (
                <article className="admin-table-row" key={u.id}>
                  <div>
                    <Link className="admin-title-link" href={`/dashboard/admin/designers/${u.id}`}>{u.brand_name}</Link>
                  </div>
                  <span>
                    <b>{u.today_count}</b> / {u.daily_generation_limit}
                    <div className="gen-usage-bar"><i style={{ width: `${ratio}%` }} /></div>
                  </span>
                  <GenerationLimitControl designerId={u.id} initialLimit={u.daily_generation_limit} />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="st-empty compact"><p>승인된 브랜드 파트너가 없습니다.</p></div>
        )}
      </section>
    </>
  );
}
