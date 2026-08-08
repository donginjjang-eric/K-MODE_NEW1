import { withDatabaseTransaction } from "./db";
import type { DatabaseTransactionClient } from "./db";
import type { CampaignStatus, CreatorAccount, ParticipationStatus, SettlementStatus, SubmissionStatus } from "./types";

export type DemoSeedResult = {
  campaigns: number;
  participations: number;
  submissions: number;
  events: number;
  performance: number;
};

export type DemoResetResult = { removedCampaigns: number };

type DemoCampaign = {
  id: string;
  title: string;
  category: string;
  markets: string[];
  platforms: string[];
  brief: string;
  rewardText: string;
  applicationDeadline: string;
  contentDeadline: string;
  slots: number;
  status: CampaignStatus;
};

type DemoParticipation = {
  id: string;
  campaignId: string;
  source: "application" | "invitation";
  status: ParticipationStatus;
  nextAction: string;
  expectedReward: string;
  settlementStatus: SettlementStatus;
};

type DemoEvent = {
  id: string;
  participationId: string;
  eventType: string;
  fromStatus: ParticipationStatus | null;
  toStatus: ParticipationStatus;
  message: string;
};

type DemoSubmission = {
  id: string;
  participationId: string;
  version: number;
  contentUrl: string;
  captionText: string;
  status: SubmissionStatus;
  reviewNote: string;
  publishedUrl: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
};

type DemoPerformance = {
  participationId: string;
  views: number;
  likes: number;
  comments: number;
  orders: number;
  revenue: number;
  currency: "MYR" | "VND";
};

export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    id: "demo-beauty-serum-recruiting",
    title: "[DEMO] Barrier Recovery Serum · Malaysia Creator Test",
    category: "K-Beauty / Skincare",
    markets: ["Malaysia"],
    platforms: ["TikTok", "Instagram"],
    brief: "Korean supplier sample for Malaysia-based creators. Show the barrier-care routine and the product's export-ready selling points.",
    rewardText: "RM 420",
    applicationDeadline: "2026-12-31T23:59:59Z",
    contentDeadline: "2027-01-31T23:59:59Z",
    slots: 12,
    status: "recruiting",
  },
  {
    id: "demo-beauty-cream-invited",
    title: "[DEMO] Daily Calm Cream · Vietnam Invitation",
    category: "K-Beauty / Skincare",
    markets: ["Vietnam"],
    platforms: ["TikTok", "Instagram"],
    brief: "A Korean supplier invites a Vietnam creator to introduce a daily calming cream through a local-language routine video.",
    rewardText: "VND 2,500,000",
    applicationDeadline: "2026-11-30T23:59:59Z",
    contentDeadline: "2026-12-31T23:59:59Z",
    slots: 8,
    status: "recruiting",
  },
  {
    id: "demo-beauty-suncushion-review",
    title: "[DEMO] Daily Sun Cushion · Vietnam Review",
    category: "K-Beauty / Makeup",
    markets: ["Vietnam"],
    platforms: ["TikTok", "YouTube"],
    brief: "Review a Korean sun cushion for Vietnam audiences, focusing on finish, portability, and daily reapplication.",
    rewardText: "VND 2,500,000",
    applicationDeadline: "2026-08-01T23:59:59Z",
    contentDeadline: "2026-08-20T23:59:59Z",
    slots: 10,
    status: "active",
  },
  {
    id: "demo-beauty-liptint-completed",
    title: "[DEMO] Velvet Lip Tint · Malaysia Sales Story",
    category: "K-Beauty / Makeup",
    markets: ["Malaysia"],
    platforms: ["TikTok", "Instagram"],
    brief: "Completed demo campaign connecting a Korean lip tint supplier with a Malaysia creator's content and sales funnel.",
    rewardText: "RM 420",
    applicationDeadline: "2026-06-01T23:59:59Z",
    contentDeadline: "2026-06-20T23:59:59Z",
    slots: 6,
    status: "closed",
  },
];

const DEMO_CAMPAIGN_IDS = DEMO_CAMPAIGNS.map((campaign) => campaign.id);

