import { hasDatabase, one, query, withDatabaseTransaction } from "./db";
import type { DatabaseTransactionClient } from "./db";
import type { AdminCampaignInput, AdminCampaignListItem, AdminCampaignStatus, AdminParticipationAction, Campaign, CampaignEvent, CampaignParticipation, CampaignPerformance, ContentSubmission, CreatorAccount, ParticipationStatus } from "./types";

export type CampaignFitCreator = Pick<CreatorAccount, "id" | "market" | "platform" | "categories"> & { owner_role?: string };
export type CampaignFitCampaign = Pick<Campaign, "id" | "category" | "markets" | "platforms" | "application_deadline"> & { title?: string };
export type RecommendedCampaign = Campaign & { fit: { score: number; reasons: string[] } };

export const CAPACITY_OCCUPYING_PARTICIPATION_STATUSES: ParticipationStatus[] = ["matched", "shipping", "creating", "review", "published", "settlement", "completed"];

export function participationConsumesCampaignCapacity(status: string) {
  return CAPACITY_OCCUPYING_PARTICIPATION_STATUSES.includes(status as ParticipationStatus);
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

const MARKET_ALIASES: Record<string, string> = {
  malaysia: "malaysia", malaysian: "malaysia", "말레이시아": "malaysia", my: "malaysia", mys: "malaysia", msmy: "malaysia",
  vietnam: "vietnam", vietnamese: "vietnam", "베트남": "vietnam", vn: "vietnam", vnm: "vietnam", vivn: "vietnam",
  taiwan: "taiwan", taiwanese: "taiwan", "대만": "taiwan", tw: "taiwan", twn: "taiwan", zhtw: "taiwan",
  unitedstates: "united-states", unitedstatesofamerica: "united-states", usa: "united-states", us: "united-states", "미국": "united-states", enus: "united-states",
  southkorea: "south-korea", republicofkorea: "south-korea", korea: "south-korea", "대한민국": "south-korea", "한국": "south-korea", kr: "south-korea", kor: "south-korea", kokr: "south-korea",
  global: "global", "글로벌": "global", worldwide: "global", world: "global", all: "global", "전체": "global",
};

export function normalizeCampaignMarket(value: string) {
  const compact = normalize(value).replace(/[\s._-]+/g, "");
  return MARKET_ALIASES[compact] ?? compact;
}

function isWildcard(value: string) {
  return normalizeCampaignMarket(value) === "global";
}

function marketTargetsCreator(markets: string[], creatorMarket: string) {
  const normalizedCreatorMarket = normalizeCampaignMarket(creatorMarket);
  return normalizedCreatorMarket === "global"
    || markets.length === 0
    || markets.some((market) => isWildcard(market) || normalizeCampaignMarket(market) === normalizedCreatorMarket);
}

function platformTargetsCreator(platforms: string[], creatorPlatform: string) {
  return platforms.length === 0
    || platforms.some((platform) => isWildcard(platform) || normalize(platform) === normalize(creatorPlatform));
}

export function isAdministratorPreviewCreator(creator: CampaignFitCreator) {
  return creator.owner_role === "admin"
    && normalize(creator.platform).replace(/[\s._-]+/g, "") === "kmodu"
    && normalizeCampaignMarket(creator.market) === "south-korea";
}

export function isDemoCampaign(campaign: Pick<CampaignFitCampaign, "id" | "title">) {
  return campaign.id.startsWith("demo-beauty-") || campaign.title?.trim().startsWith("[DEMO]") === true;
}

export function assertCreatorCanAccessCampaign(creator: CampaignFitCreator, campaign: Pick<CampaignFitCampaign, "id" | "title">) {
  if (isDemoCampaign(campaign) && !isAdministratorPreviewCreator(creator)) {
    throw new Error("Demo campaigns are available only to the administrator preview.");
  }
}

export function campaignTargetsCreator(creator: CampaignFitCreator, campaign: CampaignFitCampaign) {
  if (isDemoCampaign(campaign) && !isAdministratorPreviewCreator(creator)) return false;
  if (isAdministratorPreviewCreator(creator)) return true;
  return marketTargetsCreator(campaign.markets, creator.market)
    && platformTargetsCreator(campaign.platforms, creator.platform);
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
  const administratorPreview = isAdministratorPreviewCreator(creator);
  if (administratorPreview || marketTargetsCreator(campaign.markets, creator.market)) reasons.push("market");
  if (administratorPreview || platformTargetsCreator(campaign.platforms, creator.platform)) reasons.push("platform");
  if (creator.categories.some((category) => normalize(category) === normalize(campaign.category))) reasons.push("category");
  if (deadlineIsOpen(campaign.application_deadline, now)) reasons.push("deadline");

  const score = reasons.reduce((total, reason) => total + (
    reason === "market" ? 40 : reason === "platform" ? 30 : reason === "category" ? 20 : 10
  ), 0);
  return { score, reasons };
}

export function rankCampaignRecommendations<T extends CampaignFitCampaign>(creator: CampaignFitCreator, campaigns: T[], now = new Date()): Array<T & { fit: { score: number; reasons: string[] } }> {
  return campaigns
    .filter((campaign) => campaignTargetsCreator(creator, campaign))
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

async function insertCampaignEvent(client: DatabaseTransactionClient, participation: CampaignParticipation, actorUserId: string | null, fromStatus: ParticipationStatus | null, eventType: string, message: string) {
  await client.query(
    `INSERT INTO campaign_events (participation_id, actor_user_id, event_type, from_status, to_status, message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [participation.id, actorUserId, eventType, fromStatus, participation.status, message],
  );
}

async function getCreatorForUpdate(client: DatabaseTransactionClient, creatorId: string) {
  const result = await client.query<CreatorAccount>("SELECT * FROM creator_accounts WHERE id = $1 FOR UPDATE", [creatorId]);
  if (!result.rows[0]) throw new Error("Creator account was not found.");
  return result.rows[0];
}

function resolveAdminParticipationAction(fromStatus: ParticipationStatus, action: AdminParticipationAction): ParticipationStatus {
  if (action === "approve") {
    if (fromStatus === "invited") throw new Error("Creator must accept invitations themselves.");
    if (fromStatus !== "applied") throw new Error(`Cannot transition participation from ${fromStatus} with approve.`);
    return "matched";
  }
  if (action === "reject") {
    if (fromStatus !== "applied") throw new Error(`Cannot transition participation from ${fromStatus} with reject.`);
    return "cancelled";
  }
  return action === "cancel" ? "cancelled" : action;
}

async function getCampaignOccupiedSlots(client: DatabaseTransactionClient, campaignId: string) {
  const result = await client.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM campaign_participations WHERE campaign_id = $1 AND status = ANY($2::text[])",
    [campaignId, CAPACITY_OCCUPYING_PARTICIPATION_STATUSES],
  );
  return Number(result.rows[0]?.count || 0);
}

function assertCampaignHasCapacity(campaign: Pick<Campaign, "slots">, occupiedSlots: number) {
  if (occupiedSlots >= campaign.slots) throw new Error("Campaign is at capacity.");
}

const ADMIN_CAMPAIGN_STATUSES: AdminCampaignStatus[] = ["draft", "recruiting", "active", "closed"];

function assertNonEmpty(value: string, field: string) {
  if (!value.trim()) throw new Error(`${field} is required.`);
}

const CANONICAL_REWARD_PATTERN = /^(RM|MYR|VND|USD|TWD|KRW) (?:0|[1-9]\d{0,2}(?:,\d{3})*|[1-9]\d*)$/;

export function normalizeCampaignRewardText(value: string) {
  const reward = value.trim().replace(/\s+/g, " ");
  if (!CANONICAL_REWARD_PATTERN.test(reward)) {
    throw new Error("Campaign reward must use a supported currency code followed by a whole-number amount, for example RM 420 or VND 2,500,000.");
  }
  return reward;
}

function assertHttpsImageUrls(imageUrls: string[]) {
  for (const imageUrl of imageUrls) {
    try {
      if (new URL(imageUrl).protocol !== "https:") throw new Error();
    } catch {
      throw new Error("Image URLs must use HTTPS.");
    }
  }
}

function assertValidAdminCampaignInput(input: Omit<AdminCampaignInput, "application_deadline" | "content_deadline"> & {
  application_deadline: string | null | undefined;
  content_deadline: string | null | undefined;
}) {
  assertNonEmpty(input.title, "Campaign title");
  assertNonEmpty(input.category, "Campaign category");
  assertNonEmpty(input.brief, "Campaign brief");
  normalizeCampaignRewardText(input.reward_text);
  if (!Number.isInteger(input.slots) || input.slots <= 0) throw new Error("Campaign slots must be positive.");
  if (!input.markets.some((market) => market.trim())) throw new Error("At least one market is required.");
  if (!input.platforms.some((platform) => platform.trim())) throw new Error("At least one platform is required.");
  assertHttpsImageUrls(input.image_urls ?? []);

  if (!input.application_deadline?.trim()) throw new Error("Application deadline is required.");
  if (!input.content_deadline?.trim()) throw new Error("Content deadline is required.");
  const applicationDeadline = new Date(input.application_deadline);
  const contentDeadline = new Date(input.content_deadline);
  if (Number.isNaN(applicationDeadline.getTime())) throw new Error("Application deadline is invalid.");
  if (Number.isNaN(contentDeadline.getTime())) throw new Error("Content deadline is invalid.");
  if (applicationDeadline >= contentDeadline) {
    throw new Error("Application deadline must be before content deadline.");
  }
}

async function getAdminForUpdate(client: DatabaseTransactionClient, adminId: string) {
  const result = await client.query<{ id: string; role: string }>("SELECT id, role FROM users WHERE id = $1 FOR UPDATE", [adminId]);
  const user = result.rows[0];
  if (!user || user.role !== "admin") throw new Error("Admin access is required.");
  return user;
}

function assertAdminCampaignStatus(status: string): asserts status is AdminCampaignStatus {
  if (!ADMIN_CAMPAIGN_STATUSES.includes(status as AdminCampaignStatus)) throw new Error("Campaign status is invalid.");
}

export async function listAdminCampaigns(filters: { status?: AdminCampaignStatus; category?: string; search?: string } = {}): Promise<AdminCampaignListItem[]> {
  if (!hasDatabase()) return [];
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`c.status = $${params.length}`);
  }
  if (filters.category?.trim()) {
    params.push(filters.category.trim());
    conditions.push(`c.category = $${params.length}`);
  }
  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(`(c.title ILIKE $${params.length} OR c.brief ILIKE $${params.length})`);
  }
  params.push(CAPACITY_OCCUPYING_PARTICIPATION_STATUSES);
  const matchedStatusParameter = params.length;
  return query<AdminCampaignListItem>(
    `SELECT c.*, COUNT(p.id) FILTER (WHERE p.source = 'application')::int AS application_count,
            COUNT(p.id) FILTER (WHERE p.status = ANY($${matchedStatusParameter}::text[]))::int AS matched_count
       FROM campaigns c
       LEFT JOIN campaign_participations p ON p.campaign_id = c.id
       ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
    params,
  );
}

export type AdminCampaignParticipant = CampaignParticipation & {
  creator_display_name: string;
  creator_google_email: string;
  creator_platform: string;
  creator_market: string;
  submissions: ContentSubmission[];
  performance: CampaignPerformance | null;
  events: CampaignEvent[];
};

export type AdminCampaignDetail = Campaign & {
  participants: AdminCampaignParticipant[];
  application_count: number;
  occupied_count: number;
};

export async function getAdminCampaign(id: string): Promise<AdminCampaignDetail | null> {
  if (!hasDatabase()) return null;
  const campaign = await one<Campaign>("SELECT * FROM campaigns WHERE id = $1", [id]);
  if (!campaign) return null;

  const participants = await query<Omit<AdminCampaignParticipant, "submissions" | "performance" | "events">>(
    `SELECT p.*, creator.display_name AS creator_display_name, creator.google_email AS creator_google_email,
            creator.platform AS creator_platform, creator.market AS creator_market
       FROM campaign_participations p
       JOIN creator_accounts creator ON creator.id = p.creator_account_id
      WHERE p.campaign_id = $1
      ORDER BY p.updated_at DESC`,
    [id],
  );
  const participationIds = participants.map((participant) => participant.id);
  if (!participationIds.length) {
    return { ...campaign, participants: [], application_count: 0, occupied_count: 0 };
  }

  const [submissions, performanceRows, events] = await Promise.all([
    query<ContentSubmission>("SELECT * FROM content_submissions WHERE participation_id = ANY($1::text[]) ORDER BY version DESC", [participationIds]),
    query<CampaignPerformance>("SELECT * FROM campaign_performance WHERE participation_id = ANY($1::text[])", [participationIds]),
    query<CampaignEvent>("SELECT * FROM campaign_events WHERE participation_id = ANY($1::text[]) ORDER BY created_at DESC", [participationIds]),
  ]);
  const submissionsByParticipation = new Map<string, ContentSubmission[]>();
  const performanceByParticipation = new Map(performanceRows.map((performance) => [performance.participation_id, performance]));
  const eventsByParticipation = new Map<string, CampaignEvent[]>();
  for (const submission of submissions) submissionsByParticipation.set(submission.participation_id, [...(submissionsByParticipation.get(submission.participation_id) ?? []), submission]);
  for (const event of events) eventsByParticipation.set(event.participation_id, [...(eventsByParticipation.get(event.participation_id) ?? []), event]);

  return {
    ...campaign,
    participants: participants.map((participant) => ({
      ...participant,
      submissions: submissionsByParticipation.get(participant.id) ?? [],
      performance: performanceByParticipation.get(participant.id) ?? null,
      events: eventsByParticipation.get(participant.id) ?? [],
    })),
    application_count: participants.filter((participant) => participant.source === "application").length,
    occupied_count: participants.filter((participant) => participationConsumesCampaignCapacity(participant.status)).length,
  };
}

export async function createAdminCampaign(adminId: string, input: AdminCampaignInput): Promise<Campaign> {
  assertValidAdminCampaignInput(input);
  const rewardText = normalizeCampaignRewardText(input.reward_text);
  return withDatabaseTransaction(async (client) => {
    await getAdminForUpdate(client, adminId);
    const result = await client.query<Campaign>(
      `INSERT INTO campaigns (owner_id, title, category, markets, platforms, brief, reward_text, application_deadline, content_deadline, slots, image_urls)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11::jsonb)
       RETURNING *`,
      [adminId, input.title.trim(), input.category.trim(), JSON.stringify(input.markets), JSON.stringify(input.platforms), input.brief.trim(), rewardText, input.application_deadline ?? null, input.content_deadline ?? null, input.slots, JSON.stringify(input.image_urls ?? [])],
    );
    const campaign = result.rows[0];
    if (!campaign) throw new Error("Campaign could not be created.");
    return campaign;
  });
}

export async function updateAdminCampaign(adminId: string, id: string, input: Partial<AdminCampaignInput>): Promise<Campaign> {
  return withDatabaseTransaction(async (client) => {
    await getAdminForUpdate(client, adminId);
    const current = await client.query<Campaign>("SELECT * FROM campaigns WHERE id = $1 FOR UPDATE", [id]);
    const campaign = current.rows[0];
    if (!campaign) throw new Error("Campaign was not found.");
    if (campaign.status !== "draft" && campaign.status !== "recruiting") {
      throw new Error("Only draft or recruiting campaigns can be edited.");
    }
    const next = { ...campaign, ...input, image_urls: input.image_urls ?? campaign.image_urls };
    assertValidAdminCampaignInput(next);
    const rewardText = normalizeCampaignRewardText(next.reward_text);
    if (next.slots < campaign.slots) {
      const occupiedSlots = await getCampaignOccupiedSlots(client, id);
      if (next.slots < occupiedSlots) throw new Error("Campaign slots cannot be reduced below occupied capacity.");
    }
    const result = await client.query<Campaign>(
      `UPDATE campaigns
          SET title = $2, category = $3, markets = $4::jsonb, platforms = $5::jsonb, brief = $6, reward_text = $7,
              application_deadline = $8, content_deadline = $9, slots = $10, image_urls = $11::jsonb, updated_at = now()
        WHERE id = $1 RETURNING *`,
      [id, next.title.trim(), next.category.trim(), JSON.stringify(next.markets), JSON.stringify(next.platforms), next.brief.trim(), rewardText, next.application_deadline ?? null, next.content_deadline ?? null, next.slots, JSON.stringify(next.image_urls ?? [])],
    );
    const updated = result.rows[0];
    if (!updated) throw new Error("Campaign could not be updated.");
    return updated;
  });
}

export async function setAdminCampaignStatus(adminId: string, id: string, status: AdminCampaignStatus): Promise<Campaign> {
  assertAdminCampaignStatus(status);
  return withDatabaseTransaction(async (client) => {
    await getAdminForUpdate(client, adminId);
    const current = await client.query<Campaign>("SELECT * FROM campaigns WHERE id = $1 FOR UPDATE", [id]);
    const campaign = current.rows[0];
    if (!campaign) throw new Error("Campaign was not found.");
    const allowed: Record<AdminCampaignStatus, AdminCampaignStatus[]> = {
      draft: ["recruiting", "closed"],
      recruiting: ["active", "closed"],
      active: ["closed"],
      closed: [],
    };
    if (campaign.status !== status && !allowed[campaign.status].includes(status)) {
      throw new Error(`Cannot transition campaign from ${campaign.status} to ${status}.`);
    }
    const result = await client.query<Campaign>("UPDATE campaigns SET status = $2, updated_at = now() WHERE id = $1 RETURNING *", [id, status]);
    const updated = result.rows[0];
    if (!updated) throw new Error("Campaign status could not be updated.");
    return updated;
  });
}

export async function transitionParticipationAsAdmin(adminId: string, participationId: string, action: AdminParticipationAction, note?: string): Promise<CampaignParticipation> {
  return withDatabaseTransaction(async (client) => {
    await getAdminForUpdate(client, adminId);
    const current = await client.query<CampaignParticipation>("SELECT * FROM campaign_participations WHERE id = $1 FOR UPDATE", [participationId]);
    const participation = current.rows[0];
    if (!participation) throw new Error("Campaign participation was not found.");
    const campaignResult = await client.query<Campaign>("SELECT * FROM campaigns WHERE id = $1 FOR UPDATE", [participation.campaign_id]);
    const campaign = campaignResult.rows[0];
    if (!campaign) throw new Error("Campaign was not found.");
    const nextStatus = resolveAdminParticipationAction(participation.status, action);
    assertTransition(participation.status, nextStatus);
    if (!participationConsumesCampaignCapacity(participation.status) && participationConsumesCampaignCapacity(nextStatus)) {
      assertCampaignHasCapacity(campaign, await getCampaignOccupiedSlots(client, participation.campaign_id));
    }
    const result = await client.query<CampaignParticipation>(
      "UPDATE campaign_participations SET status = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [participationId, nextStatus],
    );
    const updated = result.rows[0];
    if (!updated) throw new Error("Campaign participation could not be updated.");
    await insertCampaignEvent(client, updated, adminId, participation.status, "admin_status_changed", note?.trim() || `Status changed to ${nextStatus}.`);
    return updated;
  });
}

export async function getRecommendedCampaigns(creatorId: string): Promise<RecommendedCampaign[]> {
  if (!hasDatabase()) return [];
  const creator = await one<CreatorAccount>("SELECT * FROM creator_accounts WHERE id = $1", [creatorId]);
  if (!creator) return [];
  const owner = await one<{ role: string }>("SELECT role FROM users WHERE id = $1", [creator.user_id]);
  const campaigns = await query<Campaign>(
    `SELECT * FROM campaigns
      WHERE status = 'recruiting'
        AND (application_deadline IS NULL OR application_deadline > now())
      ORDER BY application_deadline ASC NULLS LAST, created_at ASC`,
  );
  return rankCampaignRecommendations({ ...creator, owner_role: owner?.role }, campaigns);
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
      [creatorId, CAPACITY_OCCUPYING_PARTICIPATION_STATUSES],
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
    [creatorId, CAPACITY_OCCUPYING_PARTICIPATION_STATUSES],
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
    if (isDemoCampaign(campaign)) {
      const ownerResult = await client.query<{ role: string }>("SELECT role FROM users WHERE id = $1 FOR UPDATE", [creator.user_id]);
      assertCreatorCanAccessCampaign({ ...creator, owner_role: ownerResult.rows[0]?.role }, campaign);
    }

    const existingResult = await client.query<CampaignParticipation>(
      "SELECT * FROM campaign_participations WHERE campaign_id = $1 AND creator_account_id = $2 FOR UPDATE",
      [campaignId, creatorId],
    );
    const existing = existingResult.rows[0] ?? null;
    assertCampaignCanAcceptApplication(campaign, existing?.status ?? null);
    const nextStatus = resolveApplicationStatus(existing?.status ?? null);
    if (!participationConsumesCampaignCapacity(existing?.status ?? "") && participationConsumesCampaignCapacity(nextStatus)) {
      assertCampaignHasCapacity(campaign, await getCampaignOccupiedSlots(client, campaignId));
    }
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
    if (isDemoCampaign(campaign)) {
      const ownerResult = await client.query<{ role: string }>("SELECT role FROM users WHERE id = $1 FOR UPDATE", [creator.user_id]);
      assertCreatorCanAccessCampaign({ ...creator, owner_role: ownerResult.rows[0]?.role }, campaign);
    }

    const existingResult = await client.query<CampaignParticipation>(
      "SELECT * FROM campaign_participations WHERE campaign_id = $1 AND creator_account_id = $2 FOR UPDATE",
      [campaignId, creatorId],
    );
    const existing = existingResult.rows[0] ?? null;
    const occupiedSlots = await getCampaignOccupiedSlots(client, campaignId);
    assertCampaignCanCreateInvitation(campaign, occupiedSlots, existing?.status ?? null);

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
    if (accept) {
      const campaignResult = await client.query<Campaign>("SELECT * FROM campaigns WHERE id = $1 FOR UPDATE", [participation.campaign_id]);
      const campaign = campaignResult.rows[0];
      if (!campaign) throw new Error("Campaign was not found.");
      assertCampaignHasCapacity(campaign, await getCampaignOccupiedSlots(client, participation.campaign_id));
    }
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
