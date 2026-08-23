import { one, query, withDatabaseTransaction } from "./db";
import type { DatabaseTransactionClient } from "./db";
import type { AgencyInviteStatus, CreatorAccount, CreatorClaimState, CreatorManagementGroupStatus, CreatorOnboardingSource, SettlementStatus } from "./types";

type CreatorApprovalStatus = "pending" | "approved" | "disabled";

export type CreatorCampaignAdminSummary = {
  campaignId: string;
  campaignTitle: string;
  participationStatus: string;
  expectedReward: string;
  currency: string | null;
  settlementStatus: string | null;
};

export type CreatorSettlementSummary = {
  expectedRewardTotal: number;
  settledCount: number;
  unsettledCount: number;
};

export type AdminManagedCreator = CreatorAccount & {
  followerTotal: number;
  managementGroupId: string | null;
  managementGroupName: string | null;
};

export type AdminManagedCreatorDetail = AdminManagedCreator & {
  campaigns: CreatorCampaignAdminSummary[];
  settlement: CreatorSettlementSummary;
};

export type CreatorManagementGroupSummary = {
  id: string;
  name: string;
  agencyName: string | null;
  status: CreatorManagementGroupStatus;
  creatorCount: number;
  followerTotal: number;
};

export type CreatorManagementGroupDetail = CreatorManagementGroupSummary & {
  notes: string | null;
  creators: AdminManagedCreator[];
  agencyUsers: Array<{ email: string; status: AgencyInviteStatus }>;
  auditEvents: Array<{ action: string; createdAt: string; metadata: Record<string, unknown> }>;
};

export type CreateCreatorManagementGroupInput = {
  name: string;
  agencyName?: string;
  notes?: string;
  creatorAccountIds: string[];
};

export type UpdateCreatorManagementGroupInput = {
  name?: string;
  agencyName?: string | null;
  notes?: string | null;
  status?: CreatorManagementGroupStatus;
};

export type ManagedCreatorFilters = {
  search?: string;
  market?: string;
  platform?: string;
  groupId?: string;
  onboardingSource?: CreatorOnboardingSource;
  claimState?: CreatorClaimState;
  approvalStatus?: CreatorApprovalStatus;
};

type ManagedCreatorRow = CreatorAccount & {
  management_group_id: string | null;
  management_group_name: string | null;
};

type ManagementGroupRow = {
  id: string;
  name: string;
  agency_name: string | null;
  notes: string | null;
  status: CreatorManagementGroupStatus;
  creator_count: string | number;
  follower_total: string | number;
};

type GroupMembership = {
  creator_account_id: string;
  group_id: string;
};

export class CreatorManagementDomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "CreatorManagementDomainError";
  }
}

function domainError(code: string, message: string): never {
  throw new CreatorManagementDomainError(code, message);
}

function normalizeText(value: unknown, code: string, message: string) {
  if (typeof value !== "string") domainError(code, message);
  const normalized = value.trim();
  if (!normalized) domainError(code, message);
  return normalized;
}

function normalizeOptionalText(value: unknown) {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") domainError("INVALID_INPUT", "입력값 형식이 올바르지 않습니다.");
  return value.trim() || null;
}

function normalizeId(value: unknown, code: string, message: string) {
  return normalizeText(value, code, message);
}

function normalizeCreatorIds(value: unknown) {
  if (!Array.isArray(value)) domainError("CREATOR_IDS_REQUIRED", "크리에이터 ID를 하나 이상 입력해 주세요.");
  const ids = [...new Set(value.map((id) => normalizeId(id, "CREATOR_ID_REQUIRED", "크리에이터 ID를 입력해 주세요.")))];
  if (!ids.length) domainError("CREATOR_IDS_REQUIRED", "크리에이터 ID를 하나 이상 입력해 주세요.");
  return ids;
}

