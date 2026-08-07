import Link from "next/link";
import { notFound } from "next/navigation";
import AdminCampaignOperations from "@/components/AdminCampaignOperations";
import AdminCampaignStatusAction from "@/components/AdminCampaignStatusAction";
import { getCreatorAccountsForAdmin } from "@/lib/db";
import { getAdminCampaign } from "@/lib/creator-campaigns";
import { isAdminCampaignEditable } from "@/lib/admin-campaign-ui";

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

export default async function AdminCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, creators] = await Promise.all([getAdminCampaign(id), getCreatorAccountsForAdmin()]);
  if (!campaign) notFound();

  return <div className="admin-campaign-detail">
    <Link href="/dashboard/admin/campaigns">← Campaigns</Link>
    <header className="admin-campaign-page-head"><div><p>{campaign.category}</p><h1 className="st-title">{campaign.title}</h1><p className="st-sub">{campaign.brief}</p></div>{isAdminCampaignEditable(campaign.status) ? <Link className="st-btn" href={`/dashboard/admin/campaigns/${campaign.id}/edit`}>캠페인 수정</Link> : null}</header>
    <section className="admin-campaign-summary" aria-label="campaign summary"><div><span>Capacity</span><strong>{campaign.occupied_count} / {campaign.slots}</strong></div><div><span>Applications</span><strong>{campaign.application_count}</strong></div><div><span>Status</span><strong>{campaign.status}</strong></div><div><span>Reward</span><strong>{campaign.reward_text}</strong></div><div><span>Application deadline</span><strong>{date(campaign.application_deadline)}</strong></div><div><span>Content deadline</span><strong>{date(campaign.content_deadline)}</strong></div></section>
    <AdminCampaignStatusAction campaignId={campaign.id} status={campaign.status} />
    <AdminCampaignOperations campaignId={campaign.id} campaignStatus={campaign.status} creators={creators} participants={campaign.participants} />
  </div>;
}
