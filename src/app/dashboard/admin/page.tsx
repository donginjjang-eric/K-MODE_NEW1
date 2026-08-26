// 관리자 홈: 스크롤 없이 핵심 지표만 한눈에. 카드를 누르면 해당 관리 화면으로 이동.
import Link from "next/link";
import { getAdminDashboardStats } from "@/lib/db";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const actions = [
    { n: stats.pendingCreators, l: "크리에이터 승인", d: "가입 신청 검토", href: "/dashboard/admin/creators" },
    { n: stats.pendingDesigners, l: "브랜드 파트너 승인", d: "브랜드 신청 검토", href: "/dashboard/admin/designers" },
    { n: stats.pendingProducts, l: "상품 검수", d: "비공개 상품 확인", href: "/dashboard/admin/products" },
    { n: stats.pendingGeneratedLooks, l: "AI 콘텐츠 검수", d: "생성 결과 공개 검토", href: "/dashboard/admin/generated-looks" },
  ];
  const totals = [
    { n: stats.creatorProposalsNew, l: "신규 협업 제안", href: "/dashboard/admin/creator-proposals", alert: stats.creatorProposalsNew > 0 },
    { n: stats.usersTotal, l: "가입 회원", href: "/dashboard/admin/users" },
    { n: stats.designersTotal, l: "브랜드 파트너", href: "/dashboard/admin/designers" },
    { n: stats.pendingDesigners, l: "승인 대기", href: "/dashboard/admin/designers", alert: stats.pendingDesigners > 0 },
    { n: stats.productsTotal, l: "공개 상품", href: "/dashboard/admin/products" },
    { n: stats.generatedLooksTotal, l: "AI 생성 이미지", href: "/dashboard/admin/generated-looks" },
  ];
  const trend = [
    { n: stats.creatorProposalsTotal, l: "누적 협업 제안", href: "/dashboard/admin/creator-proposals" },
    { n: stats.signupsToday, l: "오늘 가입", href: "/dashboard/admin/users" },
    { n: stats.signupsWeek, l: "최근 7일 가입", href: "/dashboard/admin/users" },
    { n: stats.liveGenerationsToday, l: "AI 오늘 생성", href: "/dashboard/admin/generated-looks" },
    { n: stats.aiGenerationsWeek, l: "AI 최근 7일", href: "/dashboard/admin/generated-looks" },
  ];

  return (
    <>
      <h1 className="st-title">관리자 홈</h1>
      <p className="st-sub">검토가 필요한 업무와 운영 지표를 실제 데이터 기준으로 확인합니다.</p>

      <section className="admin-action-center" aria-labelledby="admin-action-center-title">
        <div className="admin-action-center-head">
          <div><span>OPERATIONS</span><h2 id="admin-action-center-title">처리할 업무</h2></div>
          <p>{actions.reduce((sum, action) => sum + action.n, 0)}건 대기 중</p>
        </div>
        <div className="admin-action-grid">
          {actions.map((action) => (
            <Link className={`admin-action-card${action.n ? " has-pending" : ""}`} href={action.href} key={action.l}>
              <span>{action.l}</span><strong>{action.n}</strong><small>{action.d}</small><em>바로가기 →</em>
            </Link>
          ))}
        </div>
      </section>

      <p className="admin-stats-label">전체 운영 현황</p>
      <div className="st-stats admin-stats">
        {totals.map((s) => (
          <Link className={`st-stat${s.alert ? " is-alert" : ""}`} href={s.href} key={s.l}>
            <div className="n">{s.n}</div>
            <div className="l">{s.l}</div>
          </Link>
        ))}
      </div>

      <p className="admin-stats-label">가입·AI 생성 추이</p>
      <div className="st-stats admin-stats-sub">
        {trend.map((s) => (
          <Link className="st-stat" href={s.href} key={s.l}>
            <div className="n">{s.n}</div>
            <div className="l">{s.l}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
