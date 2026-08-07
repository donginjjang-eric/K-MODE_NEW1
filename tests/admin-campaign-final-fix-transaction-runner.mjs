import assert from "node:assert/strict";
import { mock, test } from "node:test";

const capacityStatuses = ["matched", "shipping", "creating", "review", "published", "settlement"];

function campaign(status = "recruiting", slots = 2) {
  return {
    id: "campaign-1",
    owner_type: "admin",
    owner_id: "admin-1",
    title: "Campaign",
    category: "beauty",
    markets: ["KR"],
    platforms: ["Instagram"],
    brief: "Brief",
    reward_text: "Reward",
    application_deadline: "2026-09-01T00:00:00.000Z",
    content_deadline: "2026-09-15T00:00:00.000Z",
    slots,
    image_urls: [],
    status,
  };
}

class TransactionClient {
  calls = [];
  countParams;
  updateParams;

  constructor({ participationStatus = "applied", campaignStatus = "recruiting", slots = 2, occupied = 0 } = {}) {
    this.participationStatus = participationStatus;
    this.campaignStatus = campaignStatus;
    this.slots = slots;
    this.occupied = occupied;
  }

  async query(sql, params = []) {
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) {
      this.calls.push(sql);
      return { rows: [] };
    }
    if (sql.includes("FROM users WHERE id")) {
      this.calls.push("admin lock");
      return { rows: [{ id: "admin-1", role: "admin" }] };
    }
    if (sql.includes("FROM creator_accounts WHERE id")) {
      this.calls.push("creator lock");
      return { rows: [{ id: "creator-1", approval_status: "approved", user_id: "creator-user-1" }] };
    }
    if (sql.includes("FROM campaign_participations WHERE id")) {
      this.calls.push("participation lock");
      return { rows: [{ id: "participation-1", campaign_id: "campaign-1", creator_account_id: "creator-1", status: this.participationStatus }] };
    }
    if (sql.includes("campaign_id = $1 AND creator_account_id = $2")) {
      this.calls.push("creator participation lock");
      return { rows: this.participationStatus ? [{ id: "participation-1", campaign_id: "campaign-1", creator_account_id: "creator-1", status: this.participationStatus }] : [] };
    }
    if (sql.includes("FROM campaigns WHERE id")) {
      this.calls.push("campaign lock");
      return { rows: [campaign(this.campaignStatus, this.slots)] };
    }
    if (sql.includes("COUNT(*)") && sql.includes("campaign_participations")) {
      this.calls.push("capacity count");
      this.countParams = params;
      return { rows: [{ count: String(this.occupied) }] };
    }
    if (sql.includes("UPDATE campaign_participations")) {
      this.calls.push("participation update");
      this.updateParams = params;
      const status = params[1] === "matched" || params[1] === "cancelled" || capacityStatuses.includes(params[1]) ? params[1] : params[2];
      return { rows: [{ id: "participation-1", campaign_id: "campaign-1", creator_account_id: "creator-1", status }] };
    }
    if (sql.includes("INSERT INTO campaign_participations")) {
      this.calls.push("invitation insert");
      return { rows: [{ id: "participation-2", campaign_id: "campaign-1", creator_account_id: "creator-1", status: "invited" }] };
    }
    if (sql.includes("UPDATE campaigns")) {
      this.calls.push("campaign update");
      this.updateParams = params;
      return { rows: [{ ...campaign(this.campaignStatus, Number(params[9])), slots: Number(params[9]) }] };
    }
    if (sql.includes("INSERT INTO campaign_events")) {
      this.calls.push("event insert");
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

const {
  applyToCampaign,
  createCampaignInvitation,
  respondToInvitation,
  transitionParticipationAsAdmin,
  updateAdminCampaign,
} = await import("../src/lib/creator-campaigns.ts");

test("admin approval maps to matched and checks locked lifecycle capacity", async () => {
  const client = new TransactionClient({ participationStatus: "applied", occupied: 1, slots: 2 });
  activeClient = client;

  const result = await transitionParticipationAsAdmin("admin-1", "participation-1", "approve", "Approved");

  assert.equal(result.status, "matched");
  assert.deepEqual(client.countParams, ["campaign-1", capacityStatuses]);
  assert.ok(client.calls.indexOf("campaign lock") < client.calls.indexOf("capacity count"));
  assert.ok(client.calls.indexOf("capacity count") < client.calls.indexOf("participation update"));
});

test("admin approval fails without mutation when locked lifecycle capacity is full", async () => {
  const client = new TransactionClient({ participationStatus: "applied", occupied: 2, slots: 2 });
  activeClient = client;

  await assert.rejects(
    transitionParticipationAsAdmin("admin-1", "participation-1", "approve"),
    /capacity/i,
  );
  assert.equal(client.calls.includes("participation update"), false);
});

test("admins cannot accept creator invitations", async () => {
  const client = new TransactionClient({ participationStatus: "invited" });
  activeClient = client;

  await assert.rejects(
    transitionParticipationAsAdmin("admin-1", "participation-1", "approve"),
    /creator must accept invitations/i,
  );
  assert.equal(client.calls.includes("participation update"), false);
});

test("semantic reject and cancel actions map to cancelled", async () => {
  for (const [participationStatus, action] of [["applied", "reject"], ["invited", "cancel"]]) {
    const client = new TransactionClient({ participationStatus });
    activeClient = client;

    const result = await transitionParticipationAsAdmin("admin-1", "participation-1", action);
    assert.equal(result.status, "cancelled");
    assert.equal(client.calls.includes("capacity count"), false);
  }
});

test("slot reduction is rejected below locked lifecycle occupancy", async () => {
  const client = new TransactionClient({ campaignStatus: "recruiting", slots: 4, occupied: 3 });
  activeClient = client;

  await assert.rejects(updateAdminCampaign("admin-1", "campaign-1", { slots: 2 }), /occupied capacity/i);
  assert.deepEqual(client.countParams, ["campaign-1", capacityStatuses]);
  assert.equal(client.calls.includes("campaign update"), false);
});

test("active and closed campaigns cannot be edited", async () => {
  for (const campaignStatus of ["active", "closed"]) {
    const client = new TransactionClient({ campaignStatus });
    activeClient = client;

    await assert.rejects(updateAdminCampaign("admin-1", "campaign-1", { title: "Changed" }), /only draft or recruiting/i);
    assert.equal(client.calls.includes("campaign update"), false);
  }
});

test("invitations use the same locked lifecycle capacity query", async () => {
  const client = new TransactionClient({ participationStatus: null, occupied: 1, slots: 2 });
  activeClient = client;

  const result = await createCampaignInvitation("admin-1", "campaign-1", "creator-1");
  assert.equal(result.status, "invited");
  assert.deepEqual(client.countParams, ["campaign-1", capacityStatuses]);
  assert.ok(client.calls.indexOf("campaign lock") < client.calls.indexOf("capacity count"));
});

test("creator invitation acceptance and application convergence cannot overbook", async () => {
  for (const operation of [
    () => respondToInvitation("creator-1", "participation-1", true),
    () => applyToCampaign("creator-1", "campaign-1"),
  ]) {
    const client = new TransactionClient({ participationStatus: "invited", occupied: 2, slots: 2 });
    activeClient = client;

    await assert.rejects(operation(), /capacity/i);
    assert.deepEqual(client.countParams, ["campaign-1", capacityStatuses]);
    assert.equal(client.calls.includes("participation update"), false);
  }
});
