import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { readFile } from "node:fs/promises";

let activeClient;
let sessionToken;

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

await mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({ get: () => sessionToken ? { value: sessionToken } : undefined }),
  },
});

await mock.module("next/navigation", {
  namedExports: {
    redirect: (path) => {
      throw new Error(`redirect:${path}`);
    },
  },
});

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/kmodu_test";

const { createSessionToken, loginEntryUrl, requireAgencyUser } = await import("../src/lib/auth.ts");
const {
  activateAgencyInvitationsForLogin,
  hasActiveAgencyGroupRelationship,
  normalizeEmail,
} = await import("../src/lib/creator-management.ts");
const { linkCreatorAccountToUser } = await import("../src/lib/db.ts");

class RecordingClient {
  constructor({ role = "designer", invitations = [], activeRelationship = false, creator = null } = {}) {
    this.role = role;
    this.invitations = invitations;
    this.activeRelationship = activeRelationship;
    this.creator = creator;
    this.statements = [];
  }

  async query(text, params = []) {
    this.statements.push({ text, params });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text)) return { rows: [], rowCount: 0 };
    if (text.includes("FROM users") && text.includes("FOR UPDATE")) {
      return { rows: [{ id: params[0], role: this.role }], rowCount: 1 };
    }
    if (text.includes("FROM creator_management_group_users") && text.includes("FOR UPDATE")) {
      return { rows: this.invitations, rowCount: this.invitations.length };
    }
    if (text.includes("UPDATE creator_management_group_users")) {
      const eligible = this.invitations.filter(({ invite_status }) => invite_status === "invited" || invite_status === "active");
      this.activeRelationship ||= eligible.length > 0;
      return { rows: eligible.map(({ id, group_id }) => ({ id, group_id })), rowCount: eligible.length };
    }
    if (text.includes("SELECT EXISTS") && text.includes("creator_management_group_users")) {
      return { rows: [{ has_access: this.activeRelationship }], rowCount: 1 };
    }
    if (text.includes("UPDATE users") && text.includes("role = 'agency'")) {
      this.role = "agency";
      return { rows: [{ id: params[0], role: this.role }], rowCount: 1 };
    }
    if (text.includes("FROM creator_accounts") && text.includes("FOR UPDATE")) {
      return { rows: this.creator ? [this.creator] : [], rowCount: this.creator ? 1 : 0 };
    }
    if (text.includes("UPDATE creator_accounts")) {
      return { rows: [{ ...this.creator, user_id: params[0], claim_state: "claimed" }], rowCount: 1 };
    }
    if (text.includes("UPDATE users") && text.includes("role = $2")) {
      this.role = params[1];
      return { rows: [{ id: params[0], email: "creator@example.com", role: this.role }], rowCount: 1 };
    }
    if (text.includes("INSERT INTO creator_management_audit_logs")) {
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`Unexpected query: ${text}`);
  }

  release() {}
}

test("agency dashboard entry and email matching are canonical", () => {
  assert.equal(loginEntryUrl({ role: "agency" }), "/dashboard/agency");
  assert.equal(loginEntryUrl({ role: "admin" }), "/dashboard/admin");
  assert.equal(loginEntryUrl({ role: "creator" }), "/dashboard/creator");
  assert.equal(loginEntryUrl({ role: "designer" }), "/dashboard/designer/brand");
  assert.equal(normalizeEmail(" Agency@Example.com "), "agency@example.com");
});

test("login activates invited relationships case-insensitively and promotes only an eligible designer", async () => {
  const client = new RecordingClient({
    role: "designer",
    invitations: [{ id: "invite-1", group_id: "group-1", invite_status: "invited", user_id: null }],
  });
  activeClient = client;

  const result = await activateAgencyInvitationsForLogin("user-1", " Agency@Example.com ");

  assert.deepEqual(result, { activatedCount: 1, hasActiveGroup: true, role: "agency" });
  const invitationRead = client.statements.find(({ text }) => text.includes("FROM creator_management_group_users") && text.includes("FOR UPDATE"));
  assert.deepEqual(invitationRead.params, ["user-1", "agency@example.com"]);
  assert.match(invitationRead.text, /invite_status IN \('invited', 'active'\)/);
  assert.match(invitationRead.text, /lower\(group_user\.invited_email\) = \$2/);
  assert.match(invitationRead.text, /group_row\.status = 'active'/);
  const activation = client.statements.find(({ text }) => text.includes("UPDATE creator_management_group_users"));
  assert.match(activation.text, /invite_status IN \('invited', 'active'\)/);
  assert.match(activation.text, /activated_at = COALESCE\(activated_at, now\(\)\)/);
  assert.equal(client.statements.at(-1).text, "COMMIT");
});

