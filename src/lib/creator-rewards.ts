import type { ParticipationStatus, SettlementStatus } from "./types";

export type CreatorRewardCurrency = "MYR" | "VND" | "TWD" | "USD" | "KRW";

export type CreatorRewardRow = {
  status: ParticipationStatus;
  expected_reward: string;
  settlement_status: SettlementStatus;
};

export type CreatorRewardSummary = {
  currency: CreatorRewardCurrency;
  expected: number;
  pending: number;
  confirmed: number;
  paid: number;
};

export type CreatorSettlementLedgerRow = CreatorRewardRow & {
  id: string;
  campaign_title: string;
  campaign_category: string;
  updated_at: string;
};

export type CreatorSettlementItem = CreatorSettlementLedgerRow & {
  currency: CreatorRewardCurrency;
  amount: number;
  statusLabel: string;
  stageIndex: number;
  nextAction: string;
};

const REWARD_PATTERN = /\b(RM|MYR|VND|USD|TWD|KRW)\s*([\d,.]+)/i;
const SETTLEMENT_ELIGIBLE_STATUSES: ParticipationStatus[] = ["matched", "shipping", "creating", "review", "published", "settlement", "completed"];
const CURRENCY_ORDER: CreatorRewardCurrency[] = ["MYR", "VND", "TWD", "USD", "KRW"];

export function parseCreatorReward(value: string) {
  const match = value.match(REWARD_PATTERN);
  if (!match) return null;
  const currency = (match[1].toUpperCase() === "RM" ? "MYR" : match[1].toUpperCase()) as CreatorRewardCurrency;
  return { currency, amount: Number(match[2].replaceAll(",", "")) || 0 };
}

export function formatCreatorReward(currency: CreatorRewardCurrency, amount: number) {
  if (currency === "MYR") return `RM ${new Intl.NumberFormat("en-MY", { maximumFractionDigits: 0 }).format(amount)}`;
  return `${currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function summarizeCreatorSettlementRewards(rows: CreatorRewardRow[]): CreatorRewardSummary[] {
  const grouped = new Map<CreatorRewardCurrency, CreatorRewardSummary>();
  for (const row of rows) {
    if (!SETTLEMENT_ELIGIBLE_STATUSES.includes(row.status)) continue;
    const reward = parseCreatorReward(row.expected_reward);
    if (!reward) continue;
    const summary = grouped.get(reward.currency) ?? { currency: reward.currency, expected: 0, pending: 0, confirmed: 0, paid: 0 };
    summary.expected += reward.amount;
    if (row.settlement_status === "pending" || row.settlement_status === "confirmed" || row.settlement_status === "paid") {
      summary[row.settlement_status] += reward.amount;
    }
    grouped.set(reward.currency, summary);
  }
  return CURRENCY_ORDER.flatMap((currency) => grouped.has(currency) ? [grouped.get(currency)!] : []);
}

const SETTLEMENT_VIEW = {
  none: { statusLabel: "수익 예정", stageIndex: -1, nextAction: "캠페인 완료 후 성과 확인이 시작됩니다." },
  pending: { statusLabel: "성과 확인", stageIndex: 0, nextAction: "등록된 성과와 확정 보상을 확인하고 있습니다." },
  confirmed: { statusLabel: "정산 확정", stageIndex: 1, nextAction: "지급 처리를 준비하고 있습니다." },
  paid: { statusLabel: "지급 완료", stageIndex: 3, nextAction: "확정 보상의 지급 처리가 완료되었습니다." },
} as const;

export function toCreatorSettlementItems(rows: CreatorSettlementLedgerRow[]): CreatorSettlementItem[] {
  return rows.flatMap((row) => {
    if (!SETTLEMENT_ELIGIBLE_STATUSES.includes(row.status)) return [];
    const reward = parseCreatorReward(row.expected_reward);
    if (!reward) return [];
    return [{ ...row, ...reward, ...SETTLEMENT_VIEW[row.settlement_status] }];
  });
}

export function formatCreatorRewardBreakdown(rows: CreatorRewardRow[]) {
  return summarizeCreatorSettlementRewards(rows)
    .map((summary) => formatCreatorReward(summary.currency, summary.expected))
    .join(" · ");
}
