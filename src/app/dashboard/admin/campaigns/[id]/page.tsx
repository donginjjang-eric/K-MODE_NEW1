import Link from "next/link";
import { notFound } from "next/navigation";
import AdminCampaignOperations from "@/components/AdminCampaignOperations";
import AdminCampaignStatusAction from "@/components/AdminCampaignStatusAction";
import { getCreatorAccountsForAdmin } from "@/lib/db";
import { getAdminCampaign } from "@/lib/creator-campaigns";
import { isAdminCampaignEditable } from "@/lib/admin-campaign-ui";
import { campaignStatusLabel, formatCampaignDeadline } from "@/lib/admin-campaign";

export default async function AdminCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, creators] = await Promise.all([getAdminCampaign(id), getCreatorAccountsForAdmin()]);
  if (!campaign) notFound();

  return <div className="admin-campaign-detail">
    <Link href="/dashboard/admin/campaigns">← 캠페인 목록</Link>
    <header className="admin-campaign-page-head"><div><p>{campaign.category}</p><h1 className="st-title">{campaign.title}</h1><p className="st-sub">{campaign.brief}</p></div>{isAdminCampaignEditable(campaign.status) ? <Link className="st-btn" href={`/dashboard/admin/campaigns/${campaign.id}/edit`}>캠페인 수정</Link> : null}</header>
    <section className="admin-campaign-summary" aria-label="캠페인 요약"><div><span>모집 현황</span><strong>{campaign.occupied_count} / {campaign.slots}</strong></div><div><span>신청 수</span><strong>{campaign.application_count}</strong></div><div><span>상태</span><strong>{campaignStatusLabel(campaign.status)}</strong></div><div><span>리워드</span><strong>{campaign.reward_text}</strong></div><div><span>신청 마감</span><strong>{formatCampaignDeadline(campaign.application_deadline)}</strong></div><div><span>콘텐츠 마감</span><strong>{formatCampaignDeadline(campaign.content_deadline)}</strong></div></section>
    <AdminCampaignStatusAction campaignId={campaign.id} status={campaign.status} />
    <AdminCampaignOperations campaignId={campaign.id} campaignStatus={campaign.status} creators={creators} participants={campaign.participants} />
  </div>;
}
