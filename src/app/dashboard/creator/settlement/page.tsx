import { requireApprovedCreator } from "@/lib/auth";
import { getCreatorSettlementSummary } from "@/lib/db";

function amount(value: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export default async function CreatorSettlementPage() {
  const { creator } = await requireApprovedCreator();
  const summary = await getCreatorSettlementSummary(creator.id);

  return <div className="creator-campaigns-page">
    <header className="creator-page-heading"><p>SETTLEMENT</p><h1>Settlement</h1><span>Amounts remain in their original currency; no exchange rates are applied.</span></header>
    {summary.length ? <div className="creator-campaign-grid">{summary.map((item) => <section className="creator-campaign-card" key={item.currency}><div className="creator-campaign-card-body"><p className="creator-card-kicker">{item.currency}</p><dl><div><dt>Expected</dt><dd>{amount(item.expected, item.currency)}</dd></div><div><dt>Pending</dt><dd>{amount(item.pending, item.currency)}</dd></div><div><dt>Confirmed</dt><dd>{amount(item.confirmed, item.currency)}</dd></div><div><dt>Paid</dt><dd>{amount(item.paid, item.currency)}</dd></div></dl></div></section>)}</div> : <div className="creator-empty-state"><h2>No settlement amounts yet.</h2><p>Reported campaign revenue will appear here in the currency you entered.</p></div>}
  </div>;
}
