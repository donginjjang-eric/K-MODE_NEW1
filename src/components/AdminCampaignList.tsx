import Link from "next/link";
import AdminCampaignListActions from "@/components/AdminCampaignListActions";
import { campaignStatusLabel, formatCampaignDeadline } from "@/lib/admin-campaign";
import type { AdminCampaignListItem } from "@/lib/types";

const FILTERS = ["all", "draft", "recruiting", "active", "closed"] as const;
const FILTER_LABELS = { all: "전체", draft: "초안", recruiting: "모집 중", active: "진행 중", closed: "마감" } as const;

export default function AdminCampaignList({ campaigns, selectedStatus }: { campaigns: AdminCampaignListItem[]; selectedStatus: typeof FILTERS[number] }) {
  return (
    <section className="admin-campaign-list">
      <nav className="admin-campaign-filters" aria-label="캠페인 상태 필터">
        {FILTERS.map((status) => <Link className={selectedStatus === status ? "is-active" : ""} href={status === "all" ? "/dashboard/admin/campaigns" : `/dashboard/admin/campaigns?status=${status}`} key={status}>{FILTER_LABELS[status]}</Link>)}
      </nav>
      {campaigns.length ? <div className="admin-campaign-table-wrap"><table><thead><tr><th scope="col">캠페인명</th><th scope="col">카테고리</th><th scope="col">진행 시장</th><th scope="col">플랫폼</th><th scope="col">신청</th><th scope="col">매칭</th><th scope="col">모집 인원</th><th scope="col">신청 마감</th><th scope="col">상태</th><th scope="col">관리</th></tr></thead><tbody>
        {campaigns.map((campaign) => <tr key={campaign.id}><td><Link href={`/dashboard/admin/campaigns/${campaign.id}`}>{campaign.title}</Link></td><td>{campaign.category}</td><td>{campaign.markets.join(", ")}</td><td>{campaign.platforms.join(", ")}</td><td>{campaign.application_count}</td><td>{campaign.matched_count}</td><td>{campaign.slots}</td><td>{formatCampaignDeadline(campaign.application_deadline)}</td><td><span className={`admin-campaign-status is-${campaign.status}`}>{campaignStatusLabel(campaign.status)}</span></td><td><AdminCampaignListActions campaignId={campaign.id} status={campaign.status} /></td></tr>)}
      </tbody></table></div> : <div className="st-empty"><p>조건에 맞는 캠페인이 없습니다.</p><Link className="st-btn primary" href="/dashboard/admin/campaigns/new">새 캠페인 만들기</Link></div>}
    </section>
  );
}
