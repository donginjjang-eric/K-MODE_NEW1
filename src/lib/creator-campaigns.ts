import type { PoolClient } from "pg";
import { hasDatabase, one, query, withDatabaseTransaction } from "./db";
import type { Campaign, CampaignParticipation, CreatorAccount, ParticipationStatus } from "./types";

export type CampaignFitCreator = Pick<CreatorAccount, "id" | "market" | "platform" | "categories">;
export type CampaignFitCampaign = Pick<Campaign, "id" | "category" | "markets" | "platforms" | "application_deadline">;
export type RecommendedCampaign = Campaign & { fit: { score: number; reasons: string[] } };

const ACTIVE_PARTICIPATION_STATUSES: ParticipationStatus[] = ["matched", "shipping", "creating", "review", "published", "settlement"];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function includesNormalized(values: string[], value: string) {
  const needle = normalize(value);
  return values.some((candidate) => normalize(candidate) === needle);
}

function deadlineIsOpen(deadline: string | null, now: Date) {
  return Boolean(deadline && new Date(deadline).getTime() > now.getTime());
}

export function scoreCampaignFit({ creator, campaign, now = new Date() }: {
  creator: CampaignFitCreator;
  campaign: CampaignFitCampaign;
  now?: Date;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  if (includesNormalized(campaign.markets, creator.market)) reasons.push("market");
  if (includesNormalized(campaign.platforms, creator.platform)) reasons.push("platform");
  if (creator.categories.some((category) => normalize(category) === normalize(campaign.category))) reasons.push("category");
  if (deadlineIsOpen(campaign.application_deadline, now)) reasons.push("deadline");

  const score = reasons.reduce((total, reason) => total + (
    reason === "market" ? 40 : reason === "platform" ? 30 : reason === "category" ? 20 : 10
  ), 0);
  return { score, reasons };
}

export function rankCampaignRecommendations<T extends CampaignFitCampaign>(creator: CampaignFitCreator, campaigns: T[], now = new Date()): Array<T & { fit: { score: number; reasons: string[] } }> {
  return campaigns
    .map((campaign, index) => ({ campaign, index, fit: scoreCampaignFit({ creator, campaign, now }) }))
    .sort((left, right) => {
      const scoreDifference = right.fit.score - left.fit.score;
      if (scoreDifference) return scoreDifference;
      const leftDeadline = left.campaign.application_deadline ? new Date(left.campaign.application_deadline).getTime() : Number.POSITIVE_INFINITY;
      const rightDeadline = right.campaign.application_deadline ? new Date(right.campaign.application_deadline).getTime() : Number.POSITIVE_INFINITY;
      return leftDeadline - rightDeadline || left.index - right.index;
    })
    .map(({ campaign, fit }) => ({ ...campaign, fit }));
}

export function assertCampaignCanAcceptApplication(
  campaign: Pick<Campaign, "id" | "status" | "application_deadline">,
  existingStatus: ParticipationStatus | null,
  now = new Date(),
) {
  if (campaign.status !== "recruiting") throw new Error("Campaign is not recruiting.");
  if (campaign.application_deadline && new Date(campaign.application_deadline).getTime() <= now.getTime()) {
    throw new Error("Campaign application deadline has passed.");
  }
  if (existingStatus && existingStatus !== "invited") throw new Error("Creator already participates in this campaign.");
}

export function assertCampaignCanCreateInvitation(
  campaign: Pick<Campaign, "id" | "status" | "application_deadline" | "slots">,
  occupiedSlots: number,
  existingStatus: ParticipationStatus | null,
  now = new Date(),
) {
  if (campaign.status !== "recruiting") throw new Error("Campaign is not recruiting.");
  if (campaign.application_deadline && new Date(campaign.application_deadline).getTime() <= now.getTime()) {
    throw new Error("Campaign application deadline has passed.");
  }
  if (existingStatus) throw new Error("Creator already participates in this campaign.");
  if (occupiedSlots >= campaign.slots) throw new Error("Campaign is at capacity.");
}

export function resolveApplicationStatus(existingStatus: ParticipationStatus | null): ParticipationStatus {
  if (!existingStatus) return "applied";
  if (existingStatus === "invited") return "matched";
  throw new Error("Creator already participates in this campaign.");
}

export function resolveInvitationResponseStatus(status: ParticipationStatus, accept: boolean): ParticipationStatus {
  if (status !== "invited") throw new Error("Only invitations can be answered.");
  return accept ? "matched" : "cancelled";
}

export function canTransitionParticipation(fromStatus: ParticipationStatus, toStatus: ParticipationStatus) {
  const allowed: Record<ParticipationStatus, ParticipationStatus[]> = {
    applied: ["matched", "cancelled"],
    invited: ["matched", "cancelled"],
    matched: ["shipping", "cancelled"],
    shipping: ["creating", "cancelled"],
    creating: ["review", "cancelled"],
    review: ["creating", "published", "cancelled"],
    published: ["settlement", "cancelled"],
    settlement: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  return allowed[fromStatus].includes(toStatus);
}

function assertTransition(fromStatus: ParticipationStatus, toStatus: ParticipationStatus) {
  if (!canTransitionParticipation(fromStatus, toStatus)) {
    throw new Error(`Cannot transition participation from ${fromStatus} to ${toStatus}.`);
  }
}

async function insertCampaignEvent(client: PoolClient, participation: CampaignParticipation, actorUserId: string | null, fromStatus: ParticipationStatus | null, eventType: string, message: string) {
  await client.query(
    `INSERT INTO campaign_events (participation_id, actor_user_id, event_type, from_status, to_status, message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [participation.id, actorUserId, eventType, fromStatus, participation.status, message],
  );
}

async function getCreatorForUpdate(client: PoolClient, creatorId: string) {
  const result = await client.query<CreatorAccount>("SELECT * FROM creator_accounts WHERE id = $1 FOR UPDATE", [creatorId]);
  if (!result.rows[0]) throw new Error("Creator account was not found.");
  return result.rows[0];
}

export async function getRecommendedCampaigns(creatorId: string): Promise<RecommendedCampaign[]> {
  if (!hasDatabase()) return [];
  const creator = await one<CreatorAccount>("SELECT * FROM creator_accounts WHERE id = $1", [creatorId]);
  if (!creator) return [];
  const campaigns = await query<Campaign>(
    `SELECT * FROM campaigns
      WHERE status = 'recruiting'
        AND (application_deadline IS NULL OR application_deadline > now())
      ORDER BY application_deadline ASC NULLS LAST, created_at ASC`,
  );
  return rankCampaignRecommendations(creator, campaigns);
}

export type CreatorActionSummary = {
  recommendedCampaigns: number;
  applied: number;
  invited: number;
  matched: number;
  active: number;
  completed: number;
};

export async function getCreatorActionSummary(creatorId: string): Promise<CreatorActionSummary> {
  const empty = { recommendedCampaigns: 0, applied: 0, invited: 0, matched: 0, active: 0, completed: 0 };
  if (!hasDatabase()) return empty;
  const [recommended, row] = await Promise.all([
    getRecommendedCampaigns(creatorId),
    one<{ applied: string; invited: string; matched: string; active: string; completed: string }>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'applied')::text AS applied,
        COUNT(*) FILTER (WHERE status = 'invited')::text AS invited,
        COUNT(*) FILTER (WHERE status = 'matched')::text AS matched,
        COUNT(*) FILTER (WHERE status = ANY($2::text[]))::text AS active,
        COUNT(*) FILTER (WHERE status = 'completed')::text AS completed
       FROM campaign_participations
       WHERE creator_account_id = $1`,
      [creatorId, ACTIVE_PARTICIPATION_STATUSES],
    ),
  ]);
  return {
    recommendedCampaigns: recommended.length,
    applied: Number(row?.applied || 0),
    invited: Number(row?.invited || 0),
    matched: Number(row?.matched || 0),
    active: Number(row?.active || 0),
    completed: Number(row?.completed || 0),
  };
}