test("revoked invitations cannot reactivate and admin or creator roles are never demoted", async () => {
  for (const role of ["admin", "creator"]) {
    const client = new RecordingClient({
      role,
      invitations: [{ id: "invite-revoked", group_id: "group-1", invite_status: "revoked", user_id: null }],
    });
    activeClient = client;

    const result = await activateAgencyInvitationsForLogin("user-1", "agency@example.com");

    assert.equal(result.role, role);
    assert.equal(result.activatedCount, 0);
    assert.equal(client.statements.some(({ text }) => text.includes("role = 'agency'")), false);
  }
});

test("agency data access requires an active relationship and an active group", async () => {
  const client = new RecordingClient({ activeRelationship: true });
  activeClient = client;
  assert.equal(await hasActiveAgencyGroupRelationship("user-1"), true);
  const accessSql = client.statements.find(({ text }) => text.includes("SELECT EXISTS"));
  assert.match(accessSql.text, /invite_status = 'active'/);
  assert.match(accessSql.text, /group_row\.status = 'active'/);
});

test("agency role without an active group relationship is denied at the authentication boundary", async () => {
  sessionToken = createSessionToken({ id: "agency-user", email: "agency@example.com", role: "agency" });
  activeClient = new RecordingClient({ activeRelationship: false });
  await assert.rejects(requireAgencyUser(), /redirect:\/login\?error=agency_group_required/);

  activeClient = new RecordingClient({ activeRelationship: true });
  const user = await requireAgencyUser();
  assert.equal(user.id, "agency-user");
  sessionToken = undefined;
});

test("creator claim links, marks claimed, promotes, and writes its audit in one transaction", async () => {
  const client = new RecordingClient({
    role: "designer",
    creator: {
      id: "creator-1",
      user_id: null,
      google_email: "creator@example.com",
      approval_status: "approved",
      claim_state: "unclaimed",
    },
  });
  activeClient = client;

  const claimed = await linkCreatorAccountToUser("creator-1", "user-1", " Creator@Example.com ");

  assert.equal(claimed?.claim_state, "claimed");
  assert.equal(client.statements[0].text, "BEGIN");
  const creatorRead = client.statements.find(({ text }) => text.includes("FROM creator_accounts") && text.includes("FOR UPDATE"));
  assert.deepEqual(creatorRead.params, ["creator-1", "user-1", "creator@example.com"]);
  assert.match(client.statements.find(({ text }) => text.includes("UPDATE creator_accounts")).text, /claim_state = 'claimed'/);
  const audit = client.statements.find(({ text }) => text.includes("INSERT INTO creator_management_audit_logs"));
  assert.deepEqual(audit.params.slice(0, 4), ["user-1", "creator_claimed", null, "creator-1"]);
  assert.equal(client.statements.at(-1).text, "COMMIT");
});

test("Google callback keeps admin, creator claim, agency invitation, and designer priority in that order", async () => {
  const callback = await readFile(new URL("../src/app/api/auth/google/callback/route.ts", import.meta.url), "utf8");
  const adminIndex = callback.indexOf('user.role === "admin"');
  const creatorIndex = callback.indexOf("getCreatorAccountByEmail(email)");
  const agencyIndex = callback.indexOf("await activateAgencyInvitationsForLogin");
  const designerIndex = callback.indexOf("designer?.approval_status");

  assert.ok(adminIndex >= 0 && adminIndex < creatorIndex, "admin must be resolved before creator claims");
  assert.ok(creatorIndex < agencyIndex, "creator claims must be resolved before agency invitations");
  assert.ok(agencyIndex < designerIndex, "agency invitations must be resolved before designer fallback");
  assert.match(callback, /dest \|\| "\/dashboard\/agency"/);
});
