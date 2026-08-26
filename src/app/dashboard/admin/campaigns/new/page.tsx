"use client";

import { useRouter } from "next/navigation";
import AdminCampaignForm from "@/components/AdminCampaignForm";
import { adminCampaignStatusLabel } from "@/lib/admin-campaign-ui";

const INITIAL_STATUS = "draft";

export default function NewAdminCampaignPage() {
  const router = useRouter();
  return <><h1 className="st-title">새 캠페인</h1><p className="st-sub">새 캠페인은 {adminCampaignStatusLabel(INITIAL_STATUS)} 상태로 저장됩니다.</p><AdminCampaignForm endpoint="/api/admin/campaigns" method="POST" onSuccess={(campaign) => router.push(`/dashboard/admin/campaigns/${campaign.id}`)} /></>;
}
