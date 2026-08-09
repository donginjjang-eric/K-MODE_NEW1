import Link from "next/link";
import { notFound } from "next/navigation";
import CreatorInvitationActions from "@/components/CreatorInvitationActions";
import CreatorPerformanceForm from "@/components/CreatorPerformanceForm";
import CreatorSubmissionForm from "@/components/CreatorSubmissionForm";
import { requireApprovedCreator } from "@/lib/auth";
import { getCampaignEventsForParticipation, getContentSubmissionsForParticipation, getParticipationForCreator } from "@/lib/db";
import { creatorStatusLabel } from "@/lib/creator-copy";
import { creatorNextActionLabel } from "@/lib/creator-persona";
import { CREATOR_MISSION_STAGES, creatorMissionActionHref, creatorMissionPresentation, missionBriefLabel, missionImage } from "@/lib/creator-mission-view";

function dateLabel(value: string | null) {
  if (!value) return "일정 확인 중";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export default async function CreatorMissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { creator } = await requireApprovedCreator();
  const { id: participationId } = await params;
  const participation = await getParticipationForCreator(creator.id, participationId);
  if (!participation) notFound();
  const [submissions, events] = await Promise.all([
    getContentSubmissionsForParticipation(participation.id),
    getCampaignEventsForParticipation(participation.id),
  ]);
  const canSubmit = participation.status === "creating" || participation.status === "review";
  const canReportPerformance = participation.status === "published" || participation.status === "settlement" || participation.status === "completed";
  const presentation = creatorMissionPresentation(participation.status);

  return (
    <div className="creator-mission-detail creator-campaigns-page">
      <Link className="creator-detail-back" href="/dashboard/creator/my-campaigns">← 내 미션으로 돌아가기</Link>

      <header className="creator-detail-hero">
        <div className="creator-detail-hero-media"><img src={missionImage(participation.campaign_category)} alt={`${participation.campaign_title} 캠페인`} /><span>{participation.campaign_category}</span></div>
        <div className="creator-detail-hero-copy"><span className="creator-mission-status">{creatorStatusLabel(participation.status)}</span><h1>{participation.campaign_title}</h1><div className="creator-detail-next"><small>지금 해야 할 일</small><strong>{creatorNextActionLabel(participation.status)}</strong></div><div className="creator-detail-hero-meta"><span><small>콘텐츠 마감</small><strong>{dateLabel(participation.content_deadline)}</strong></span><span><small>예상 보상</small><strong>{participation.expected_reward || "협의 후 안내"}</strong></span></div>{participation.status === "invited" ? <CreatorInvitationActions participationId={participation.id} /> : <Link className="creator-primary-action" href={creatorMissionActionHref(participation.status, participation.id)}>{presentation.actionLabel}</Link>}</div>
      </header>

      <section className="creator-detail-panel creator-detail-progress" aria-labelledby="timeline-heading"><div className="creator-detail-section-heading"><span>캠페인 진행률</span><h2 id="timeline-heading">진행 단계</h2></div><ol>{CREATOR_MISSION_STAGES.map((stage, index) => <li className={index < presentation.stageIndex ? "is-done" : index === presentation.stageIndex ? "is-current" : ""} key={stage}><i>{index < presentation.stageIndex ? "✓" : index + 1}</i><span>{stage}</span></li>)}</ol></section>

      <div className="creator-detail-columns">
        <main className="creator-detail-main">
          <section className="creator-detail-panel creator-detail-brief"><div className="creator-detail-section-heading"><span>캠페인 정보</span><h2>캠페인 안내</h2></div><p>{missionBriefLabel(participation.campaign_brief)}</p><dl><div><dt>배송 안내</dt><dd>{participation.shipping_note || "배송 일정은 확정 후 안내합니다."}</dd></div><div><dt>콘텐츠 마감일</dt><dd>{dateLabel(participation.content_deadline)}</dd></div><div><dt>예상 보상</dt><dd>{participation.expected_reward || "협의 후 안내"}</dd></div></dl></section>

          {canSubmit ? <section className="creator-detail-panel creator-detail-work"><div className="creator-detail-section-heading"><span>콘텐츠 작업</span><h2>콘텐츠 제출</h2></div><CreatorSubmissionForm participationId={participation.id} /></section> : null}
          {canReportPerformance ? <section id="performance" className="creator-detail-panel creator-detail-work"><div className="creator-detail-section-heading"><span>게시 후 성과</span><h2>캠페인 성과</h2></div><p className="creator-detail-helper">게시된 콘텐츠의 실제 수치를 입력해 주세요. 저장한 값은 성과 화면과 정산에 반영됩니다.</p><CreatorPerformanceForm participationId={participation.id} /></section> : null}

          <section className="creator-detail-panel creator-detail-history"><div className="creator-detail-section-heading"><span>검수 및 게시</span><h2>제출 내역</h2></div>{submissions.length ? <div className="creator-submission-history">{submissions.map((submission) => <article key={submission.id}><div><a href={submission.content_url} target="_blank" rel="noreferrer">제출본 {submission.version} 보기</a><span>{creatorStatusLabel(submission.status)}</span></div><p>{submission.caption_text}</p><dl><div><dt>검수 의견</dt><dd>{submission.review_note || "검수 대기 중"}</dd></div><div><dt>게시 상태</dt><dd>{submission.published_url ? <a href={submission.published_url} target="_blank" rel="noreferrer">게시된 콘텐츠 보기</a> : "승인 후 게시해 주세요."}</dd></div></dl></article>)}</div> : <div className="creator-detail-empty">아직 제출한 콘텐츠가 없습니다.</div>}</section>
        </main>

        <aside className="creator-detail-side"><details className="creator-detail-panel creator-detail-activity"><summary>전체 활동 기록 보기 <span>{events.length}</span></summary>{events.length ? <ol>{events.map((event) => <li key={event.id}><i></i><div><p>{event.message}</p><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString("ko-KR")}</time></div></li>)}</ol> : <div className="creator-detail-empty">아직 활동 기록이 없습니다.</div>}</details></aside>
      </div>
    </div>
  );
}
