import Link from "next/link";
import CreatorCampaignApplyButton from "@/components/CreatorCampaignApplyButton";
import { requireApprovedCreator } from "@/lib/auth";
import { getRecommendedCampaigns } from "@/lib/creator-campaigns";

type SearchParams = Record<string, string | string[] | undefined>;

function selectedValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function imageForCategory(category: string) {
  const image = category.toLowerCase().includes("beauty") || category.toLowerCase().includes("skin")
    ? "campaign-kdesigner-02.png"
    : "campaign-kdesigner-01.png";
  return `/assets/${image}`;
}

function reasonLabel(reason: string) {
  return ({ market: "Market match", platform: "Platform match", category: "Category match", deadline: "Open now" } as Record<string, string>)[reason] || reason;
}

function deadlineLabel(deadline: string | Date | null) {
  if (!deadline) return "No application deadline";
  if (deadline instanceof Date) return deadline.toISOString().slice(0, 10);
  return String(deadline).slice(0, 10);
}

export default async function CreatorCampaignsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { creator } = await requireApprovedCreator();
  const filters = await searchParams;
  const category = selectedValue(filters.category);
  const market = selectedValue(filters.market);
  const platform = selectedValue(filters.platform);
  const recommended = await getRecommendedCampaigns(creator.id);
  const campaigns = recommended.filter((campaign) => campaign.status === "recruiting")
    .filter((campaign) => !category || campaign.category === category)
    .filter((campaign) => !market || campaign.markets.includes(market))
    .filter((campaign) => !platform || campaign.platforms.includes(platform));
  const categories = [...new Set(recommended.map((campaign) => campaign.category))];
  const markets = [...new Set(recommended.flatMap((campaign) => campaign.markets))];
  const platforms = [...new Set(recommended.flatMap((campaign) => campaign.platforms))];

  return (
    <div className="creator-campaigns-page">
      <header className="creator-page-heading"><p>RECOMMENDED CAMPAIGNS</p><h1>내게 맞는 모집 캠페인</h1><span>시장, 채널, 카테고리 적합도를 실제 프로필 기준으로 계산했습니다.</span></header>
      <form className="creator-campaign-filters" action="/dashboard/creator/campaigns">
        <label>Category<select name="category" defaultValue={category}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Market<select name="market" defaultValue={market}><option value="">All markets</option>{markets.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Platform<select name="platform" defaultValue={platform}><option value="">All platforms</option>{platforms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <button type="submit">Apply filters</button>
        <Link href="/dashboard/creator/campaigns">Clear</Link>
      </form>
      <p className="creator-result-count" aria-live="polite">{campaigns.length} recruiting campaigns</p>
      {campaigns.length ? <div className="creator-campaign-grid">{campaigns.map((campaign) => <article className="creator-campaign-card" key={campaign.id}>
        <img src={imageForCategory(campaign.category)} alt="" />
        <div className="creator-campaign-card-body"><div className="creator-card-kicker"><span>{campaign.category}</span><b>{campaign.status}</b></div><h2>{campaign.title}</h2><p>{campaign.brief}</p><dl><div><dt>Reward</dt><dd>{campaign.reward_text || "To be confirmed"}</dd></div><div><dt>Deadline</dt><dd>{campaign.application_deadline ? <time dateTime={campaign.application_deadline} data-i18n-date="medium">{deadlineLabel(campaign.application_deadline)}</time> : "No application deadline"}</dd></div><div><dt>Slots</dt><dd>{campaign.slots}</dd></div></dl><div className="creator-match-tags" aria-label={`Match score ${campaign.fit.score}`}>{campaign.fit.reasons.map((reason) => <span key={reason}>{reasonLabel(reason)}</span>)}</div><CreatorCampaignApplyButton campaignId={campaign.id} /></div>
      </article>)}</div> : <div className="creator-empty-state"><h2>조건에 맞는 모집 캠페인이 없습니다.</h2><p>필터를 바꾸거나 나중에 다시 확인해 주세요.</p><Link href="/dashboard/creator/campaigns">필터 초기화</Link></div>}
    </div>
  );
}
