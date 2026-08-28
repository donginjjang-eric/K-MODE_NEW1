import assert from "node:assert/strict";
import test from "node:test";

import { grantBeautyWorkspace } from "../scripts/grant-beauty-workspace.mjs";

class MemoryClient {
  constructor({ users = [], creators = [], designers = [], memberships = [] } = {}) {
    this.users = structuredClone(users);
    this.creators = structuredClone(creators);
    this.designers = structuredClone(designers);
    this.memberships = structuredClone(memberships);
    this.events = [];
    this.nextDesigner = 1;
  }

  async query(text, params = []) {
    const sql = String(text);
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) {
      this.events.push(sql);
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes("FROM users") && sql.includes("FOR UPDATE")) {
      const rows = this.users.filter((row) => row.email.toLowerCase() === params[0]);
      return { rows, rowCount: rows.length };
    }
    if (sql.includes("FROM creator_accounts") && sql.includes("FOR UPDATE")) {
      const rows = this.creators.filter((row) => row.user_id === params[0] || row.google_email.toLowerCase() === params[1]);
      return { rows, rowCount: rows.length };
    }
    if (sql.includes("FROM designers") && sql.includes("lower(contact_email)") && sql.includes("user_id <>")) {
      const rows = this.designers.filter((row) => row.contact_email.toLowerCase() === params[0] && row.user_id !== params[1]);
      return { rows, rowCount: rows.length };
    }
    if (sql.includes("FROM designers") && sql.includes("brand_category") && sql.includes("FOR UPDATE")) {
      const rows = this.designers.filter((row) => row.user_id === params[0] && ["k-뷰티", "뷰티", "k-beauty", "beauty"].includes(row.brand_category.toLowerCase()));
      return { rows, rowCount: rows.length };
    }
    if (sql.includes("INSERT INTO designers")) {
      const existing = this.designers.find((row) => row.id === params[0]);
      if (existing) {
        Object.assign(existing, { brand_name: params[2], contact_email: params[3], approval_status: "approved", brand_category: "K-뷰티" });
        return { rows: [existing], rowCount: 1 };
      }
      const row = { id: `designer-${this.nextDesigner++}`, user_id: params[1], brand_name: params[2], contact_email: params[3], brand_category: "K-뷰티", approval_status: "approved" };
      this.designers.push(row);
      return { rows: [row], rowCount: 1 };
    }
    if (sql.includes("FROM user_workspace_memberships") && sql.includes("FOR UPDATE")) {
      const rows = this.memberships.filter((row) => row.user_id === params[0] && row.workspace_type === "beauty_partner");
      return { rows, rowCount: rows.length };
    }
    if (sql.includes("INSERT INTO user_workspace_memberships")) {
      let row = this.memberships.find((item) => item.user_id === params[0] && item.workspace_type === "beauty_partner" && item.resource_id === params[1]);
      if (row) Object.assign(row, { status: "active" });
      else {
        row = { id: `membership-${this.memberships.length + 1}`, user_id: params[0], workspace_type: "beauty_partner", resource_id: params[1], status: "active" };
        this.memberships.push(row);
      }
      return { rows: [row], rowCount: 1 };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

const base = {
  users: [{ id: "user-1", email: "studioooat@gmail.com" }],
  creators: [{ id: "creator-1", user_id: "user-1", google_email: "studioooat@gmail.com", approval_status: "approved" }],
};

test("grants an active beauty workspace while preserving the existing creator link", async () => {
  const client = new MemoryClient(base);
  const before = structuredClone(client.creators);

  const result = await grantBeautyWorkspace(client, { email: " studioooat@gmail.com ", brandName: "Studio Oat Beauty" });

  assert.equal(result.creatorId, "creator-1");
  assert.equal(result.workspaceType, "beauty_partner");
  assert.equal(result.status, "active");
  assert.deepEqual(client.creators, before);
  assert.equal(client.designers[0].brand_category, "K-뷰티");
  assert.equal(client.designers[0].approval_status, "approved");
  assert.deepEqual(client.events, ["BEGIN", "COMMIT"]);
});

test("is idempotent and reactivates the same beauty membership without duplicates", async () => {
  const client = new MemoryClient(base);
  const first = await grantBeautyWorkspace(client, { email: "studioooat@gmail.com", brandName: "Studio Oat Beauty" });
  client.memberships[0].status = "disabled";
  const second = await grantBeautyWorkspace(client, { email: "studioooat@gmail.com", brandName: "Studio Oat Beauty" });

  assert.equal(second.designerId, first.designerId);
  assert.equal(client.designers.length, 1);
  assert.equal(client.memberships.length, 1);
  assert.equal(client.memberships[0].status, "active");
});

test("rejects malformed input before starting a transaction", async () => {
  const client = new MemoryClient(base);
  await assert.rejects(grantBeautyWorkspace(client, { email: "not-an-email", brandName: "Beauty" }), /올바른 이메일/);
  await assert.rejects(grantBeautyWorkspace(client, { email: "studioooat@gmail.com", brandName: " " }), /브랜드명/);
  assert.deepEqual(client.events, []);
});

test("fails safely when creator or beauty workspace records are duplicated", async () => {
  const duplicateCreators = new MemoryClient({
    ...base,
    creators: [...base.creators, { id: "creator-2", user_id: null, google_email: "studioooat@gmail.com", approval_status: "approved" }],
  });
  await assert.rejects(grantBeautyWorkspace(duplicateCreators, { email: "studioooat@gmail.com", brandName: "Beauty" }), /creator.*중복/i);
  assert.equal(duplicateCreators.events.at(-1), "ROLLBACK");

  const duplicateMemberships = new MemoryClient({
    ...base,
    designers: [{ id: "beauty-1", user_id: "user-1", brand_name: "Beauty", contact_email: "studioooat@gmail.com", brand_category: "K-뷰티", approval_status: "approved" }],
    memberships: [
      { id: "m-1", user_id: "user-1", workspace_type: "beauty_partner", resource_id: "beauty-1", status: "active" },
      { id: "m-2", user_id: "user-1", workspace_type: "beauty_partner", resource_id: "beauty-2", status: "active" },
    ],
  });
  await assert.rejects(grantBeautyWorkspace(duplicateMemberships, { email: "studioooat@gmail.com", brandName: "Beauty" }), /membership.*중복/i);
  assert.equal(duplicateMemberships.events.at(-1), "ROLLBACK");
});

test("refuses to reuse a designer owned by another user", async () => {
  const client = new MemoryClient({
    ...base,
    designers: [{ id: "foreign", user_id: "user-2", brand_name: "Foreign", contact_email: "studioooat@gmail.com", brand_category: "K-뷰티", approval_status: "approved" }],
  });
  await assert.rejects(grantBeautyWorkspace(client, { email: "studioooat@gmail.com", brandName: "Beauty" }), /다른 사용자/);
  assert.equal(client.designers.length, 1);
  assert.equal(client.events.at(-1), "ROLLBACK");
});
