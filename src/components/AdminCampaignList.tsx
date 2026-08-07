import Link from "next/link";
import type { Campaign } from "@/lib/types";

const FILTERS = ["all", "draft", "recruiting", "active", "closed"] as const;
const STATUS_LABELS = { draft: "초안", recruiting: "모집 중", active: "진행 중", closed: "마감" } as const;

export default function AdminCampaignList({ campaigns, selectedStatus }: { campaigns: Campaign[]; selectedStatus: typeof FILTERS[number] }) {
  return (
    <section className="admin-campaign-list">
      <nav className="admin-campaign-filters" aria-label="campaign status filters">
        {FILTERS.map((status) => <Link className={selectedStatus === status ? "is-active" : ""} href={status === "all" ? "/dashboard/admin/campaigns" : `/dashboard/admin/campaigns?status=${status}`} key={status}>{status}</Link>)}
      </nav>
      {campaigns.length ? <div className="admin-campaign-table-wrap"><table><thead><tr><th scope="col">title</th><th scope="col">category</th><th scope="col">markets</th><th scope="col">platforms</th><th scope="col">applications</th><th scope="col">matched</th><th scope="col">slots</th><th scope="col">deadline</th><th scope="col">status</th></tr></thead><tbody>
        {campaigns.map((campaign) => <tr key={campaign.id}><td><Link href={`/dashboard/admin/campaigns/${campaign.id}/edit`}>{campaign.title}</Link></td><td>{campaign.category}</td><td>{campaign.markets.join(", ")}</td><td>{campaign.platforms.join(", ")}</td><td>0</td><td>0</td><td>{campaign.slots}</td><td>{campaign.application_deadline ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(campaign.application_deadline)) : "-"}</td><td><span className={`admin-campaign-status is-${campaign.status}`}>{STATUS_LABELS[campaign.status]}</span></td></tr>)}
      </tbody></table></div> : <div className="st-empty"><p>조건에 맞는 캠페인이 없습니다.</p></div>}
    </section>
  );
}
