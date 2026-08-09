import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { getCreatorMissionParticipations } from "@/lib/db";
import CreatorInvitationActions from "@/components/CreatorInvitationActions";
import { creatorNextActionLabel, creatorPersona, missionMatchesPersona } from "@/lib/creator-persona";
import { creatorStatusLabel } from "@/lib/creator-copy";
import { isActiveMission, isCompletedMission, missionImage, missionStageIndex } from "@/lib/creator-mission-view";

const MISSION_STAGES = ["지원", "매칭", "배송", "제작", "검수", "게시", "정산", "완료"];

function dateLabel(value: string | null) {
  if (!value) return "일정 확인 중";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export default async function MyCampaignsPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { user, creator } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const allParticipations = await getCreatorMissionParticipations(creator.id);
  const participations = user.role === "admin" ? allParticipations.filter((item) => missionMatchesPersona(item, persona)) : allParticipations;
  const activeMissions = participations.filter((item) => isActiveMission(item.status));
  const completedMissions = participations.filter((item) => isCompletedMission(item.status));
  const reviewCount = participations.filter((item) => item.status === "review").length;

  return (
    <div className="creator-missions-page creator-campaigns-page">
      <header className="creator-page-heading creator-page-heading-wide"><p>참여 캠페인</p><h1>내 미션</h1><span>지금 해야 할 일과 캠페인 진행 상황을 한눈에 확인하세요.</span></header>

      <section className="creator-mission-summary" aria-label="미션 현황 요약">
        <article><span>진행 중</span><strong>{activeMissions.length}</strong><small>지금 확인할 미션</small></article>
        <article><span>검수 대기</span><strong>{reviewCount}</strong><small>피드백을 기다리는 콘텐츠</small></article>
        <article><span>완료</span><strong>{completedMissions.length}</strong><small>마무리한 캠페인</small></article>
      </section>

      <section className="creator-mission-section" aria-labelledby="active-missions-heading">
        <div className="creator-section-heading"><div><p className="creator-eyebrow">현재 할 일</p><h2 id="active-missions-heading">진행 중인 미션</h2></div><span>{activeMissions.length}개</span></div>
        {activeMissions.length ? <div className="creator-mission-card-grid">{activeMissions.map((participation) => {
          const currentStage = missionStageIndex(participation.status);
          return <article className="creator-mission-card" key={participation.id}>
            <div className="creator-mission-card-media"><img src={missionImage(participation.campaign_category)} alt={`${participation.campaign_title} 캠페인`} /><span>{participation.campaign_category}</span></div>
            <div className="creator-mission-card-content">
              <div className="creator-mission-card-title"><div><span className="creator-mission-status">{creatorStatusLabel(participation.status)}</span><h3>{participation.campaign_title}</h3></div><b>{participation.expected_reward || "협의 후 안내"}</b></div>
              <div className="creator-next-action"><span>지금 해야 할 일</span><strong>{creatorNextActionLabel(participation.status)}</strong></div>
              <ol className="creator-mission-progress" aria-label="미션 진행 단계">{MISSION_STAGES.map((stage, index) => <li key={stage} className={index < currentStage ? "is-done" : index === currentStage ? "is-current" : ""}><i>{index < currentStage ? "✓" : index + 1}</i><span>{stage}</span></li>)}</ol>
              <div className="creator-mission-meta"><div><span>콘텐츠 마감</span><strong>{dateLabel(participation.content_deadline)}</strong></div><div><span>예상 보상</span><strong>{participation.expected_reward || "협의 후 안내"}</strong></div></div>
              <div className="creator-mission-actions">{participation.status === "invited" ? <CreatorInvitationActions participationId={participation.id} /> : null}<Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>미션 자세히 보기</Link></div>
            </div>
          </article>;
        })}</div> : <div className="creator-empty-state"><h2>지금 진행 중인 미션이 없습니다.</h2><p>내 프로필과 잘 맞는 캠페인을 찾아 새로운 미션을 시작해 보세요.</p><Link href="/dashboard/creator/campaigns">추천 캠페인 보기</Link></div>}
      </section>

      {completedMissions.length ? <section className="creator-mission-section" aria-labelledby="completed-missions-heading"><div className="creator-section-heading"><div><p className="creator-eyebrow">활동 기록</p><h2 id="completed-missions-heading">완료한 미션</h2></div><span>{completedMissions.length}개</span></div><div className="creator-completed-missions">{completedMissions.map((participation) => <article key={participation.id}><img src={missionImage(participation.campaign_category)} alt="" /><div><span>{creatorStatusLabel(participation.status)}</span><h3>{participation.campaign_title}</h3><p>{participation.expected_reward || "협의 후 안내"}</p></div><Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>상세 보기</Link></article>)}</div></section> : null}
    </div>
  );
}
