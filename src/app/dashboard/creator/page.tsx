import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { getRecommendedCampaigns } from "@/lib/creator-campaigns";
import { getCreatorMissionParticipations } from "@/lib/db";
import {
  buildCreatorCenterMetrics,
  getCreatorPerformanceRows,
  missionPreStageLabel,
  missionStageIndex,
  selectActiveMission,
} from "@/lib/creator-center";

const MISSION_STAGES = ["제품 수령", "콘텐츠 제작", "검수", "게시", "정산"];

function isToday(value: string | null) {
  if (!value) return false;
  const today = new Date();
  const target = new Date(value);
  return today.getFullYear() === target.getFullYear()
    && today.getMonth() === target.getMonth()
    && today.getDate() === target.getDate();
}

function deadlineLabel(value: string | null) {
  if (!value) return "상시 모집";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

export default async function CreatorActionHomePage() {
  const { user, creator } = await requireApprovedCreator();
  const [recommended, missions, performanceRows] = await Promise.all([
    getRecommendedCampaigns(creator.id),
    getCreatorMissionParticipations(creator.id),
    getCreatorPerformanceRows(creator.id),
  ]);
  const metrics = buildCreatorCenterMetrics({
    market: creator.market,
    recommendedCount: recommended.length,
    deadlineCount: recommended.filter((campaign) => isToday(campaign.application_deadline)).length,
    workItems: missions.map((mission) => ({
      status: mission.status,
      expectedReward: mission.expected_reward,
      settlementStatus: mission.settlement_status,
    })),
    performanceRows,
    administratorPreview: user.role === "admin",
  });
  const activeMission = selectActiveMission(missions);
  const activeStage = activeMission ? missionStageIndex(activeMission.status) : -1;

  return (
    <div className="creator-action-home">
      <header className="creator-page-heading creator-page-heading-wide">
        <p>CREATOR ACTIVITY · REVENUE CENTER</p>
        <h1>오늘의 활동</h1>
        <span>한국 공급자의 K-뷰티·패션 제품을 해외 크리에이터의 콘텐츠와 판매로 연결합니다.</span>
      </header>

      <section className="creator-kpi-grid" aria-label="오늘의 활동 지표">
        <article className="is-blue"><span>추천 캠페인</span><strong>{metrics.recommendedCount}</strong><small>내 국가와 채널에 맞는 제안</small></article>
        <article className="is-yellow"><span>오늘 마감</span><strong>{metrics.deadlineCount}</strong><small>오늘 신청이 끝나는 캠페인</small></article>
        <article className="is-mint"><span>{user.role === "admin" ? "데모 보상 구성" : "예상 수익"}</span><strong>{metrics.expectedEarnings}</strong><small>{user.role === "admin" ? "관리자 미리보기 · 통화별 보상" : "크리에이터 현지 통화 기준"}</small></article>
        <article className="is-gray"><span>누적 주문</span><strong>{metrics.totalOrders}</strong><small>게시 콘텐츠에서 발생한 누적 주문</small></article>
      </section>

      <div className="creator-home-columns creator-home-columns-primary">
        <section className="creator-recommend-summary" aria-labelledby="recommend-summary-heading">
          <div className="creator-section-heading">
            <div><p className="creator-eyebrow">KOREA → GLOBAL</p><h2 id="recommend-summary-heading">추천 캠페인</h2></div>
            <Link href="/dashboard/creator/campaigns">전체 보기</Link>
          </div>
          {recommended.length ? (
            <ul>
              {recommended.slice(0, 3).map((campaign) => (
                <li key={campaign.id}>
                  <div><strong>{campaign.title}</strong><span><span>한국 공급자</span> · <span>{campaign.markets.join(" · ") || creator.market}</span></span></div>
                  <p><b>{campaign.reward_text || "보상 협의"}</b><small><span>{deadlineLabel(campaign.application_deadline)}</span> <span>마감</span></small></p>
                </li>
              ))}
            </ul>
          ) : <div className="creator-empty-state"><p>현재 조건에 맞는 추천 캠페인이 없습니다.</p></div>}
        </section>

        <section className="creator-mission-board" aria-labelledby="mission-board-heading">
          <div className="creator-section-heading">
            <div><p className="creator-eyebrow">MY MISSION</p><h2 id="mission-board-heading">내 미션 보드</h2></div>
            <Link href="/dashboard/creator/my-campaigns">상세 보기</Link>
          </div>
          {activeMission ? (
            <>
              <h3>{activeMission.campaign_title}</h3>
              {activeStage < 0 ? <b className="creator-mission-prestage">{missionPreStageLabel(activeMission.status)}</b> : null}
              <p>{activeMission.next_action || "다음 단계 안내를 확인하세요."}</p>
              <ol className="creator-mission-stages">
                {MISSION_STAGES.map((stage, index) => (
                  <li key={stage} className={index < activeStage ? "is-done" : index === activeStage ? "is-current" : ""}>
                    <span>{index < activeStage ? "✓" : index + 1}</span><b>{stage}</b>
                  </li>
                ))}
              </ol>
            </>
          ) : <div className="creator-empty-state"><p>진행 중인 미션이 없습니다.</p><Link href="/dashboard/creator/campaigns">추천 캠페인 찾기</Link></div>}
        </section>
      </div>
    </div>
  );
}
