import { requireApprovedCreator } from "@/lib/auth";
import { getCreatorSettlementSummary } from "@/lib/db";

function amount(value: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export default async function CreatorSettlementPage() {
  const { creator } = await requireApprovedCreator();
  const summary = await getCreatorSettlementSummary(creator.id);

  return <div className="creator-campaigns-page">
    <header className="creator-page-heading creator-page-heading-wide"><p>EARNINGS · SETTLEMENT</p><h1>수익·정산</h1><span>해외 크리에이터가 익숙한 현지 통화 기준으로 예상 수익부터 지급 완료까지 확인합니다. 환율 변환은 적용하지 않습니다.</span></header>
    {summary.length ? <div className="creator-campaign-grid creator-settlement-grid">{summary.map((item) => <section className="creator-campaign-card" key={item.currency}><div className="creator-campaign-card-body"><p className="creator-card-kicker"><span>{item.currency}</span><b>LOCAL CURRENCY</b></p><h2>{amount(item.expected, item.currency)}</h2><dl><div><dt>예상 수익</dt><dd>{amount(item.expected, item.currency)}</dd></div><div><dt>정산 대기</dt><dd>{amount(item.pending, item.currency)}</dd></div><div><dt>정산 확정</dt><dd>{amount(item.confirmed, item.currency)}</dd></div><div><dt>지급 완료</dt><dd>{amount(item.paid, item.currency)}</dd></div></dl></div></section>)}</div> : <div className="creator-empty-state"><h2>아직 정산 내역이 없습니다.</h2><p>캠페인 판매 성과가 등록되면 현지 통화로 표시됩니다.</p></div>}
  </div>;
}
