// 관리자 홈: 처리할 운영 항목과 보유 데이터 집계를 분리해 안내.
import Link from "next/link";
import { getAdminDashboardStats } from "@/lib/db";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const actions = [
    { n: stats.creatorProposalsNew, l: "신규 협업 제안", href: "/dashboard/admin/creator-proposals", alert: stats.creatorProposalsNew > 0 },
    { n: stats.pendingDesigners, l: "승인 대기 브랜드 파트너", href: "/dashboard/admin/designers", alert: stats.pendingDesigners > 0 },
  ];
  const aggregates = [
    { n: stats.usersTotal, l: "가입 회원", href: "/dashboard/admin/users" },
    { n: stats.designersTotal, l: "브랜드 파트너", href: "/dashboard/admin/designers" },
    { n: stats.productsTotal, l: "공개 상품", href: "/dashboard/admin/products" },
    { n: stats.generatedLooksTotal, l: "AI 생성 이미지", href: "/dashboard/admin/generated-looks" },
    { n: stats.creatorProposalsTotal, l: "누적 협업 제안", href: "/dashboard/admin/creator-proposals" },
    { n: stats.signupsToday, l: "오늘 가입 집계", href: "/dashboard/admin/users" },
    { n: stats.signupsWeek, l: "최근 7일 가입 집계", href: "/dashboard/admin/users" },
    { n: stats.liveGenerationsToday, l: "오늘 AI 생성 집계", href: "/dashboard/admin/generated-looks" },
    { n: stats.aiGenerationsWeek, l: "최근 7일 AI 생성 집계", href: "/dashboard/admin/generated-looks" },
  ];

  return (
    <>
      <h1 className="st-title">관리자 홈</h1>
      <p className="st-sub">처리할 운영 항목과 전체 현황 집계를 구분해 확인합니다.</p>

      <section aria-labelledby="admin-action-center-heading">
        <p className="admin-stats-label">우선 처리</p>
        <h2 id="admin-action-center-heading">바로 처리할 일</h2>
        <div className="st-stats admin-stats admin-actions-grid">
          {actions.map((s) => (
            <Link className={`st-stat${s.alert ? " is-alert" : ""}`} href={s.href} key={s.l}>
              <div className="n">{s.n}</div>
              <div className="l">{s.l}</div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-aggregate-heading">
        <p className="admin-stats-label">현재 보유 데이터 기준의 집계</p>
        <h2 id="admin-aggregate-heading">운영 현황 집계</h2>
        <div className="st-stats admin-stats-sub">
          {aggregates.map((s) => (
            <Link className="st-stat" href={s.href} key={s.l}>
              <div className="n">{s.n}</div>
              <div className="l">{s.l}</div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