function normalizeEmail(value: unknown) {
  const email = normalizeText(value, "AGENCY_EMAIL_REQUIRED", "대행사 이메일을 입력해 주세요.").toLocaleLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    domainError("AGENCY_EMAIL_INVALID", "대행사 이메일 형식이 올바르지 않습니다.");
  }
  return email;
}

function asNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toManagedCreator(row: ManagedCreatorRow): AdminManagedCreator {
  return {
    ...row,
    instagram_followers: asNumber(row.instagram_followers),
    tiktok_followers: asNumber(row.tiktok_followers),
    followerTotal: asNumber(row.instagram_followers) + asNumber(row.tiktok_followers),
    managementGroupId: row.management_group_id ?? null,
    managementGroupName: row.management_group_name ?? null,
  };
}

function toGroupSummary(row: ManagementGroupRow): CreatorManagementGroupSummary {
  return {
    id: row.id,
    name: row.name,
    agencyName: row.agency_name,
    status: row.status,
    creatorCount: asNumber(row.creator_count),
    followerTotal: asNumber(row.follower_total),
  };
}

function normalizedFilter(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function listManagedCreators(filters: ManagedCreatorFilters = {}): Promise<AdminManagedCreator[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (condition: string, value: unknown) => {
    params.push(value);
    conditions.push(condition.replace("?", `$${params.length}`));
  };
  const search = normalizedFilter(filters.search);
  if (search) {
    const term = `%${search.toLocaleLowerCase()}%`;
    params.push(term, term, term);
    conditions.push(`(lower(c.display_name) LIKE $${params.length - 2} OR lower(c.creator_key) LIKE $${params.length - 1} OR lower(c.google_email) LIKE $${params.length})`);
  }
  const market = normalizedFilter(filters.market);
  if (market) add("lower(c.market) = ?", market.toLocaleLowerCase());
  const platform = normalizedFilter(filters.platform);
  if (platform) add("lower(c.platform) = ?", platform.toLocaleLowerCase());
  const groupId = normalizedFilter(filters.groupId);
  if (groupId) add("membership.group_id = ?", groupId);
  if (filters.onboardingSource) add("c.onboarding_source = ?", filters.onboardingSource);
  if (filters.claimState) add("c.claim_state = ?", filters.claimState);
  if (filters.approvalStatus) add("c.approval_status = ?", filters.approvalStatus);

  const rows = await query<ManagedCreatorRow>(
    `SELECT c.*, membership.group_id AS management_group_id, group_row.name AS management_group_name
       FROM creator_accounts c
       LEFT JOIN creator_management_group_members membership ON membership.creator_account_id = c.id
       LEFT JOIN creator_management_groups group_row ON group_row.id = membership.group_id
       ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
       ORDER BY c.created_at DESC, c.id ASC`,
    params,
  );
  return rows.map(toManagedCreator);
}

export async function getManagedCreatorDetail(creatorKey: string): Promise<AdminManagedCreatorDetail | null> {
  const normalizedKey = normalizeId(creatorKey, "CREATOR_KEY_REQUIRED", "크리에이터 키를 입력해 주세요.");
  const row = await one<ManagedCreatorRow>(
    `SELECT c.*, member.group_id AS management_group_id, group_row.name AS management_group_name
       FROM creator_accounts c
       LEFT JOIN creator_management_group_members member ON member.creator_account_id = c.id
       LEFT JOIN creator_management_groups group_row ON group_row.id = member.group_id
      WHERE c.creator_key = $1 OR c.id = $1`,
    [normalizedKey],
  );
  if (!row) return null;

  const campaigns = await query<{
    campaign_id: string;
    campaign_title: string;
    participation_status: string;
    expected_reward: string;
    settlement_status: SettlementStatus | null;
    revenue: string | number | null;
    currency: string | null;
  }>(
    `SELECT participation.campaign_id, campaign.title AS campaign_title, participation.status AS participation_status,
            participation.expected_reward, participation.settlement_status, performance.revenue, performance.currency
       FROM campaign_participations participation
       JOIN campaigns campaign ON campaign.id = participation.campaign_id
       LEFT JOIN campaign_performance performance ON performance.participation_id = participation.id
      WHERE participation.creator_account_id = $1
      ORDER BY participation.updated_at DESC, participation.id DESC`,
    [row.id],
  );
  const settlement = campaigns.reduce<CreatorSettlementSummary>((summary, campaign) => ({
    expectedRewardTotal: summary.expectedRewardTotal + asNumber(campaign.revenue),
    settledCount: summary.settledCount + (campaign.settlement_status === "paid" ? 1 : 0),
    unsettledCount: summary.unsettledCount + (campaign.settlement_status === "paid" ? 0 : 1),
  }), { expectedRewardTotal: 0, settledCount: 0, unsettledCount: 0 });

  return {
    ...toManagedCreator(row),
    campaigns: campaigns.map((campaign) => ({
      campaignId: campaign.campaign_id,
      campaignTitle: campaign.campaign_title,
      participationStatus: campaign.participation_status,
      expectedReward: campaign.expected_reward,
      currency: campaign.currency,
      settlementStatus: campaign.settlement_status,
    })),
    settlement,
  };
}

const groupSummarySql = `SELECT group_row.id, group_row.name, group_row.agency_name, group_row.notes, group_row.status,
  COUNT(member.creator_account_id)::text AS creator_count,
  COALESCE(SUM(COALESCE(account.instagram_followers, 0) + COALESCE(account.tiktok_followers, 0)), 0)::text AS follower_total
 FROM creator_management_groups group_row
 LEFT JOIN creator_management_group_members member ON member.group_id = group_row.id
 LEFT JOIN creator_accounts account ON account.id = member.creator_account_id`;

export async function listCreatorManagementGroups(): Promise<CreatorManagementGroupSummary[]> {
  const rows = await query<ManagementGroupRow>(
    `${groupSummarySql}
     GROUP BY group_row.id
     ORDER BY group_row.created_at DESC, group_row.id ASC`,
  );
  return rows.map(toGroupSummary);
}

export async function getCreatorManagementGroup(groupId: string): Promise<CreatorManagementGroupDetail | null> {
  const normalizedGroupId = normalizeId(groupId, "GROUP_ID_REQUIRED", "관리 그룹 ID를 입력해 주세요.");
  const group = await one<ManagementGroupRow>(
    `${groupSummarySql}
      WHERE group_row.id = $1
      GROUP BY group_row.id`,
    [normalizedGroupId],
  );
  if (!group) return null;

  const [creators, agencyUsers, auditEvents] = await Promise.all([
    query<ManagedCreatorRow>(
      `SELECT c.*, member.group_id AS management_group_id, group_row.name AS management_group_name
         FROM creator_management_group_members member
         JOIN creator_accounts c ON c.id = member.creator_account_id
         JOIN creator_management_groups group_row ON group_row.id = member.group_id
        WHERE member.group_id = $1
        ORDER BY member.assigned_at DESC, c.id ASC`,
      [normalizedGroupId],
    ),
    query<{ email: string; status: AgencyInviteStatus }>(
      `SELECT invited_email AS email, invite_status AS status
         FROM creator_management_group_users
        WHERE group_id = $1
        ORDER BY invited_at DESC, id DESC`,
      [normalizedGroupId],
    ),
    query<{ action: string; created_at: string; metadata: Record<string, unknown> }>(
      `SELECT action, created_at, metadata
         FROM creator_management_audit_logs
        WHERE group_id = $1
        ORDER BY created_at DESC, id DESC`,
      [normalizedGroupId],
    ),
  ]);
  return {
    ...toGroupSummary(group),
    notes: group.notes,
    creators: creators.map(toManagedCreator),
    agencyUsers,
    auditEvents: auditEvents.map((event) => ({ action: event.action, createdAt: event.created_at, metadata: event.metadata ?? {} })),
  };
}

async function lockActor(client: DatabaseTransactionClient, actorUserId: string) {
  const result = await client.query<{ id: string }>("SELECT id FROM users WHERE id = $1 FOR UPDATE", [actorUserId]);
  if (!result.rows[0]) domainError("ACTOR_NOT_FOUND", "작업자 계정을 찾을 수 없습니다.");
}

async function lockGroup(client: DatabaseTransactionClient, groupId: string) {
  const result = await client.query<Pick<ManagementGroupRow, "id" | "name" | "agency_name" | "notes" | "status">>(
    "SELECT id, name, agency_name, notes, status FROM creator_management_groups WHERE id = $1 FOR UPDATE",
    [groupId],
  );
  if (!result.rows[0]) domainError("GROUP_NOT_FOUND", "관리 그룹을 찾을 수 없습니다.");
  return result.rows[0];
}

async function lockCreators(client: DatabaseTransactionClient, creatorAccountIds: string[]) {
  const result = await client.query<{ id: string }>(
    "SELECT id FROM creator_accounts WHERE id = ANY($1::text[]) FOR UPDATE",
    [creatorAccountIds],
  );
  const found = new Set(result.rows.map((creator) => creator.id));
  if (creatorAccountIds.some((creatorId) => !found.has(creatorId))) {
    domainError("CREATOR_NOT_FOUND", "저장된 크리에이터 계정을 찾을 수 없습니다.");
  }
}

async function writeAudit(client: DatabaseTransactionClient, actorUserId: string, action: string, groupId: string | null, creatorAccountId: string | null, metadata: Record<string, unknown>) {
  await client.query(
    `INSERT INTO creator_management_audit_logs
      (actor_user_id, action, group_id, creator_account_id, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [actorUserId, action, groupId, creatorAccountId, JSON.stringify(metadata)],
  );
}

async function replaceMemberships(client: DatabaseTransactionClient, actorUserId: string, groupId: string, creatorAccountIds: string[]) {
  await lockCreators(client, creatorAccountIds);
  const lockedMemberships = await client.query<GroupMembership>(
    `SELECT creator_account_id, group_id
       FROM creator_management_group_members
      WHERE creator_account_id = ANY($1::text[])
      FOR UPDATE`,
    [creatorAccountIds],
  );
  const previousGroupByCreator = new Map(lockedMemberships.rows.map((membership) => [membership.creator_account_id, membership.group_id]));
  if (lockedMemberships.rows.length) {
    await client.query(
      `DELETE FROM creator_management_group_members
        WHERE creator_account_id = ANY($1::text[])`,
      [creatorAccountIds],
    );
  }
  await client.query(
    `INSERT INTO creator_management_group_members (group_id, creator_account_id, assigned_by)
     SELECT $1, creator_account_id, $2
       FROM unnest($3::text[]) AS creator_account_id`,
    [groupId, actorUserId, creatorAccountIds],
  );
  await Promise.all(creatorAccountIds.map(async (creatorAccountId) => {
    const previousGroupId = previousGroupByCreator.get(creatorAccountId) ?? null;
    await writeAudit(
      client,
      actorUserId,
      previousGroupId && previousGroupId !== groupId ? "creator_moved" : "creator_assigned",
      groupId,
      creatorAccountId,
      { creatorAccountId, previousGroupId, nextGroupId: groupId },
    );
  }));
  return creatorAccountIds.length;
}

export async function createCreatorManagementGroup(actorUserId: string, input: CreateCreatorManagementGroupInput): Promise<string> {
  const actorId = normalizeId(actorUserId, "ACTOR_ID_REQUIRED", "작업자 ID를 입력해 주세요.");
  const name = normalizeText(input?.name, "GROUP_NAME_REQUIRED", "관리 그룹명을 입력해 주세요.");
  const creatorAccountIds = normalizeCreatorIds(input?.creatorAccountIds);
  const agencyName = normalizeOptionalText(input?.agencyName) ?? null;
  const notes = normalizeOptionalText(input?.notes) ?? null;

  return withDatabaseTransaction(async (client) => {
    await lockActor(client, actorId);
    const result = await client.query<{ id: string }>(
      `INSERT INTO creator_management_groups (name, agency_name, notes, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, agencyName, notes, actorId],
    );
    const groupId = result.rows[0]?.id;
    if (!groupId) domainError("GROUP_CREATE_FAILED", "관리 그룹을 만들 수 없습니다.");
    await writeAudit(client, actorId, "group_created", groupId, null, { name, agencyName, notes });
    await replaceMemberships(client, actorId, groupId, creatorAccountIds);
    return groupId;
  });
}

