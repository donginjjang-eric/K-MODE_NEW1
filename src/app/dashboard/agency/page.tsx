import Link from "next/link";
import { requireAgencyUser } from "@/lib/auth";
import { listAgencyManagementGroups } from "@/lib/creator-management";

const count = new Intl.NumberFormat("ko-KR");

export default async function AgencyHomePage() {
  const user = await requireAgencyUser();
  const groups = await listAgencyManagementGroups(user.id);
  const totals = groups.reduce((sum, group) => ({
    creators: sum.creators + group.creatorCount,
    deals: sum.deals + group.dealCount,
    pending: sum.pending + group.pendingSettlementCount,
  }), { creators: 0, deals: 0, pending: 0 });

  return (
    <div className="agency-page">
      <header className="agency-page-head"><div><p className="kicker">AGENCY OVERSIGHT</p><h1 className="st-title">소속 크리에이터 현황</h1><p className="st-sub tight">관리자가 지정한 그룹의 캠페인·거래·성과·정산 정보를 조회합니다.</p></div><span className="agency-readonly-chip">조회 전용</span></header>
      <section className="agency-stats" aria-label="대행사 관리 요약">
        <div><span>소속 크리에이터</span><strong>{count.format(totals.creators)}</strong></div>
        <div><span>확정 거래</span><strong>{count.format(totals.deals)}</strong></div>
        <div><span>정산 대기</span><strong>{count.format(totals.pending)}</strong></div>
      </section>
      <section className="agency-section" aria-labelledby="agency-group-heading">
        <div className="agency-section-head"><div><p>MANAGEMENT GROUPS</p><h2 id="agency-group-heading">배정된 관리 그룹</h2></div><span>{groups.length}개 그룹</span></div>
        {groups.length ? <div className="agency-group-grid">{groups.map((group) => (
          <Link className="agency-group-card" href={`/dashboard/agency/groups/${group.id}`} key={group.id}>
            <header><span>{group.agencyName || "대행사 파트너"}</span><b>상세 보기 →</b></header>
            <h3>{group.name}</h3>
            <dl>
              <div><dt>크리에이터</dt><dd>{count.format(group.creatorCount)}명</dd></div>
              <div><dt>진행 캠페인</dt><dd>{count.format(group.activeCampaignCount)}건</dd></div>
              <div><dt>확정 거래</dt><dd>{count.format(group.dealCount)}건</dd></div>
              <div><dt>정산 대기</dt><dd>{count.format(group.pendingSettlementCount)}건</dd></div>
            </dl>
          </Link>
        ))}</div> : <p className="agency-empty">현재 조회 가능한 관리 그룹이 없습니다.</p>}
      </section>
    </div>
  );
}
