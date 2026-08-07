import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import {
  getCreatorActionSummary,
  getCreatorCampaignActivity,
  getCreatorSettlementSummary,
  getRecommendedCampaigns,
} from "@/lib/creator-campaigns";

function matchReasonLabel(reason: string) {
  return ({ market: "Your market", platform: "Your platform", category: "Your category", deadline: "Open now" } as Record<string, string>)[reason] || reason;
}

function deadlineLabel(deadline: string | null) {
  if (!deadline) return "No application deadline";
  return `Apply by ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(deadline))}`;
}

export default async function CreatorActionHomePage() {
  const { creator } = await requireApprovedCreator();
  const [summary, recommendedCampaigns, currentParticipations, settlement] = await Promise.all([
    getCreatorActionSummary(creator.id),
    getRecommendedCampaigns(creator.id),
    getCreatorCampaignActivity(creator.id),
    getCreatorSettlementSummary(creator.id),
  ]);
  const urgentCampaigns = recommendedCampaigns.filter((campaign) => campaign.application_deadline).slice(0, 2);

  return (
    <div className="creator-action-home">
      <header className="creator-page-heading">
        <p>CREATOR ACTION CENTER</p>
        <h1>오늘 할 일</h1>
        <span>{creator.display_name}님에게 맞춘 다음 캠페인과 진행 현황입니다.</span>
      </header>

      <section className="creator-action-priority" aria-labelledby="today-actions-heading">
        <div><p className="creator-eyebrow">TODAY</p><h2 id="today-actions-heading">지금 확인할 작업</h2></div>
        <div className="creator-stat-row">
          <strong>{summary.invited}</strong><span>Invitations</span>
          <strong>{summary.applied}</strong><span>Applications</span>
          <strong>{summary.active}</strong><span>Active work</span>
        </div>
        <Link href="/dashboard/creator/campaigns" className="creator-primary-link">추천 캠페인 보기</Link>
      </section>

      <section className="creator-deadlines" aria-labelledby="deadline-heading">
        <div className="creator-section-heading"><div><p className="creator-eyebrow">DEADLINES</p><h2 id="deadline-heading">마감 임박</h2></div><Link href="/dashboard/creator/campaigns">모두 보기</Link></div>
        {urgentCampaigns.length ? <ul>{urgentCampaigns.map((campaign) => <li key={campaign.id}><strong>{campaign.title}</strong><span>{deadlineLabel(campaign.application_deadline)}</span></li>)}</ul> : <p>현재 임박한 모집 마감이 없습니다.</p>}
      </section>

      <section aria-labelledby="recommended-heading">
        <div className="creator-section-heading"><div><p className="creator-eyebrow">RECOMMENDED</p><h2 id="recommended-heading">추천 캠페인</h2></div><Link href="/dashboard/creator/campaigns">전체 탐색</Link></div>
        {recommendedCampaigns.length ? <div className="creator-home-campaigns">{recommendedCampaigns.slice(0, 3).map((campaign) => <article key={campaign.id}><p>{campaign.category}</p><h3>{campaign.title}</h3><span>{campaign.reward_text || "Reward to be confirmed"}</span><div>{campaign.fit.reasons.map((reason) => <small key={reason}>{matchReasonLabel(reason)}</small>)}</div></article>)}</div> : <div className="creator-empty-state"><p>현재 조건에 맞는 모집 캠페인이 없습니다.</p><Link href="/dashboard/creator/campaigns">추천 캠페인 다시 확인하기</Link></div>}
      </section>

      <div className="creator-home-columns">
        <section aria-labelledby="progress-heading"><div className="creator-section-heading"><div><p className="creator-eyebrow">PROGRESS</p><h2 id="progress-heading">진행 중인 캠페인</h2></div></div>{currentParticipations.length ? <ul className="creator-activity-list">{currentParticipations.map((participation) => <li key={participation.id}><div><strong>{participation.campaign_title}</strong><span>{participation.next_action || participation.status}</span></div><b>{participation.status}</b></li>)}</ul> : <p className="creator-muted">진행 중인 캠페인이 없습니다.</p>}</section>
        <section aria-labelledby="settlement-heading"><p className="creator-eyebrow">SETTLEMENT</p><h2 id="settlement-heading">정산 요약</h2><dl className="creator-settlement-summary"><div><dt>Pending</dt><dd>{settlement.pending}</dd></div><div><dt>Confirmed</dt><dd>{settlement.confirmed}</dd></div><div><dt>Paid</dt><dd>{settlement.paid}</dd></div></dl></section>
      </div>
    </div>
  );
}