export async function updateCreatorManagementGroup(actorUserId: string, groupId: string, input: UpdateCreatorManagementGroupInput): Promise<void> {
  const actorId = normalizeId(actorUserId, "ACTOR_ID_REQUIRED", "작업자 ID를 입력해 주세요.");
  const normalizedGroupId = normalizeId(groupId, "GROUP_ID_REQUIRED", "관리 그룹 ID를 입력해 주세요.");
  const hasChange = input && Object.keys(input).some((key) => ["name", "agencyName", "notes", "status"].includes(key));
  if (!hasChange) domainError("GROUP_UPDATE_REQUIRED", "변경할 관리 그룹 정보를 입력해 주세요.");
  const name = input.name === undefined ? undefined : normalizeText(input.name, "GROUP_NAME_REQUIRED", "관리 그룹명을 입력해 주세요.");
  const agencyName = input.agencyName === undefined ? undefined : normalizeOptionalText(input.agencyName);
  const notes = input.notes === undefined ? undefined : normalizeOptionalText(input.notes);
  if (input.status !== undefined && input.status !== "active" && input.status !== "inactive") {
    domainError("GROUP_STATUS_INVALID", "관리 그룹 상태가 올바르지 않습니다.");
  }

  await withDatabaseTransaction(async (client) => {
    await lockActor(client, actorId);
    const before = await lockGroup(client, normalizedGroupId);
    const after = {
      name: name ?? before.name,
      agencyName: agencyName === undefined ? before.agency_name : agencyName,
      notes: notes === undefined ? before.notes : notes,
      status: input.status ?? before.status,
    };
    await client.query(
      `UPDATE creator_management_groups
          SET name = $2, agency_name = $3, notes = $4, status = $5, updated_at = now()
        WHERE id = $1`,
      [normalizedGroupId, after.name, after.agencyName, after.notes, after.status],
    );
    await writeAudit(client, actorId, "group_updated", normalizedGroupId, null, {
      before: { name: before.name, agencyName: before.agency_name, notes: before.notes, status: before.status },
      after,
    });
  });
}

