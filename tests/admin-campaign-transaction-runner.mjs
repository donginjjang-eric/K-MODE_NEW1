import assert from "node:assert/strict";
import { mock, test } from "node:test";

class TransactionClient {
  calls = [];
  eventParams;

  constructor(role = "admin", failEvent = false) {
    this.role = role;
    this.failEvent = failEvent;
  }

  async query(sql, params = []) {
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
      this.calls.push(sql);
      return { rows: [] };
    }
    if (sql.includes("FROM users WHERE id")) {
      this.calls.push("admin lock");
      return { rows: [{ id: "admin-1", role: this.role }] };
    }
    if (sql.includes("FROM campaign_participations WHERE id")) {
      this.calls.push("participation lock");
      return { rows: [{ id: "participation-1", campaign_id: "campaign-1", status: "applied" }] };
    }
    if (sql.includes("FROM campaigns WHERE id")) {
      this.calls.push("campaign lock");
      return { rows: [{ id: "campaign-1", slots: 2 }] };
    }
    if (sql.includes("COUNT(*)") && sql.includes("campaign_participations")) {
      this.calls.push("capacity count");
      return { rows: [{ count: "0" }] };
    }
    if (sql.includes("UPDATE campaign_participations")) {
      this.calls.push("participation update");
      return { rows: [{ id: "participation-1", campaign_id: "campaign-1", status: "matched" }] };
    }
    if (sql.includes("INSERT INTO campaign_events")) {
      this.calls.push("event insert");
      this.eventParams = params;
      if (this.failEvent) throw new Error("event insert failed");
      return { rows: [] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  }

  release() {
    this.calls.push("release");
  }
}

let activeClient;

await mock.module("pg", {
  namedExports: {
    Pool: class {
      async connect() {
        if (!activeClient) throw new Error("Test transaction client was not configured.");
        return activeClient;
      }
    },
  },
});

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/kmodu_test";

const { transitionParticipationAsAdmin } = await import("../src/lib/creator-campaigns.ts");

test("commits a locked admin participation transition with an event", async () => {
  const client = new TransactionClient();
  activeClient = client;

  const participation = await transitionParticipationAsAdmin("admin-1", "participation-1", "approve", "Approved by operations");

  assert.equal(participation.status, "matched");
  assert.deepEqual(client.calls, ["BEGIN", "admin lock", "participation lock", "campaign lock", "capacity count", "participation update", "event insert", "COMMIT", "release"]);
  assert.deepEqual(client.eventParams, ["participation-1", "admin-1", "admin_status_changed", "applied", "matched", "Approved by operations"]);
});

test("rolls back when the acting user is not an admin", async () => {
  const client = new TransactionClient("designer");
  activeClient = client;

  await assert.rejects(transitionParticipationAsAdmin("designer-1", "participation-1", "approve"), /Admin access is required/);
  assert.deepEqual(client.calls, ["BEGIN", "admin lock", "ROLLBACK", "release"]);
});

test("rolls back when campaign event insertion fails", async () => {
  const client = new TransactionClient("admin", true);
  activeClient = client;

  await assert.rejects(transitionParticipationAsAdmin("admin-1", "participation-1", "approve"), /event insert failed/);
  assert.deepEqual(client.calls, ["BEGIN", "admin lock", "participation lock", "campaign lock", "capacity count", "participation update", "event insert", "ROLLBACK", "release"]);
});
