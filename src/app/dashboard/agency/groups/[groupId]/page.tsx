import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAgencyUser } from "@/lib/auth";
import { getAgencyGroupOverview } from "@/lib/creator-management";
import { publicMediaUrl } from "@/lib/public-media-url";

const count = new Intl.NumberFormat("ko-KR");
const participationLabels: Record<string, string> = { matched: "매칭 확정", shipping: "제품 배송", creating: "콘텐츠 제작", review: "검수", published: "게시 완료", settlement: "정산 중", completed: "완료" };
const settlementLabels: Record<string, string> = { none: "정산 미정", pending: "정산 대기", confirmed: "정산 확정", paid: "지급 완료" };

export default async function AgencyGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const [{ groupId }, user] = await Promise.all([params, requireAgencyUser()]);
  const group = await getAgencyGroupOverview(user.id, groupId);
  if (!group) notFound();

  return (
    <div className="agency-page agency-detail">
      <header className="agency-page-head"><div><Link className="agency-back" href="/dashboard/agency">← 관리 그룹</Link><p className="kicker">GROUP OVERVIEW</p><h1 className="st-title">{group.name}</h1><p className="st-sub tight">{group.agencyName || "대행사 파트너"} 조회 범위</p></div><span className="agency-readonly-chip">조회 전용</span></header>
      <section className="agency-stats" aria-label="그룹 요약">
        <div><span>크리에이터</span><strong>{count.format(group.creatorCount)}</strong></div>
        <div><span>확정 거래</span><strong>{count.format(group.dealCount)}</strong></div>
        <div><span>정산 대기</span><strong>{count.format(group.pendingSettlementCount)}</strong></div>
      </section>

      <section className="agency-section" aria-labelledby="agency-creators-heading">
        <div className="agency-section-head"><div><p>CREATORS</p><h2 id="agency-creators-heading">소속 크리에이터</h2></div><span>{group.creators.length}명</span></div>
        {group.creators.length ? <div className="agency-creator-grid">{group.creators.map((creator) => (
          <article key={creator.creatorKey}>
            <span className="agency-creator-thumb">{publicMediaUrl(creator.profileImageUrl) ? <img src={publicMediaUrl(creator.profileImageUrl) || ""} alt="" /> : creator.displayName.charAt(0)}</span>
            <div><h3>{creator.displayName}</h3><p>@{creator.creatorKey}</p><strong>팔로워 {count.format(creator.followerTotal)}</strong></div>
          </article>
        ))}</div> : <p className="agency-empty">소속 크리에이터가 없습니다.</p>}
      </section>

      <section className="agency-section" aria-labelledby="agency-rewards-heading">
        <div className="agency-section-head"><div><p>REWARD & PERFORMANCE</p><h2 id="agency-rewards-heading">보상·성과 요약</h2></div><span>통화별 구분</span></div>
        <div className="agency-reward-columns">
          <div><h3>예상 보상 조건</h3>{group.rewardEntries.length ? <ul>{group.rewardEntries.map((entry) => <li key={entry.text}><span>{entry.text}</span><b>{entry.count}건</b></li>)}</ul> : <p className="agency-empty">등록된 보상 조건이 없습니다.</p>}</div>
          <div><h3>성과 매출</h3>{group.revenueByCurrency.length ? <ul>{group.revenueByCurrency.map((entry) => <li key={entry.currency}><span>{entry.currency}</span><b>{count.format(entry.amount)}</b></li>)}</ul> : <p className="agency-empty">등록된 성과 매출이 없습니다.</p>}</div>
        </div>
      </section>

      <section className="agency-section" aria-labelledby="agency-campaigns-heading">
        <div className="agency-section-head"><div><p>CONFIRMED DEALS</p><h2 id="agency-campaigns-heading">캠페인·거래·정산</h2></div><span>확정 거래 {group.campaigns.length}건</span></div>
        {group.campaigns.length ? <div className="agency-campaign-list">{group.campaigns.map((campaign, index) => (
          <article key={`${campaign.campaignId}-${campaign.creatorKey}-${index}`}>
            <header><div><span>{campaign.campaignStatus}</span><h3>{campaign.campaignTitle}</h3><p>{campaign.creatorName} · @{campaign.creatorKey}</p></div><strong>{participationLabels[campaign.participationStatus] || campaign.participationStatus}</strong></header>
            <dl>
              <div><dt>예상 보상</dt><dd>{campaign.expectedReward || "미정"}</dd></div>
              <div><dt>정산</dt><dd>{settlementLabels[campaign.settlementStatus] || campaign.settlementStatus}</dd></div>
              <div><dt>성과 매출</dt><dd>{campaign.revenue === null ? "미집계" : `${campaign.performanceCurrency || "통화 미지정"} ${count.format(campaign.revenue)}`}</dd></div>
              <div><dt>콘텐츠 성과</dt><dd>{campaign.performance ? `조회 ${count.format(campaign.performance.views)} · 좋아요 ${count.format(campaign.performance.likes)} · 주문 ${count.format(campaign.performance.orders)}` : "미집계"}</dd></div>
            </dl>
          </article>
        ))}</div> : <p className="agency-empty">현재 확정된 거래가 없습니다.</p>}
      </section>
    </div>
  );
}
