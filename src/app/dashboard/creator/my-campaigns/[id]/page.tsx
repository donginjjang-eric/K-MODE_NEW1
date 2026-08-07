import Link from "next/link";
import { notFound } from "next/navigation";
import CreatorInvitationActions from "@/components/CreatorInvitationActions";
import CreatorPerformanceForm from "@/components/CreatorPerformanceForm";
import CreatorSubmissionForm from "@/components/CreatorSubmissionForm";
import { requireApprovedCreator } from "@/lib/auth";
import { getCampaignEventsForParticipation, getContentSubmissionsForParticipation, getParticipationForCreator } from "@/lib/db";

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
      <Link href="/dashboard/creator/my-campaigns">← My missions</Link>
      <header className="creator-page-heading"><p>{participation.campaign_category}</p><h1>{participation.campaign_title}</h1><span>{participation.next_action || participation.status}</span></header>
      <section aria-labelledby="timeline-heading"><h2 id="timeline-heading">Mission timeline</h2><ol className="creator-mission-timeline">{timeline.map((status) => <li className={participation.status === status ? "is-current" : ""} key={status}>{status}</li>)}</ol></section>
      <section><h2>Campaign brief</h2><p>{participation.campaign_brief}</p><dl><div><dt>Shipping</dt><dd>{participation.shipping_note || "Shipping details will follow."}</dd></div><div><dt>Content deadline</dt><dd>{participation.content_deadline ? new Date(participation.content_deadline).toLocaleDateString() : "To be confirmed"}</dd></div><div><dt>Reward</dt><dd>{participation.expected_reward || "To be confirmed"}</dd></div></dl></section>
      {participation.status === "invited" ? <CreatorInvitationActions participationId={participation.id} /> : null}
      {canSubmit ? <section><h2>Submit content</h2><CreatorSubmissionForm participationId={participation.id} /></section> : null}
      {canReportPerformance ? <section><h2>Campaign performance</h2><CreatorPerformanceForm participationId={participation.id} /></section> : null}
      <section><h2>Submission history</h2>{submissions.length ? <ul>{submissions.map((submission) => <li key={submission.id}><a href={submission.content_url} target="_blank" rel="noreferrer">Version {submission.version}</a><span>{submission.status}</span><p>{submission.caption_text}</p><p>Review: {submission.review_note || "Pending review"}</p><p>Publication: {submission.published_url ? <a href={submission.published_url} target="_blank" rel="noreferrer">Published content</a> : "Publish after approval."}</p></li>)}</ul> : <p>No submissions yet.</p>}</section>
      <section><h2>Activity</h2>{events.length ? <ul>{events.map((event) => <li key={event.id}>{event.message} <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time></li>)}</ul> : <p>No activity yet.</p>}</section>
    </div>
  );
}