export type CreatorCampaignActivity = Pick<CampaignParticipation, "id" | "status" | "next_action" | "expected_reward" | "settlement_status" | "updated_at"> & {
  campaign_id: string;
  campaign_title: string;
};

export async function getCreatorCampaignActivity(creatorId: string): Promise<CreatorCampaignActivity[]> {
  if (!hasDatabase()) return [];
  return query<CreatorCampaignActivity>(
    `SELECT p.id, p.campaign_id, p.status, p.next_action, p.expected_reward, p.settlement_status, p.updated_at,
            c.title AS campaign_title
       FROM campaign_participations p
       JOIN campaigns c ON c.id = p.campaign_id
      WHERE p.creator_account_id = $1
        AND p.status = ANY($2::text[])
      ORDER BY p.updated_at DESC
      LIMIT 4`,
    [creatorId, ACTIVE_PARTICIPATION_STATUSES],
  );
}

export type CreatorSettlementSummary = Record<"pending" | "confirmed" | "paid", number>;

export async function getCreatorSettlementSummary(creatorId: string): Promise<CreatorSettlementSummary> {
  const empty = { pending: 0, confirmed: 0, paid: 0 };
  if (!hasDatabase()) return empty;
  const row = await one<{ pending: string; confirmed: string; paid: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE settlement_status = 'pending')::text AS pending,
       COUNT(*) FILTER (WHERE settlement_status = 'confirmed')::text AS confirmed,
       COUNT(*) FILTER (WHERE settlement_status = 'paid')::text AS paid
     FROM campaign_participations
     WHERE creator_account_id = $1`,
    [creatorId],
  );
  return {
    pending: Number(row?.pending || 0),
    confirmed: Number(row?.confirmed || 0),
    paid: Number(row?.paid || 0),
  };
}

export async function applyToCampaign(creatorId: string, campaignId: string): Promise<CampaignParticipation> {
  return withDatabaseTransaction(async (client) => {
    const creator = await getCreatorForUpdate(client, creatorId);
    const campaignResult = await client.query<Campaign>("SELECT * FROM campaigns WHERE id = $1 FOR UPDATE", [campaignId]);
    const campaign = campaignResult.rows[0];
    if (!campaign) throw new Error("Campaign was not found.");

    const existingResult = await client.query<CampaignParticipation>(
      "SELECT * FROM campaign_participations WHERE campaign_id = $1 AND creator_account_id = $2 FOR UPDATE",
      [campaignId, creatorId],
    );
    const existing = existingResult.rows[0] ?? null;
    assertCampaignCanAcceptApplication(campaign, existing?.status ?? null);
    const nextStatus = resolveApplicationStatus(existing?.status ?? null);
    const participationResult = existing
      ? await client.query<CampaignParticipation>(
        `UPDATE campaign_participations SET status = $3, next_action = 'Campaign matched', updated_at = now()
          WHERE id = $1 AND creator_account_id = $2 RETURNING *`,
        [existing.id, creatorId, nextStatus],
      )
      : await client.query<CampaignParticipation>(
        `INSERT INTO campaign_participations (campaign_id, creator_account_id, source, status, next_action, expected_reward)
         VALUES ($1, $2, 'application', 'applied', 'Await campaign response', $3)
         RETURNING *`,
        [campaignId, creatorId, campaign.reward_text],
      );
    const participation = participationResult.rows[0];
    if (!participation) throw new Error("Campaign participation could not be saved.");
    await insertCampaignEvent(client, participation, creator.user_id, existing?.status ?? null, existing ? "application_accepted" : "application_created", existing ? "Application accepted an existing invitation." : "Application submitted.");
    return participation;
  });
}

export async function createCampaignInvitation(actorUserId: string, campaignId: string, creatorId: string): Promise<CampaignParticipation> {
  return withDatabaseTransaction(async (client) => {
    const creator = await getCreatorForUpdate(client, creatorId);
    if (creator.approval_status !== "approved") throw new Error("Creator account is not approved.");

    const campaignResult = await client.query<Campaign>("SELECT * FROM campaigns WHERE id = $1 FOR UPDATE", [campaignId]);
    const campaign = campaignResult.rows[0];
    if (!campaign) throw new Error("Campaign was not found.");

    const existingResult = await client.query<CampaignParticipation>(
      "SELECT * FROM campaign_participations WHERE campaign_id = $1 AND creator_account_id = $2 FOR UPDATE",
      [campaignId, creatorId],
    );
    const existing = existingResult.rows[0] ?? null;
    const occupiedResult = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM campaign_participations WHERE campaign_id = $1 AND status <> 'cancelled'",
      [campaignId],
    );
    assertCampaignCanCreateInvitation(campaign, Number(occupiedResult.rows[0]?.count || 0), existing?.status ?? null);

    const saved = await client.query<CampaignParticipation>(
      `INSERT INTO campaign_participations (campaign_id, creator_account_id, source, status, next_action, expected_reward)
       VALUES ($1, $2, 'invitation', 'invited', 'Review campaign invitation', $3)
       RETURNING *`,
      [campaignId, creatorId, campaign.reward_text],
    );
    const participation = saved.rows[0];
    if (!participation) throw new Error("Campaign invitation could not be created.");
    await insertCampaignEvent(client, participation, actorUserId, null, "invitation_created", "Campaign invitation created.");
    return participation;
  });
}

export async function respondToInvitation(creatorId: string, participationId: string, accept: boolean): Promise<CampaignParticipation> {
  return withDatabaseTransaction(async (client) => {
    const creator = await getCreatorForUpdate(client, creatorId);
    const current = await client.query<CampaignParticipation>(
      "SELECT * FROM campaign_participations WHERE id = $1 AND creator_account_id = $2 FOR UPDATE",
      [participationId, creatorId],
    );
    const participation = current.rows[0];
    if (!participation) throw new Error("Invitation was not found.");
    const nextStatus = resolveInvitationResponseStatus(participation.status, accept);
    const saved = await client.query<CampaignParticipation>(
      `UPDATE campaign_participations SET status = $3, next_action = $4, updated_at = now()
        WHERE id = $1 AND creator_account_id = $2 RETURNING *`,
      [participationId, creatorId, nextStatus, accept ? "Campaign matched" : "Invitation declined"],
    );
    const updated = saved.rows[0];
    if (!updated) throw new Error("Invitation could not be updated.");
    await insertCampaignEvent(client, updated, creator.user_id, participation.status, accept ? "invitation_accepted" : "invitation_declined", accept ? "Invitation accepted." : "Invitation declined.");
    return updated;
  });
}

export async function updateCampaignParticipationStatus(creatorId: string, participationId: string, toStatus: ParticipationStatus): Promise<CampaignParticipation> {
  return withDatabaseTransaction(async (client) => {
    const creator = await getCreatorForUpdate(client, creatorId);
    const current = await client.query<CampaignParticipation>(
      "SELECT * FROM campaign_participations WHERE id = $1 AND creator_account_id = $2 FOR UPDATE",
      [participationId, creatorId],
    );
    const participation = current.rows[0];
    if (!participation) throw new Error("Campaign participation was not found.");
    assertTransition(participation.status, toStatus);
    const saved = await client.query<CampaignParticipation>(
      `UPDATE campaign_participations SET status = $3, updated_at = now()
        WHERE id = $1 AND creator_account_id = $2 RETURNING *`,
      [participationId, creatorId, toStatus],
    );
    const updated = saved.rows[0];
    if (!updated) throw new Error("Campaign participation could not be updated.");
    await insertCampaignEvent(client, updated, creator.user_id, participation.status, "status_changed", `Status changed to ${toStatus}.`);
    return updated;
  });
}
