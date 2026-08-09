import Link from "next/link";
import { notFound } from "next/navigation";
import CreatorInvitationActions from "@/components/CreatorInvitationActions";
import CreatorPerformanceForm from "@/components/CreatorPerformanceForm";
import CreatorSubmissionForm from "@/components/CreatorSubmissionForm";
import { requireApprovedCreator } from "@/lib/auth";
import { getCampaignEventsForParticipation, getContentSubmissionsForParticipation, getParticipationForCreator } from "@/lib/db";
import { creatorStatusLabel } from "@/lib/creator-copy";

const timeline = ["applied", "invited", "matched", "shipping", "creating", "review", "published", "settlement", "completed", "cancelled"];

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

  return (
    <div className="creator-mission-detail">
      <Link href="/dashboard/creator/my-campaigns">← 내 미션</Link>
      <header className="creator-page-heading"><p>{participation.campaign_category}</p><h1>{participation.campaign_title}</h1><span>{participation.next_action || creatorStatusLabel(participation.status)}</span></header>
      <section aria-labelledby="timeline-heading"><h2 id="timeline-heading">진행 단계</h2><ol className="creator-mission-timeline">{timeline.map((status) => <li className={participation.status === status ? "is-current" : ""} key={status}>{creatorStatusLabel(status)}</li>)}</ol></section>
      <section><h2>캠페인 안내</h2><p>{participation.campaign_brief}</p><dl><div><dt>배송 안내</dt><dd>{participation.shipping_note || "배송 일정은 확정 후 안내합니다."}</dd></div><div><dt>콘텐츠 마감일</dt><dd>{participation.content_deadline ? new Date(participation.content_deadline).toLocaleDateString("ko-KR") : "확정 후 안내"}</dd></div><div><dt>보상</dt><dd>{participation.expected_reward || "협의 후 안내"}</dd></div></dl></section>
      {participation.status === "invited" ? <CreatorInvitationActions participationId={participation.id} /> : null}
      {canSubmit ? <section><h2>콘텐츠 제출</h2><CreatorSubmissionForm participationId={participation.id} /></section> : null}
      {canReportPerformance ? <section><h2>캠페인 성과</h2><CreatorPerformanceForm participationId={participation.id} /></section> : null}
      <section><h2>제출 내역</h2>{submissions.length ? <ul>{submissions.map((submission) => <li key={submission.id}><a href={submission.content_url} target="_blank" rel="noreferrer">제출본 {submission.version}</a><span>{creatorStatusLabel(submission.status)}</span><p>{submission.caption_text}</p><p>검수 의견: {submission.review_note || "검수 대기 중"}</p><p>게시 상태: {submission.published_url ? <a href={submission.published_url} target="_blank" rel="noreferrer">게시된 콘텐츠 보기</a> : "승인 후 게시해 주세요."}</p></li>)}</ul> : <p>아직 제출한 콘텐츠가 없습니다.</p>}</section>
      <section><h2>활동 기록</h2>{events.length ? <ul>{events.map((event) => <li key={event.id}>{event.message} <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString("ko-KR")}</time></li>)}</ul> : <p>아직 활동 기록이 없습니다.</p>}</section>
    </div>
  );
}
