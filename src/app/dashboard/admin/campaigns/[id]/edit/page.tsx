import Link from "next/link";
import { notFound } from "next/navigation";
import AdminCampaignForm from "@/components/AdminCampaignForm";
import { isAdminCampaignEditable } from "@/lib/admin-campaign-ui";
import { getAdminCampaign } from "@/lib/creator-campaigns";

export default async function EditAdminCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getAdminCampaign(id);
  if (!campaign) notFound();
  if (!isAdminCampaignEditable(campaign.status)) {
    return <div className="st-empty"><h1 className="st-title">캠페인을 수정할 수 없습니다.</h1><p>진행 중이거나 마감된 캠페인은 운영 기록을 보호하기 위해 수정할 수 없습니다.</p><Link className="st-btn" href={`/dashboard/admin/campaigns/${campaign.id}`}>캠페인 상세로 돌아가기</Link></div>;
  }
  return <><h1 className="st-title">캠페인 수정</h1><p className="st-sub">모집 중인 캠페인의 운영 정보를 최신 상태로 유지해 주세요.</p><AdminCampaignForm campaign={campaign} endpoint={`/api/admin/campaigns/${campaign.id}`} method="PATCH" redirectTo={`/dashboard/admin/campaigns/${campaign.id}`} /></>;
}