const DEMO_PARTICIPATIONS: DemoParticipation[] = [
  {
    id: "demo-beauty-cream-invited-participation",
    campaignId: "demo-beauty-cream-invited",
    source: "invitation",
    status: "invited",
    nextAction: "Review the invitation and accept the Vietnam brief",
    expectedReward: "VND 2,500,000",
    settlementStatus: "none",
  },
  {
    id: "demo-beauty-suncushion-review-participation",
    campaignId: "demo-beauty-suncushion-review",
    source: "application",
    status: "review",
    nextAction: "Wait for Korean supplier content review",
    expectedReward: "VND 2,500,000",
    settlementStatus: "pending",
  },
  {
    id: "demo-beauty-liptint-completed-participation",
    campaignId: "demo-beauty-liptint-completed",
    source: "application",
    status: "completed",
    nextAction: "View the completed Malaysia settlement",
    expectedReward: "RM 420",
    settlementStatus: "paid",
  },
];

const DEMO_EVENTS: DemoEvent[] = [
  {
    id: "demo-beauty-cream-invited-event",
    participationId: "demo-beauty-cream-invited-participation",
    eventType: "invitation_created",
    fromStatus: null,
    toStatus: "invited",
    message: "Korean supplier invited a Vietnam creator to review the campaign.",
  },
  ...[
    ["matched", "shipping", "Product shipment prepared in Korea."],
    ["shipping", "creating", "Vietnam creator received the product."],
    ["creating", "review", "Content submitted for supplier review."],
  ].map(([fromStatus, toStatus, message], index) => ({
    id: `demo-beauty-suncushion-event-${index + 1}`,
    participationId: "demo-beauty-suncushion-review-participation",
    eventType: "status_changed",
    fromStatus: fromStatus as ParticipationStatus,
    toStatus: toStatus as ParticipationStatus,
    message,
  })),
  ...[
    ["matched", "shipping", "Product shipment prepared in Korea."],
    ["shipping", "creating", "Malaysia creator received the product."],
    ["creating", "review", "Content submitted for supplier review."],
    ["review", "published", "Supplier approved and creator published the story."],
    ["published", "settlement", "Sales performance confirmed for settlement."],
    ["settlement", "completed", "RM 420 settlement paid to the creator."],
  ].map(([fromStatus, toStatus, message], index) => ({
    id: `demo-beauty-liptint-event-${index + 1}`,
    participationId: "demo-beauty-liptint-completed-participation",
    eventType: "status_changed",
    fromStatus: fromStatus as ParticipationStatus,
    toStatus: toStatus as ParticipationStatus,
    message,
  })),
];

const DEMO_SUBMISSIONS: DemoSubmission[] = [
  {
    id: "demo-beauty-suncushion-review-submission",
    participationId: "demo-beauty-suncushion-review-participation",
    version: 1,
    contentUrl: "https://demo.k-modu.co.kr/content/suncushion-review-v1",
    captionText: "A portable Korean sun cushion for everyday Vietnam weather.",
    status: "submitted",
    reviewNote: "Supplier review is in progress.",
    publishedUrl: null,
    submittedAt: "2026-08-15T09:00:00Z",
    reviewedAt: null,
    publishedAt: null,
  },
  {
    id: "demo-beauty-liptint-completed-submission",
    participationId: "demo-beauty-liptint-completed-participation",
    version: 1,
    contentUrl: "https://demo.k-modu.co.kr/content/liptint-story-v1",
    captionText: "Velvet lip color from a Korean beauty supplier, styled for Malaysia.",
    status: "published",
    reviewNote: "Approved by the Korean supplier.",
    publishedUrl: "https://demo.k-modu.co.kr/published/liptint-story-v1",
    submittedAt: "2026-06-15T09:00:00Z",
    reviewedAt: "2026-06-16T09:00:00Z",
    publishedAt: "2026-06-18T09:00:00Z",
  },
];

const DEMO_PERFORMANCE: DemoPerformance[] = [
  {
    participationId: "demo-beauty-liptint-completed-participation",
    views: 184200,
    likes: 12740,
    comments: 386,
    orders: 86,
    revenue: 12900,
    currency: "MYR",
  },
];

const DEMO_PARTICIPATION_BY_ID = new Map(DEMO_PARTICIPATIONS.map((participation) => [participation.id, participation]));
const DEMO_EVENT_BY_ID = new Map(DEMO_EVENTS.map((event) => [event.id, event]));
const DEMO_SUBMISSION_BY_ID = new Map(DEMO_SUBMISSIONS.map((submission) => [submission.id, submission]));
const DEMO_PERFORMANCE_BY_PARTICIPATION = new Map(DEMO_PERFORMANCE.map((performance) => [performance.participationId, performance]));

