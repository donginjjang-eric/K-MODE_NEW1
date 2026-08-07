import { mock, test } from "node:test";
import assert from "node:assert/strict";

import type { AdminCampaignInput } from "../src/lib/types";

type QueryResult = { rows: Array<Record<string, unknown>> };

class TransactionClient {
  calls: string[] = [];
  eventParams: unknown[] | undefined;

  constructor(private readonly role = "admin", private readonly failEvent = false) {}

  async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
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
      return { rows: [{ id: "campaign-1" }] };
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

let activeClient: TransactionClient | undefined;

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

const { createAdminCampaign, transitionParticipationAsAdmin } = await import("../src/lib/creator-campaigns");

const validInput: AdminCampaignInput = {
  title: "Summer launch",
  category: "beauty",
  markets: ["KR"],
  platforms: ["Instagram"],
  brief: "Create one short-form campaign video.",
  reward_text: "₩300,000",
  application_deadline: "2026-09-01T00:00:00.000Z",
  content_deadline: "2026-09-15T00:00:00.000Z",
  slots: 3,
  image_urls: ["https://cdn.example.com/brief.png"],
};

test("rejects an admin campaign without its required campaign details", async () => {
  await assert.rejects(
    createAdminCampaign("admin-1", { ...validInput, title: "   " }),
    /title is required/i,
  );
});

test("rejects an admin campaign with invalid capacity, targeting, image URLs, or deadline order", async (t) => {
  const invalidInputs: Array<[string, AdminCampaignInput, RegExp]> = [
    ["slots", { ...validInput, slots: 0 }, /slots must be positive/i],
    ["markets", { ...validInput, markets: [] }, /market is required/i],
    ["platforms", { ...validInput, platforms: [] }, /platform is required/i],
    ["image URL", { ...validInput, image_urls: ["http://cdn.example.com/brief.png"] }, /HTTPS/i],
    ["deadlines", { ...validInput, application_deadline: validInput.content_deadline, content_deadline: validInput.application_deadline }, /application deadline.*content deadline/i],
  ];

  for (const [name, input, error] of invalidInputs) {
    await t.test(name, async () => {
      await assert.rejects(createAdminCampaign("admin-1", input), error);
    });
  }
});

test("transitions participation as an admin with locks, an event, and a committed transaction", async () => {
  const client = new TransactionClient();
  activeClient = client;

  const participation = await transitionParticipationAsAdmin("admin-1", "participation-1", "matched", "Approved by operations");

  assert.equal(participation.status, "matched");
  assert.deepEqual(client.calls, [
    "BEGIN",
    "admin lock",
    "participation lock",
    "campaign lock",
    "participation update",
    "event insert",
    "COMMIT",
    "release",
  ]);
  assert.deepEqual(client.eventParams, ["participation-1", "admin-1", "admin_status_changed", "applied", "matched", "Approved by operations"]);
});

test("rejects participation transitions from a non-admin and rolls back", async () => {
  const client = new TransactionClient("designer");
  activeClient = client;

  await assert.rejects(
    transitionParticipationAsAdmin("designer-1", "participation-1", "matched"),
    /Admin access is required/,
  );
  assert.deepEqual(client.calls, ["BEGIN", "admin lock", "ROLLBACK", "release"]);
});

test("rolls back a participation transition when event insertion fails", async () => {
  const client = new TransactionClient("admin", true);
  activeClient = client;

  await assert.rejects(
    transitionParticipationAsAdmin("admin-1", "participation-1", "matched"),
    /event insert failed/,
  );
  assert.deepEqual(client.calls, [
    "BEGIN",
    "admin lock",
    "participation lock",
    "campaign lock",
    "participation update",
    "event insert",
    "ROLLBACK",
    "release",
  ]);
});
