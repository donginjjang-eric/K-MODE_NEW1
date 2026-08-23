import assert from "node:assert/strict";
import { mock, test } from "node:test";

let activeClient;

await mock.module("pg", {
  namedExports: {
    Pool: class {
      async connect() {
        if (!activeClient) throw new Error("Recording client was not configured.");
        return activeClient;
      }

      async query(sql, params = []) {
        if (!activeClient) throw new Error("Recording client was not configured.");
        return activeClient.query(sql, params);
      }
    },
  },
});

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/kmodu_test";

const {
  assignCreatorsToManagementGroup,
  createCreatorManagementGroup,
  getCreatorManagementGroup,
  getManagedCreatorDetail,
  inviteAgencyGroupUser,
  listCreatorManagementGroups,
  listManagedCreators,
  removeCreatorsFromManagementGroup,
  revokeAgencyGroupUser,
  updateCreatorManagementGroup,
} = await import("../src/lib/creator-management.ts");

function creator(overrides = {}) {
  return {
    id: "creator-db-only",
    user_id: null,
    creator_key: "db-only-import",
    display_name: "DB Only Import",
    google_email: "db.only@example.com",
    approval_status: "approved",
    platform: "TikTok",
    market: "Malaysia",
    categories: ["Beauty"],
    onboarding_source: "admin",
    claim_state: "unclaimed",
    created_by_admin_id: "admin-text-id",
    profile_image_url: "/db-only.webp",
    specialty: "Beauty",
    bio: null,
    instagram_handle: "db.only",
    instagram_url: null,
    instagram_followers: 123,
    tiktok_handle: "dbonly",
    tiktok_url: null,
    tiktok_followers: 456,
    followers_verified_at: "2026-08-24T00:00:00.000Z",
    created_at: "2026-08-24T00:00:00.000Z",
    updated_at: "2026-08-24T00:00:00.000Z",
    management_group_id: "group-blue",
    management_group_name: "Blue Group",
    ...overrides,
  };
}

class RecordingClient {
  constructor({ groupStatus = "active", memberships = {}, missingCreatorIds = [], duplicateEmail = false, inviteExists = true } = {}) {
    this.groupStatus = groupStatus;
    this.memberships = memberships;
    this.missingCreatorIds = new Set(missingCreatorIds);
    this.duplicateEmail = duplicateEmail;
    this.inviteExists = inviteExists;
    this.statements = [];
  }

  async query(text, params = []) {
    this.statements.push({ text, params });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text)) return { rows: [], rowCount: 0 };

    if (text.includes("WHERE c.creator_key = $1 OR c.id = $1")) return { rows: [creator()] };
    if (text.startsWith("SELECT c.*, member.group_id")) return { rows: [creator()] };
    if (text.includes("FROM campaign_participations participation")) {
      return { rows: [{ campaign_id: "campaign-1", campaign_title: "Beauty Launch", participation_status: "completed", expected_reward: "RM 420", settlement_status: "paid", revenue: "1250.50", currency: "MYR" }] };
    }
    if (text.includes("FROM creator_management_groups group_row") && text.includes("WHERE group_row.id = $1")) {
      return { rows: [{ id: "group-blue", name: "Blue Group", agency_name: "Blue Agency", status: "active", creator_count: "1", follower_total: "579", notes: "Priority creators" }] };
    }
    if (text.includes("FROM creator_management_groups group_row")) {
      return { rows: [{ id: "group-blue", name: "Blue Group", agency_name: "Blue Agency", status: "active", creator_count: "1", follower_total: "579" }] };
    }
    if (text.includes("FROM creator_management_group_users") && text.includes("ORDER BY invited_at")) {
      return { rows: [{ email: "agency@example.com", status: "active" }] };
    }
    if (text.includes("FROM creator_management_audit_logs") && text.includes("ORDER BY created_at")) {
      return { rows: [{ action: "creator_assigned", created_at: "2026-08-24T00:00:00.000Z", metadata: { creatorAccountId: "creator-db-only" } }] };
    }
    if (text.startsWith("SELECT c.*, membership.group_id")) return { rows: [creator()] };

    if (text.includes("FROM users") && text.includes("FOR UPDATE")) return { rows: [{ id: params[0] }], rowCount: 1 };
    if (text.includes("INSERT INTO creator_management_groups")) return { rows: [{ id: "group-new" }], rowCount: 1 };
    if (text.includes("FROM creator_management_groups") && text.includes("FOR UPDATE")) {
      return { rows: [{ id: params[0], name: "Blue Group", agency_name: null, notes: null, status: this.groupStatus }], rowCount: 1 };
    }
    if (text.includes("FROM creator_accounts") && text.includes("FOR UPDATE")) {
      const ids = params[0].filter((id) => !this.missingCreatorIds.has(id));
      return { rows: ids.map((id) => ({ id })), rowCount: ids.length };
    }
    if (text.includes("FROM creator_management_group_members") && text.includes("creator_account_id = ANY") && text.includes("FOR UPDATE")) {
      const rows = params[0].flatMap((id) => this.memberships[id] ? [{ creator_account_id: id, group_id: this.memberships[id] }] : []);
      return { rows, rowCount: rows.length };
    }
    if (text.includes("DELETE FROM creator_management_group_members")) {
      const ids = text.includes("group_id = $1") ? params[1] : params[0];
      const groupId = text.includes("group_id = $1") ? params[0] : null;
      const rows = ids.flatMap((id) => this.memberships[id] && (!groupId || this.memberships[id] === groupId)
        ? [{ creator_account_id: id, group_id: this.memberships[id] }]
        : []);
      return { rows, rowCount: rows.length };
    }
    if (text.includes("INSERT INTO creator_management_group_members")) return { rows: [], rowCount: params[0]?.length ?? 1 };
    if (text.includes("UPDATE creator_management_groups")) return { rows: [{ id: params[0] }], rowCount: 1 };
    if (text.includes("FROM creator_management_group_users") && text.includes("lower(invited_email)") && text.includes("FOR UPDATE")) {
      const rows = this.duplicateEmail || this.inviteExists ? [{ id: "invite-existing", invite_status: "active" }] : [];
      return { rows, rowCount: rows.length };
    }
    if (text.includes("INSERT INTO creator_management_group_users")) return { rows: [{ id: "invite-new" }], rowCount: 1 };
    if (text.includes("UPDATE creator_management_group_users") && text.includes("invite_status = 'revoked'")) {
      return { rows: this.inviteExists ? [{ id: "invite-existing", invite_status: "revoked" }] : [], rowCount: this.inviteExists ? 1 : 0 };
    }
    if (text.includes("INSERT INTO creator_management_audit_logs")) return { rows: [], rowCount: 1 };
    throw new Error(`Unexpected query: ${text}`);
  }

  release() {}
}

