import assert from "node:assert/strict";
import { mock, test } from "node:test";

let activeClient;
await mock.module("pg", {
  namedExports: {
    Pool: class {
      async connect() { return activeClient; }
      async query(sql, params = []) { return activeClient.query(sql, params); }
    },
  },
});
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/kmodu_test";

const { ensureMasterPartnerWorkspace } = await import("../src/lib/db.ts");

class WorkspaceClient {
  constructor(existing = null) { this.calls = []; this.sequence = 0; this.existing = existing; }
  release() {}
  async query(sql, params = []) {
    this.calls.push({ sql: String(sql), params });
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return { rows: [] };
    if (/UPDATE user_workspace_memberships requested/.test(sql)) return { rows: [] };
    if (/JOIN designers/.test(sql) && /memberships\.resource_id = \$3/.test(sql)) {
      return { rows: [{ id: `membership-${this.sequence}`, user_id: params[0], workspace_type: params[1], resource_id: params[2], status: "active", designer_user_id: params[0], brand_category: params[3] }] };
    }
    if (/FROM user_workspace_memberships memberships/.test(sql)) return { rows: this.existing ? [this.existing] : [] };
    if (/SELECT designers\.\*/.test(sql)) return { rows: [] };
    if (/INSERT INTO designers/.test(sql)) {
      this.sequence += 1;
      return { rows: [{ id: `designer-${this.sequence}`, user_id: params[0], brand_category: params[4], approval_status: "approved" }] };
    }
    if (/INSERT INTO user_workspace_memberships/.test(sql)) {
      return { rows: [{ id: `membership-${this.sequence}`, user_id: params[0], workspace_type: params[1], resource_id: params[2], status: "active" }] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("master provisioning creates distinct owned resources for fashion and beauty in transactions", async () => {
  activeClient = new WorkspaceClient();
  const fashion = await ensureMasterPartnerWorkspace({ userId: "master-1", email: "master@example.com", workspaceType: "fashion_partner", allowMasterProvision: true });
  const beauty = await ensureMasterPartnerWorkspace({ userId: "master-1", email: "master@example.com", workspaceType: "beauty_partner", allowMasterProvision: true });

  assert.notEqual(fashion.resource_id, beauty.resource_id);
  assert.equal(fashion.brand_category, "K-패션");
  assert.equal(beauty.brand_category, "K-뷰티");
  assert.equal(activeClient.calls.filter(({ sql }) => sql === "BEGIN").length, 2);
  assert.equal(activeClient.calls.filter(({ sql }) => sql === "COMMIT").length, 2);
  assert.ok(activeClient.calls.some(({ sql }) => /designers\.user_id = memberships\.user_id/.test(sql)));
});

test("ordinary users cannot invoke master workspace provisioning", async () => {
  activeClient = new WorkspaceClient();
  await assert.rejects(
    ensureMasterPartnerWorkspace({ userId: "user-1", email: "user@example.com", workspaceType: "beauty_partner", allowMasterProvision: false }),
    /Master workspace provisioning is not allowed/,
  );
  assert.equal(activeClient.calls.length, 0);
});

test("master provisioning reuses an existing owned category workspace idempotently", async () => {
  const existing = {
    id: "membership-existing", user_id: "master-1", workspace_type: "beauty_partner",
    resource_id: "designer-beauty-existing", status: "active", brand_category: "K-뷰티", designer_user_id: "master-1",
  };
  activeClient = new WorkspaceClient(existing);
  const result = await ensureMasterPartnerWorkspace({ userId: "master-1", email: "master@example.com", workspaceType: "beauty_partner", allowMasterProvision: true });
  assert.equal(result.resource_id, "designer-beauty-existing");
  assert.equal(activeClient.calls.filter(({ sql }) => /INSERT INTO designers/.test(sql)).length, 0);
  assert.equal(activeClient.calls.filter(({ sql }) => /INSERT INTO user_workspace_memberships/.test(sql)).length, 0);
});