export async function assignCreatorsToManagementGroup(actorUserId: string, groupId: string, creatorAccountIds: string[]): Promise<number> {
  const actorId = normalizeId(actorUserId, "ACTOR_ID_REQUIRED", "작업자 ID를 입력해 주세요.");
  const normalizedGroupId = normalizeId(groupId, "GROUP_ID_REQUIRED", "관리 그룹 ID를 입력해 주세요.");
  const normalizedCreatorIds = normalizeCreatorIds(creatorAccountIds);
  return withDatabaseTransaction(async (client) => {
    await lockActor(client, actorId);
    const group = await lockGroup(client, normalizedGroupId);
    if (group.status !== "active") {
      domainError("GROUP_INACTIVE", "비활성 관리 그룹에는 크리에이터를 배정할 수 없습니다.");
    }
    return replaceMemberships(client, actorId, normalizedGroupId, normalizedCreatorIds);
  });
}

export async function removeCreatorsFromManagementGroup(actorUserId: string, groupId: string, creatorAccountIds: string[]): Promise<number> {
  const actorId = normalizeId(actorUserId, "ACTOR_ID_REQUIRED", "작업자 ID를 입력해 주세요.");
  const normalizedGroupId = normalizeId(groupId, "GROUP_ID_REQUIRED", "관리 그룹 ID를 입력해 주세요.");
  const normalizedCreatorIds = normalizeCreatorIds(creatorAccountIds);
  return withDatabaseTransaction(async (client) => {
    await lockActor(client, actorId);
    await lockGroup(client, normalizedGroupId);
    await lockCreators(client, normalizedCreatorIds);
    await client.query<GroupMembership>(
      `SELECT creator_account_id, group_id
         FROM creator_management_group_members
        WHERE creator_account_id = ANY($1::text[]) AND group_id = $2
        FOR UPDATE`,
      [normalizedCreatorIds, normalizedGroupId],
    );
    const deleted = await client.query<GroupMembership>(
      `DELETE FROM creator_management_group_members
        WHERE group_id = $1 AND creator_account_id = ANY($2::text[])
        RETURNING creator_account_id, group_id`,
      [normalizedGroupId, normalizedCreatorIds],
    );
    await Promise.all(deleted.rows.map((membership) => writeAudit(
      client,
      actorId,
      "creator_removed",
      normalizedGroupId,
      membership.creator_account_id,
      { creatorAccountId: membership.creator_account_id, previousGroupId: membership.group_id },
    )));
    return deleted.rows.length;
  });
}