async function assertAdminOwnedCreator(client: DatabaseTransactionClient, adminUserId: string, creatorAccountId: string): Promise<CreatorAccount> {
  if (!adminUserId.trim() || !creatorAccountId.trim()) throw new Error("Admin and creator IDs are required.");

  const admin = await client.query<{ id: string }>(
    "SELECT id FROM users WHERE id = $1 AND role = 'admin' FOR UPDATE",
    [adminUserId],
  );
  if (!admin.rows[0]) throw new Error("Admin access is required.");

  const creator = await client.query<CreatorAccount>(
    "SELECT * FROM creator_accounts WHERE id = $1 AND user_id = $2 AND approval_status = 'approved' FOR UPDATE",
    [creatorAccountId, adminUserId],
  );
  if (!creator.rows[0]) throw new Error("An approved admin creator account is required.");
  return creator.rows[0];
}

async function assertDemoCampaignSlots(client: DatabaseTransactionClient, adminUserId: string) {
  const existing = await client.query<{ id: string; owner_id: string; title: string }>(
    "SELECT id, owner_id, title FROM campaigns WHERE id = ANY($1::text[]) FOR UPDATE",
    [[...DEMO_CAMPAIGN_IDS]],
  );
  for (const campaign of existing.rows) {
    if (!campaign.title.startsWith("[DEMO]") || campaign.owner_id !== adminUserId) {
      throw new Error(`Demo campaign ID collision: ${campaign.id}`);
    }
  }
}

function isDemoId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("demo-beauty-");
}

async function assertDemoChildGraph(client: DatabaseTransactionClient, adminUserId: string, creatorAccountId: string) {
  const campaignIds = [...DEMO_CAMPAIGN_IDS];
  const participationIds = [...DEMO_PARTICIPATION_BY_ID.keys()];
  const eventIds = [...DEMO_EVENT_BY_ID.keys()];
  const submissionIds = [...DEMO_SUBMISSION_BY_ID.keys()];

  const [relatedParticipations, fixedParticipations] = await Promise.all([
    client.query<{ id: string; campaign_id: string; creator_account_id: string; source: string; status: string; next_action: string; expected_reward: string; settlement_status: string }>(
      "SELECT id, campaign_id, creator_account_id, source, status, next_action, expected_reward, settlement_status FROM campaign_participations WHERE campaign_id = ANY($1::text[]) FOR UPDATE",
      [campaignIds],
    ),
    client.query<{ id: string; campaign_id: string; creator_account_id: string; source: string; status: string; next_action: string; expected_reward: string; settlement_status: string }>(
      "SELECT id, campaign_id, creator_account_id, source, status, next_action, expected_reward, settlement_status FROM campaign_participations WHERE id = ANY($1::text[]) FOR UPDATE",
      [participationIds],
    ),
  ]);
  const participations = new Map([...relatedParticipations.rows, ...fixedParticipations.rows].map((row) => [row.id, row]));
  for (const row of participations.values()) {
    const expected = DEMO_PARTICIPATION_BY_ID.get(row.id);
    if (!expected || !isDemoId(row.id) || row.campaign_id !== expected.campaignId || row.creator_account_id !== creatorAccountId || row.source !== expected.source || row.status !== expected.status || row.next_action !== expected.nextAction || row.expected_reward !== expected.expectedReward || row.settlement_status !== expected.settlementStatus) {
      throw new Error(`Demo participation ID collision: ${row.id}`);
    }
  }

  const actualParticipationIds = [...participations.keys()];
  const [relatedEvents, fixedEvents, relatedSubmissions, fixedSubmissions, performanceRows] = await Promise.all([
    client.query<{ id: string; participation_id: string; actor_user_id: string | null; event_type: string; from_status: ParticipationStatus | null; to_status: ParticipationStatus; message: string }>(
      "SELECT id, participation_id, actor_user_id, event_type, from_status, to_status, message FROM campaign_events WHERE participation_id = ANY($1::text[]) FOR UPDATE",
      [actualParticipationIds],
    ),
    client.query<{ id: string; participation_id: string; actor_user_id: string | null; event_type: string; from_status: ParticipationStatus | null; to_status: ParticipationStatus; message: string }>(
      "SELECT id, participation_id, actor_user_id, event_type, from_status, to_status, message FROM campaign_events WHERE id = ANY($1::text[]) FOR UPDATE",
      [eventIds],
    ),
    client.query<{ id: string; participation_id: string; version: number; content_url: string; caption_text: string; status: SubmissionStatus; review_note: string; published_url: string | null; submitted_at: string; reviewed_at: string | null; published_at: string | null }>(
      "SELECT id, participation_id, version, content_url, caption_text, status, review_note, published_url, submitted_at, reviewed_at, published_at FROM content_submissions WHERE participation_id = ANY($1::text[]) FOR UPDATE",
      [actualParticipationIds],
    ),
    client.query<{ id: string; participation_id: string; version: number; content_url: string; caption_text: string; status: SubmissionStatus; review_note: string; published_url: string | null; submitted_at: string; reviewed_at: string | null; published_at: string | null }>(
      "SELECT id, participation_id, version, content_url, caption_text, status, review_note, published_url, submitted_at, reviewed_at, published_at FROM content_submissions WHERE id = ANY($1::text[]) FOR UPDATE",
      [submissionIds],
    ),
    client.query<{ participation_id: string; views: number; likes: number; comments: number; orders: number; revenue: number; currency: string }>(
      "SELECT participation_id, views, likes, comments, orders, revenue, currency FROM campaign_performance WHERE participation_id = ANY($1::text[]) FOR UPDATE",
      [actualParticipationIds],
    ),
  ]);

  const events = new Map([...relatedEvents.rows, ...fixedEvents.rows].map((row) => [row.id, row]));
  for (const row of events.values()) {
    const expected = DEMO_EVENT_BY_ID.get(row.id);
    if (!expected || !isDemoId(row.id) || row.participation_id !== expected.participationId || row.actor_user_id !== adminUserId || row.event_type !== expected.eventType || row.from_status !== expected.fromStatus || row.to_status !== expected.toStatus || row.message !== expected.message) {
      throw new Error(`Demo event ID collision: ${row.id}`);
    }
  }

  const submissions = new Map([...relatedSubmissions.rows, ...fixedSubmissions.rows].map((row) => [row.id, row]));
  for (const row of submissions.values()) {
    const expected = DEMO_SUBMISSION_BY_ID.get(row.id);
    if (!expected || !isDemoId(row.id) || row.participation_id !== expected.participationId || row.version !== expected.version || row.content_url !== expected.contentUrl || row.caption_text !== expected.captionText || row.status !== expected.status || row.review_note !== expected.reviewNote || row.published_url !== expected.publishedUrl || row.submitted_at !== expected.submittedAt || row.reviewed_at !== expected.reviewedAt || row.published_at !== expected.publishedAt) {
      throw new Error(`Demo submission ID collision: ${row.id}`);
    }
  }

  for (const row of performanceRows.rows) {
    const expected = DEMO_PERFORMANCE_BY_PARTICIPATION.get(row.participation_id);
    if (!expected || row.views !== expected.views || row.likes !== expected.likes || row.comments !== expected.comments || row.orders !== expected.orders || Number(row.revenue) !== expected.revenue || row.currency !== expected.currency) {
      throw new Error(`Demo performance provenance violation: ${row.participation_id}`);
    }
  }
}

