import Link from "next/link";
import CreatorSubmissionForm from "@/components/CreatorSubmissionForm";
import { requireApprovedCreator } from "@/lib/auth";
import { getContentSubmissionsForParticipation, getCreatorMissionParticipations } from "@/lib/db";

export default async function CreatorSubmissionsPage() {
  const { creator } = await requireApprovedCreator();
  const participations = await getCreatorMissionParticipations(creator.id);
  const missions = await Promise.all(participations.map(async (participation) => ({
    participation,
    submissions: await getContentSubmissionsForParticipation(participation.id),
  })));

  return (
    <div className="creator-submissions-page">
      <header className="creator-page-heading"><p>SUBMISSIONS</p><h1>Content submissions</h1><span>Send HTTPS content links for review and keep each revision in one history.</span></header>
      {missions.length ? <ul>{missions.map(({ participation, submissions }) => <li key={participation.id}><h2>{participation.campaign_title}</h2><p>{participation.next_action || participation.status}</p>{participation.status === "creating" || participation.status === "review" ? <CreatorSubmissionForm participationId={participation.id} /> : null}<p>{submissions.length ? `${submissions.length} version${submissions.length === 1 ? "" : "s"} submitted` : "No versions submitted"}</p><Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>View full mission</Link></li>)}</ul> : <div className="creator-empty-state"><h2>No submissions to manage.</h2><Link href="/dashboard/creator/my-campaigns">View missions</Link></div>}
    </div>
  );
}