function audits(client) {
  return client.statements.filter(({ text }) => text.includes("INSERT INTO creator_management_audit_logs"));
}

function indexOf(client, pattern) {
  return client.statements.findIndex(({ text }) => text.includes(pattern));
}

test("lists only durable creator accounts and preserves text rewards in the detail read", async () => {
  const client = new RecordingClient();
  activeClient = client;

  const creators = await listManagedCreators({
    search: " DB.ONLY ",
    market: "malaysia",
    platform: "tiktok",
    groupId: "group-blue",
    onboardingSource: "admin",
    claimState: "unclaimed",
    approvalStatus: "approved",
  });
  const detail = await getManagedCreatorDetail(" db-only-import ");

  assert.deepEqual(creators.map(({ id }) => id), ["creator-db-only"]);
  assert.equal(creators[0].followerTotal, 579);
  assert.equal(creators[0].managementGroupName, "Blue Group");
  assert.equal(detail?.campaigns[0]?.expectedReward, "RM 420");
  assert.equal(detail?.settlement.expectedRewardTotal, 1250.5);
  assert.match(client.statements[0].text, /FROM creator_accounts c/);
  assert.match(client.statements[0].text, /lower\(c\.display_name\)/);
  assert.match(client.statements[0].text, /approval_status = \$9/);
});

test("reads management group summaries and detail from persisted relations", async () => {
  const client = new RecordingClient();
  activeClient = client;

  const groups = await listCreatorManagementGroups();
  const detail = await getCreatorManagementGroup(" group-blue ");

  assert.deepEqual(groups, [{ id: "group-blue", name: "Blue Group", agencyName: "Blue Agency", status: "active", creatorCount: 1, followerTotal: 579 }]);
  assert.equal(detail?.notes, "Priority creators");
  assert.equal(detail?.creators[0]?.id, "creator-db-only");
  assert.deepEqual(detail?.agencyUsers, [{ email: "agency@example.com", status: "active" }]);
  assert.deepEqual(detail?.auditEvents[0]?.metadata, { creatorAccountId: "creator-db-only" });
});

test("creates a group and assigns deduplicated text creator IDs in one audited transaction", async () => {
  const client = new RecordingClient();
  activeClient = client;

  const groupId = await createCreatorManagementGroup(" admin-text-id ", {
    name: "  New Group  ",
    agencyName: " Agency ",
    creatorAccountIds: ["creator-A", "creator-A", "legacy-text.2"],
  });

  assert.equal(groupId, "group-new");
  assert.equal(client.statements[0].text, "BEGIN");
  assert.ok(indexOf(client, "FROM users") < indexOf(client, "INSERT INTO creator_management_groups"));
  assert.ok(indexOf(client, "INSERT INTO creator_management_groups") < indexOf(client, "FROM creator_accounts"));
  assert.deepEqual(client.statements.find(({ text }) => text.includes("FROM creator_accounts"))?.params[0], ["creator-A", "legacy-text.2"]);
  assert.equal(client.statements.some(({ text }) => /uuid\[\]/i.test(text)), false);
  assert.deepEqual(audits(client).map(({ params }) => params[0]), ["admin-text-id", "admin-text-id", "admin-text-id"]);
  assert.equal(client.statements.at(-1).text, "COMMIT");
});