async function upsertDemoCampaign(client: DatabaseTransactionClient, adminUserId: string, campaign: DemoCampaign) {
  await client.query(
    `INSERT INTO campaigns
       (id, owner_id, title, category, markets, platforms, brief, reward_text,
        application_deadline, content_deadline, slots, image_urls, status)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, '[]'::jsonb, $12)
     ON CONFLICT (id) DO UPDATE SET
       owner_id = EXCLUDED.owner_id,
       title = EXCLUDED.title,
       category = EXCLUDED.category,
       markets = EXCLUDED.markets,
       platforms = EXCLUDED.platforms,
       brief = EXCLUDED.brief,
       reward_text = EXCLUDED.reward_text,
       application_deadline = EXCLUDED.application_deadline,
       content_deadline = EXCLUDED.content_deadline,
       slots = EXCLUDED.slots,
       image_urls = EXCLUDED.image_urls,
       status = EXCLUDED.status,
       updated_at = now()`,
    [
      campaign.id,
      adminUserId,
      campaign.title,
      campaign.category,
      JSON.stringify(campaign.markets),
      JSON.stringify(campaign.platforms),
      campaign.brief,
      campaign.rewardText,
      campaign.applicationDeadline,
      campaign.contentDeadline,
      campaign.slots,
      campaign.status,
    ],
  );
}

async function upsertDemoParticipation(client: DatabaseTransactionClient, creatorAccountId: string, participation: DemoParticipation) {
  await client.query(
    `INSERT INTO campaign_participations
       (id, campaign_id, creator_account_id, source, status, next_action, expected_reward, settlement_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       campaign_id = EXCLUDED.campaign_id,
       creator_account_id = EXCLUDED.creator_account_id,
       source = EXCLUDED.source,
       status = EXCLUDED.status,
       next_action = EXCLUDED.next_action,
       expected_reward = EXCLUDED.expected_reward,
       settlement_status = EXCLUDED.settlement_status,
       updated_at = now()`,
    [participation.id, participation.campaignId, creatorAccountId, participation.source, participation.status, participation.nextAction, participation.expectedReward, participation.settlementStatus],
  );
}