export async function inviteAgencyGroupUser(actorUserId: string, groupId: string, email: string): Promise<void> {
  const actorId = normalizeId(actorUserId, "ACTOR_ID_REQUIRED", "작업자 ID를 입력해 주세요.");
  const normalizedGroupId = normalizeId(groupId, "GROUP_ID_REQUIRED", "관리 그룹 ID를 입력해 주세요.");
  const normalizedEmail = normalizeEmail(email);
  await withDatabaseTransaction(async (client) => {
    await lockActor(client, actorId);
    await lockGroup(client, normalizedGroupId);
    const existing = await client.query<{ id: string }>(
      `SELECT id
         FROM creator_management_group_users
        WHERE group_id = $1 AND lower(invited_email) = $2
        FOR UPDATE`,
      [normalizedGroupId, normalizedEmail],
    );
    if (existing.rows[0]) domainError("AGENCY_EMAIL_DUPLICATE", "이미 초대된 대행사 이메일입니다.");
    await client.query(
      `INSERT INTO creator_management_group_users (group_id, invited_email, invited_by)
       VALUES ($1, $2, $3)`,
      [normalizedGroupId, normalizedEmail, actorId],
    );
    await writeAudit(client, actorId, "agency_user_invited", normalizedGroupId, null, { email: normalizedEmail });
  });
}

