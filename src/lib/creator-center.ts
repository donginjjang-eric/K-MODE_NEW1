import { hasDatabase, query } from "./db";
import { formatCreatorReward, formatCreatorRewardBreakdown, parseCreatorReward } from "./creator-rewards";
import type { ParticipationStatus, SettlementStatus } from "./types";

export type CreatorCenterMetrics = {
  recommendedCount: number;
  deadlineCount: number;
  expectedEarnings: string;
  totalOrders: number;
};

export type CreatorCenterWorkItem = {
  status: ParticipationStatus;
  expectedReward: string;
  settlementStatus: SettlementStatus;
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

function localCurrencyForMarket(market: string) {
  const normalized = market.toLowerCase();
  if (normalized.includes("malaysia")) return "MYR";
  if (normalized.includes("vietnam")) return "VND";
  if (normalized.includes("taiwan")) return "TWD";
  if (normalized.includes("united states") || normalized.includes("usa")) return "USD";
  return "USD";
}

export function buildCreatorCenterMetrics(input: {
  market: string;
  administratorPreview?: boolean;
  recommendedCount: number;
  deadlineCount: number;
  workItems: CreatorCenterWorkItem[];
  performanceRows: Array<Pick<CreatorPerformanceRow, "orders">>;
}): CreatorCenterMetrics {
  const currency = localCurrencyForMarket(input.market);
  const localRewards = input.workItems
    .filter((item) => isAcceptedActiveWork(item.status) && item.settlementStatus !== "paid")
    .map((item) => parseCreatorReward(item.expectedReward))
    .filter((item): item is NonNullable<typeof item> => item !== null && item.currency === currency);
  const total = localRewards.reduce((sum, item) => sum + item.amount, 0);
  const previewBreakdown = input.administratorPreview
    ? formatCreatorRewardBreakdown(input.workItems.map((item) => ({
      status: item.status,
      expected_reward: item.expectedReward,
      settlement_status: item.settlementStatus,
    })))
    : "";

  return {
    recommendedCount: input.recommendedCount,
    deadlineCount: input.deadlineCount,
    expectedEarnings: input.administratorPreview
      ? previewBreakdown || "—"
      : localRewards.length ? formatCreatorReward(localRewards[0]!.currency, total) : "—",
    totalOrders: input.performanceRows.reduce((sum, row) => sum + Number(row.orders || 0), 0),
  };
}

export function missionStageIndex(status: ParticipationStatus) {
  if (status === "invited" || status === "applied" || status === "matched" || status === "cancelled") return -1;
  if (status === "shipping") return 0;
  if (status === "creating") return 1;
  if (status === "review") return 2;
  if (status === "published") return 3;
  return 4;
}

const ACCEPTED_ACTIVE_STATUSES: ParticipationStatus[] = ["matched", "shipping", "creating", "review", "published", "settlement"];

export function isAcceptedActiveWork(status: ParticipationStatus) {
  return ACCEPTED_ACTIVE_STATUSES.includes(status);
}

export function isActiveMissionStatus(status: ParticipationStatus) {
  return status !== "completed" && status !== "cancelled";
}

export function selectActiveMission<T extends { status: ParticipationStatus }>(missions: T[]) {
  return missions.find((mission) => isActiveMissionStatus(mission.status));
}

export function missionPreStageLabel(status: ParticipationStatus) {
  if (status === "invited") return "초대 확인 전";
  if (status === "applied") return "지원 검토 중";
  if (status === "matched") return "배송 준비 중";
  return "";
}

export function creatorGrade(completedCampaigns: number) {
  if (completedCampaigns >= 3) return "PRO";
  if (completedCampaigns >= 1) return "RISING";
  return "STARTER";
}

export function creatorRate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function creatorGradeProgress(completed: number) {
  const current = creatorGrade(completed);
  if (current === "PRO") return { current, next: null, remaining: 0, value: completed, max: completed };
  const max = current === "STARTER" ? 1 : 3;
  return { current, next: current === "STARTER" ? "RISING" : "PRO", remaining: max - completed, value: completed, max };
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
