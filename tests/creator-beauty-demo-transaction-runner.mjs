import assert from "node:assert/strict";
import { mock, test } from "node:test";

function createState(overrides = {}) {
  return {
    users: new Map([["admin-1", { id: "admin-1", role: "admin" }]]),
    creators: new Map([["creator-1", { id: "creator-1", user_id: "admin-1", approval_status: "approved" }]]),
    campaigns: new Map(),
    participations: new Map(),
    events: new Map(),
    submissions: new Map(),
    performance: new Map(),
    ...overrides,
  };
}

function cloneState(state) {
  return structuredClone(state);
}

class TransactionClient {
  constructor(state, { failOn = null } = {}) {
    this.state = state;
    this.snapshot = null;
    this.calls = [];
    this.failOn = failOn;
  }

  async query(sql, params = []) {
    if (sql === "BEGIN") {
      this.snapshot = cloneState(this.state);
      this.calls.push("BEGIN");
      return { rows: [] };
    }
    if (sql === "COMMIT") {
      this.snapshot = null;
      this.calls.push("COMMIT");
      return { rows: [] };
    }
    if (sql === "ROLLBACK") {
      this.state.users = this.snapshot.users;
      this.state.creators = this.snapshot.creators;
      this.state.campaigns = this.snapshot.campaigns;
      this.state.participations = this.snapshot.participations;
      this.state.events = this.snapshot.events;
      this.state.submissions = this.snapshot.submissions;
      this.state.performance = this.snapshot.performance;
      this.calls.push("ROLLBACK");
      return { rows: [] };
    }
    if (sql.includes("FROM users WHERE id = $1")) {
      const user = this.state.users.get(params[0]);
      return { rows: user && user.role === "admin" ? [user] : [] };
    }
    if (sql.includes("FROM creator_accounts WHERE id = $1")) {
      const creator = this.state.creators.get(params[0]);
      return {
        rows: creator && creator.user_id === params[1] && creator.approval_status === "approved" ? [creator] : [],
      };
    }
    if (sql.includes("SELECT id, owner_id, title FROM campaigns WHERE id = ANY")) {
      const ids = params[0];
      return { rows: ids.map((id) => this.state.campaigns.get(id)).filter(Boolean) };
    }
    if (sql.includes("FROM campaign_participations WHERE campaign_id = ANY")) {
      const ids = new Set(params[0]);
      return { rows: [...this.state.participations.values()].filter((row) => ids.has(row.campaign_id)) };
    }
    if (sql.includes("FROM campaign_participations WHERE id = ANY")) {
      const ids = new Set(params[0]);
      return { rows: [...this.state.participations.values()].filter((row) => ids.has(row.id)) };
    }
    if (sql.includes("FROM campaign_events WHERE participation_id = ANY")) {
      const ids = new Set(params[0]);
      return { rows: [...this.state.events.values()].filter((row) => ids.has(row.participation_id)) };
    }
    if (sql.includes("FROM campaign_events WHERE id = ANY")) {
      const ids = new Set(params[0]);
      return { rows: [...this.state.events.values()].filter((row) => ids.has(row.id)) };
    }
    if (sql.includes("FROM content_submissions WHERE participation_id = ANY")) {
      const ids = new Set(params[0]);
      return { rows: [...this.state.submissions.values()].filter((row) => ids.has(row.participation_id)) };
    }
    if (sql.includes("FROM content_submissions WHERE id = ANY")) {
      const ids = new Set(params[0]);
      return { rows: [...this.state.submissions.values()].filter((row) => ids.has(row.id)) };
    }
    if (sql.includes("SELECT participation_id, views, likes, comments, orders, revenue, currency FROM campaign_performance")) {
      const ids = new Set(params[0]);
      return { rows: [...this.state.performance.values()].filter((row) => ids.has(row.participation_id)) };
    }
    if (sql.includes("DELETE FROM campaigns WHERE id = ANY")) {
      const ids = params[1];
      const deleted = [];
      for (const id of ids) {
        const campaign = this.state.campaigns.get(id);
        if (!campaign || campaign.owner_id !== params[0] || !campaign.title.startsWith("[DEMO]")) continue;
        this.state.campaigns.delete(id);
        deleted.push(id);
        for (const [participationId, participation] of this.state.participations) {
          if (participation.campaign_id === id) this.state.participations.delete(participationId);
        }
      }
      for (const [eventId, event] of this.state.events) {
        if (!this.state.participations.has(event.participation_id)) this.state.events.delete(eventId);
      }
      for (const [submissionId, submission] of this.state.submissions) {
        if (!this.state.participations.has(submission.participation_id)) this.state.submissions.delete(submissionId);
      }
      for (const participationId of this.state.performance.keys()) {
        if (!this.state.participations.has(participationId)) this.state.performance.delete(participationId);
      }
      return { rows: deleted.map((id) => ({ id })), rowCount: deleted.length };
    }
    if (this.failOn && sql.includes(this.failOn)) throw new Error(`${this.failOn} insert failed`);
    if (sql.includes("INSERT INTO campaigns")) {
      const [id, owner_id, title, category, markets, platforms, brief, reward_text, application_deadline, content_deadline, slots, status] = params;
      this.state.campaigns.set(id, { id, owner_id, title, category, markets: JSON.parse(markets), platforms: JSON.parse(platforms), brief, reward_text, application_deadline, content_deadline, slots, status });
      return { rows: [] };
    }
    if (sql.includes("INSERT INTO campaign_participations")) {
      const [id, campaign_id, creator_account_id, source, status, next_action, expected_reward, settlement_status] = params;
      this.state.participations.set(id, { id, campaign_id, creator_account_id, source, status, next_action, expected_reward, settlement_status });
      return { rows: [] };
    }
    if (sql.includes("INSERT INTO campaign_events")) {
      const [id, participation_id, actor_user_id, event_type, from_status, to_status, message] = params;
      this.state.events.set(id, { id, participation_id, actor_user_id, event_type, from_status, to_status, message });
      return { rows: [] };
    }
    if (sql.includes("INSERT INTO content_submissions")) {
      const [id, participation_id, version, content_url, caption_text, status, review_note, published_url, submitted_at, reviewed_at, published_at] = params;
      this.state.submissions.set(id, { id, participation_id, version, content_url, caption_text, status, review_note, published_url, submitted_at, reviewed_at, published_at });
      return { rows: [] };
    }
    if (sql.includes("INSERT INTO campaign_performance")) {
      const [participation_id, views, likes, comments, orders, revenue, currency] = params;
      this.state.performance.set(participation_id, { participation_id, views, likes, comments, orders, revenue, currency });
      return { rows: [] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  }

  release() {
    this.calls.push("release");
  }
}

const clients = [];
await mock.module("pg", {
  namedExports: {
    Pool: class {
      async connect() {
        const client = clients.shift();
        if (!client) throw new Error("No transaction client configured.");
        return client;
      }
    },
  },
});

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/kmodu_test";

const { resetCreatorBeautyDemo, seedCreatorBeautyDemo } = await import("../src/lib/creator-demo.ts");

test("repeated seed is idempotent and preserves the complete demo graph", async () => {
  const state = createState();
  const first = new TransactionClient(state);
  clients.push(first);
  assert.deepEqual(await seedCreatorBeautyDemo("admin-1", "creator-1"), { campaigns: 4, participations: 3, submissions: 2, events: 10, performance: 1 });

  const second = new TransactionClient(state);
  clients.push(second);
  assert.deepEqual(await seedCreatorBeautyDemo("admin-1", "creator-1"), { campaigns: 4, participations: 3, submissions: 2, events: 10, performance: 1 });
  assert.equal(state.campaigns.size, 4);
  assert.equal(state.participations.size, 3);
  assert.equal(state.events.size, 10);
  assert.equal(state.submissions.size, 2);
  assert.equal(state.performance.size, 1);
  assert.equal(second.calls.at(-2), "COMMIT");
});

test("seed rejects a fixed child ID collision without changing the existing record", async () => {
  const realParticipation = { id: "demo-beauty-liptint-completed-participation", campaign_id: "real-campaign", creator_account_id: "creator-1", source: "application", status: "completed", next_action: "Real data", expected_reward: "Real", settlement_status: "paid" };
  const state = createState({
    campaigns: new Map([["demo-beauty-liptint-completed", { id: "demo-beauty-liptint-completed", owner_id: "admin-1", title: "[DEMO] Existing campaign" }]]),
    participations: new Map([[realParticipation.id, realParticipation]]),
  });
  const client = new TransactionClient(state);
  clients.push(client);

  await assert.rejects(seedCreatorBeautyDemo("admin-1", "creator-1"), /Demo participation ID collision/);
  assert.deepEqual(state.participations.get(realParticipation.id), realParticipation);
  assert.equal(state.campaigns.size, 1);
  assert.equal(client.calls.includes("ROLLBACK"), true);
});

test("reset rejects a fixed child ID collision and does not cascade into real data", async () => {
  const realParticipation = { id: "demo-beauty-liptint-completed-participation", campaign_id: "demo-beauty-liptint-completed", creator_account_id: "creator-1", source: "application", status: "completed", next_action: "Real data", expected_reward: "Real", settlement_status: "paid" };
  const state = createState({
    campaigns: new Map([["demo-beauty-liptint-completed", { id: "demo-beauty-liptint-completed", owner_id: "admin-1", title: "[DEMO] Campaign with real child" }]]),
    participations: new Map([[realParticipation.id, realParticipation]]),
  });
  const client = new TransactionClient(state);
  clients.push(client);

  await assert.rejects(resetCreatorBeautyDemo("admin-1", "creator-1"), /Demo participation ID collision/);
  assert.equal(state.campaigns.has("demo-beauty-liptint-completed"), true);
  assert.equal(state.participations.has(realParticipation.id), true);
  assert.equal(client.calls.includes("ROLLBACK"), true);
});

test("seed rolls back every demo write when a later child write fails", async () => {
  const state = createState();
  const client = new TransactionClient(state, { failOn: "content_submissions" });
  clients.push(client);

  await assert.rejects(seedCreatorBeautyDemo("admin-1", "creator-1"), /content_submissions insert failed/);
  assert.equal(state.campaigns.size, 0);
  assert.equal(state.participations.size, 0);
  assert.equal(state.events.size, 0);
  assert.equal(client.calls.includes("ROLLBACK"), true);
});

test("seed rejects a non-admin identity before any demo write", async () => {
  const state = createState({ users: new Map([["designer-1", { id: "designer-1", role: "designer" }]]) });
  const client = new TransactionClient(state);
  clients.push(client);

  await assert.rejects(seedCreatorBeautyDemo("designer-1", "creator-1"), /Admin access is required/);
  assert.equal(state.campaigns.size, 0);
  assert.equal(client.calls.includes("ROLLBACK"), true);
});
