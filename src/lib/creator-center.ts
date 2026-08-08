import { hasDatabase, query } from "./db";
import type { ParticipationStatus } from "./types";

export type CreatorCenterMetrics = {
  recommendedCount: number;
  deadlineCount: number;
  expectedEarnings: string;
  monthlyOrders: number;
};

export type CreatorPerformanceRow = {
  participation_id: string;
  campaign_title: string;
  views: number;
  likes: number;
  comments: number;
  orders: number;
  revenue: number;
  currency: string;
  updated_at: string;
};

const REWARD_PATTERN = /\b(RM|MYR|VND|USD|TWD|KRW)\s*([\d,.]+)/i;

function localCurrencyForMarket(market: string) {
  const normalized = market.toLowerCase();
  if (normalized.includes("malaysia")) return "MYR";
  if (normalized.includes("vietnam")) return "VND";
  if (normalized.includes("taiwan")) return "TWD";
  if (normalized.includes("united states") || normalized.includes("usa")) return "USD";
  return "USD";
}

function parseReward(value: string) {
  const match = value.match(REWARD_PATTERN);
  if (!match) return null;
  const currency = match[1].toUpperCase() === "RM" ? "MYR" : match[1].toUpperCase();
  return { currency, amount: Number(match[2].replaceAll(",", "")) || 0 };
}

function formatLocalReward(currency: string, amount: number) {
  if (currency === "MYR") return `RM ${new Intl.NumberFormat("en-MY", { maximumFractionDigits: 0 }).format(amount)}`;
  return `${currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function buildCreatorCenterMetrics(input: {
  market: string;
  recommendedCount: number;
  deadlineCount: number;
  rewards: string[];
  monthlyOrders: number;
}): CreatorCenterMetrics {
  const currency = localCurrencyForMarket(input.market);
  const rewards = input.rewards.map(parseReward).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const localRewards = rewards.filter((item) => item.currency === currency);
  const selected = localRewards.length ? localRewards : rewards.slice(0, 1);
  const selectedCurrency = selected[0]?.currency ?? currency;
  const total = selected.reduce((sum, item) => sum + item.amount, 0);

  return {
    recommendedCount: input.recommendedCount,
    deadlineCount: input.deadlineCount,
    expectedEarnings: formatLocalReward(selectedCurrency, total),
    monthlyOrders: input.monthlyOrders,
  };
}

export function missionStageIndex(status: ParticipationStatus) {
  if (status === "shipping" || status === "matched" || status === "applied" || status === "invited") return 0;
  if (status === "creating") return 1;
  if (status === "review") return 2;
  if (status === "published") return 3;
  return 4;
}

export function creatorGrade(completedCampaigns: number) {
  if (completedCampaigns >= 3) return "PRO";
  if (completedCampaigns >= 1) return "RISING";
  return "STARTER";
}

export async function getCreatorPerformanceRows(creatorId: string): Promise<CreatorPerformanceRow[]> {
  if (!hasDatabase()) return [];
  return query<CreatorPerformanceRow>(
    `SELECT performance.participation_id, campaigns.title AS campaign_title,
            performance.views, performance.likes, performance.comments,
            performance.orders, performance.revenue, performance.currency,
            performance.updated_at
       FROM campaign_performance performance
       JOIN campaign_participations participation ON participation.id = performance.participation_id
       JOIN campaigns ON campaigns.id = participation.campaign_id
      WHERE participation.creator_account_id = $1
      ORDER BY performance.updated_at DESC`,
    [creatorId],
  );
}

export async function getCreatorMonthlyOrders(creatorId: string) {
  if (!hasDatabase()) return 0;
  const rows = await query<{ orders: string }>(
    `SELECT COALESCE(SUM(performance.orders), 0)::text AS orders
       FROM campaign_performance performance
       JOIN campaign_participations participation ON participation.id = performance.participation_id
      WHERE participation.creator_account_id = $1
        AND date_trunc('month', performance.updated_at) = date_trunc('month', now())`,
    [creatorId],
  );
  return Number(rows[0]?.orders || 0);
}