export async function revokeAgencyGroupUser(actorUserId: string, groupId: string, email: string): Promise<void> {
  const actorId = normalizeId(actorUserId, "ACTOR_ID_REQUIRED", "작업자 ID를 입력해 주세요.");
  const normalizedGroupId = normalizeId(groupId, "GROUP_ID_REQUIRED", "관리 그룹 ID를 입력해 주세요.");
  const normalizedEmail = normalizeEmail(email);
  await withDatabaseTransaction(async (client) => {
    await lockActor(client, actorId);
    await lockGroup(client, normalizedGroupId);
    const existing = await client.query<{ id: string; invite_status: AgencyInviteStatus }>(
      `SELECT id, invite_status
         FROM creator_management_group_users
        WHERE group_id = $1 AND lower(invited_email) = $2
        FOR UPDATE`,
      [normalizedGroupId, normalizedEmail],
    );
    if (!existing.rows[0]) domainError("AGENCY_INVITE_NOT_FOUND", "대행사 초대를 찾을 수 없습니다.");
    await client.query(
      `UPDATE creator_management_group_users
          SET invite_status = 'revoked'
        WHERE id = $1`,
      [existing.rows[0].id],
    );
    await writeAudit(client, actorId, "agency_user_revoked", normalizedGroupId, null, { email: normalizedEmail, previousStatus: existing.rows[0].invite_status });
  });
}