test("moves memberships by locking, deleting the old row, inserting the replacement, and auditing the move", async () => {
  const client = new RecordingClient({ memberships: { "creator-A": "group-old", "creator-B": "group-new" } });
  activeClient = client;

  const assigned = await assignCreatorsToManagementGroup("admin-text-id", "group-new", ["creator-A", "creator-A", "creator-B"]);

  assert.equal(assigned, 2);
  assert.equal(client.statements[0].text, "BEGIN");
  assert.ok(indexOf(client, "creator_accounts") < indexOf(client, "creator_management_group_members"));
  assert.ok(indexOf(client, "FOR UPDATE") < indexOf(client, "DELETE FROM creator_management_group_members"));
  assert.ok(indexOf(client, "DELETE FROM creator_management_group_members") < indexOf(client, "INSERT INTO creator_management_group_members"));
  assert.ok(audits(client).some(({ params }) => params.includes("creator_moved")));
  assert.equal(client.statements.at(-1).text, "COMMIT");
});

test("removes only selected members from the current group and records the removal", async () => {
  const client = new RecordingClient({ memberships: { "creator-A": "group-new", "creator-B": "group-old" } });
  activeClient = client;

  const removed = await removeCreatorsFromManagementGroup("admin-text-id", "group-new", ["creator-A", "creator-A", "creator-B"]);

  assert.equal(removed, 1);
  assert.deepEqual(client.statements.find(({ text }) => text.includes("DELETE FROM creator_management_group_members"))?.params, ["group-new", ["creator-A", "creator-B"]]);
  assert.ok(audits(client).some(({ params }) => params.includes("creator_removed")));
  assert.equal(client.statements.at(-1).text, "COMMIT");
});

test("rejects an inactive group before assignment writes and rolls back", async () => {
  const client = new RecordingClient({ groupStatus: "inactive" });
  activeClient = client;

  await assert.rejects(
    assignCreatorsToManagementGroup("admin-text-id", "group-inactive", ["creator-A"]),
    (error) => error.code === "GROUP_INACTIVE" && error.message === "비활성 관리 그룹에는 크리에이터를 배정할 수 없습니다.",
  );
  assert.equal(client.statements.some(({ text }) => text.includes("INSERT INTO creator_management_group_members")), false);
  assert.equal(client.statements.at(-1).text, "ROLLBACK");
});

test("rejects a missing persisted creator account and rolls back", async () => {
  const client = new RecordingClient({ missingCreatorIds: ["catalogue-only-id"] });
  activeClient = client;

  await assert.rejects(
    assignCreatorsToManagementGroup("admin-text-id", "group-new", ["catalogue-only-id"]),
    (error) => error.code === "CREATOR_NOT_FOUND" && error.message === "저장된 크리에이터 계정을 찾을 수 없습니다.",
  );
  assert.equal(client.statements.at(-1).text, "ROLLBACK");
});

test("updates groups and audits the actor", async () => {
  const client = new RecordingClient();
  activeClient = client;

  await updateCreatorManagementGroup("admin-text-id", "group-new", { name: " Renamed ", status: "inactive" });

  assert.ok(indexOf(client, "FROM creator_management_groups") < indexOf(client, "UPDATE creator_management_groups"));
  assert.deepEqual(audits(client).at(-1)?.params.slice(0, 2), ["admin-text-id", "group_updated"]);
  assert.equal(client.statements.at(-1).text, "COMMIT");
});

test("rejects duplicate agency email case-insensitively with a rollback", async () => {
  const client = new RecordingClient({ duplicateEmail: true });
  activeClient = client;

  await assert.rejects(
    inviteAgencyGroupUser("admin-text-id", "group-new", " Agency@Example.com "),
    (error) => error.code === "AGENCY_EMAIL_DUPLICATE" && error.message === "이미 초대된 대행사 이메일입니다.",
  );
  assert.deepEqual(client.statements.find(({ text }) => text.includes("lower(invited_email)"))?.params, ["group-new", "agency@example.com"]);
  assert.equal(client.statements.at(-1).text, "ROLLBACK");
});

test("invites and revokes agency users under locks with actor audit metadata", async () => {
  const inviteClient = new RecordingClient({ inviteExists: false });
  activeClient = inviteClient;
  await inviteAgencyGroupUser("admin-text-id", "group-new", " Agency@Example.com ");
  assert.deepEqual(audits(inviteClient).at(-1)?.params.slice(0, 2), ["admin-text-id", "agency_user_invited"]);
  assert.equal(inviteClient.statements.at(-1).text, "COMMIT");

  const revokeClient = new RecordingClient({ inviteExists: true });
  activeClient = revokeClient;
  await revokeAgencyGroupUser("admin-text-id", "group-new", " Agency@Example.com ");
  assert.ok(indexOf(revokeClient, "lower(invited_email)") < indexOf(revokeClient, "UPDATE creator_management_group_users"));
  assert.deepEqual(audits(revokeClient).at(-1)?.params.slice(0, 2), ["admin-text-id", "agency_user_revoked"]);
  assert.equal(revokeClient.statements.at(-1).text, "COMMIT");
});