async function upsertDemoEvent(client: DatabaseTransactionClient, adminUserId: string, event: DemoEvent) {
  await client.query(
    `INSERT INTO campaign_events
       (id, participation_id, actor_user_id, event_type, from_status, to_status, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       participation_id = EXCLUDED.participation_id,
       actor_user_id = EXCLUDED.actor_user_id,
       event_type = EXCLUDED.event_type,
       from_status = EXCLUDED.from_status,
       to_status = EXCLUDED.to_status,
       message = EXCLUDED.message`,
    [event.id, event.participationId, adminUserId, event.eventType, event.fromStatus, event.toStatus, event.message],
  );
}

async function upsertDemoSubmission(client: DatabaseTransactionClient, submission: DemoSubmission) {
  await client.query(
    `INSERT INTO content_submissions
       (id, participation_id, version, content_url, caption_text, status, review_note,
        published_url, submitted_at, reviewed_at, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       participation_id = EXCLUDED.participation_id,
       version = EXCLUDED.version,
       content_url = EXCLUDED.content_url,
       caption_text = EXCLUDED.caption_text,
       status = EXCLUDED.status,
       review_note = EXCLUDED.review_note,
       published_url = EXCLUDED.published_url,
       submitted_at = EXCLUDED.submitted_at,
       reviewed_at = EXCLUDED.reviewed_at,
       published_at = EXCLUDED.published_at`,
    [submission.id, submission.participationId, submission.version, submission.contentUrl, submission.captionText, submission.status, submission.reviewNote, submission.publishedUrl, submission.submittedAt, submission.reviewedAt, submission.publishedAt],
  );
}

async function upsertDemoPerformance(client: DatabaseTransactionClient, performance: DemoPerformance) {
  await client.query(
    `INSERT INTO campaign_performance
       (participation_id, views, likes, comments, orders, revenue, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (participation_id) DO UPDATE SET
       views = EXCLUDED.views,
       likes = EXCLUDED.likes,
       comments = EXCLUDED.comments,
       orders = EXCLUDED.orders,
       revenue = EXCLUDED.revenue,
       currency = EXCLUDED.currency,
       updated_at = now()`,
    [performance.participationId, performance.views, performance.likes, performance.comments, performance.orders, performance.revenue, performance.currency],
  );
}

export async function seedCreatorBeautyDemo(adminUserId: string, creatorAccountId: string): Promise<DemoSeedResult> {
  return withDatabaseTransaction(async (client) => {
    await assertAdminOwnedCreator(client, adminUserId, creatorAccountId);
    await assertDemoCampaignSlots(client, adminUserId);
    await assertDemoChildGraph(client, adminUserId, creatorAccountId);
    for (const campaign of DEMO_CAMPAIGNS) await upsertDemoCampaign(client, adminUserId, campaign);
    for (const participation of DEMO_PARTICIPATIONS) await upsertDemoParticipation(client, creatorAccountId, participation);
    for (const event of DEMO_EVENTS) await upsertDemoEvent(client, adminUserId, event);
    for (const submission of DEMO_SUBMISSIONS) await upsertDemoSubmission(client, submission);
    for (const performance of DEMO_PERFORMANCE) await upsertDemoPerformance(client, performance);

    return {
      campaigns: DEMO_CAMPAIGNS.length,
      participations: DEMO_PARTICIPATIONS.length,
      submissions: DEMO_SUBMISSIONS.length,
      events: DEMO_EVENTS.length,
      performance: DEMO_PERFORMANCE.length,
    };
  });
}

export async function resetCreatorBeautyDemo(adminUserId: string, creatorAccountId: string): Promise<DemoResetResult> {
  return withDatabaseTransaction(async (client) => {
    await assertAdminOwnedCreator(client, adminUserId, creatorAccountId);
    await assertDemoCampaignSlots(client, adminUserId);
    await assertDemoChildGraph(client, adminUserId, creatorAccountId);
    const deleted = await client.query<{ id: string }>(
      "DELETE FROM campaigns WHERE id = ANY($2::text[]) AND owner_id = $1 AND title LIKE '[DEMO]%' RETURNING id",
      [adminUserId, [...DEMO_CAMPAIGN_IDS]],
    );
    return { removedCampaigns: deleted.rowCount ?? deleted.rows.length };
  });
}
