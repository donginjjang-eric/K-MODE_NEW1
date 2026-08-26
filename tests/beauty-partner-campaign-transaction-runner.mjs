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
    },
  },
});

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/kmodu_test";

const {
  createBeautyPartnerCampaign,
  transitionBeautyPartnerParticipation,
  updateBeautyPartnerCampaign,
} = await import("../src/lib/beauty-partner-campaigns.ts");

const validInput = {
  product_id: "product-1",
  title: "Glow launch",
  category: "beauty",
  markets: ["한국"],
  platforms: ["Instagram"],
  brief: "Create one short-form review.",
  reward_text: "KRW 300,000",
  application_deadline: "2026-09-01T00:00:00.000Z",
  content_deadline: "2026-09-15T00:00:00.000Z",
  slots: 2,
  image_urls: [],
};

class RecordingClient {
  constructor({ productOwned = true, campaignOwned = true, participationStatus = "applied" } = {}) {
    this.productOwned = productOwned;
    this.campaignOwned = campaignOwned;
    this.participationStatus = participationStatus;
    this.statements = [];
  }

  async query(text, params = []) {
    this.statements.push({ text, params });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text)) return { rows: [] };
    if (text.includes("FROM designers") && text.includes("FOR UPDATE")) {
      return { rows: [{ id: "designer-1", user_id: "user-1" }] };
    }
    if (text.includes("FROM products") && text.includes("designer_id") && text.includes("FOR")) {
      return { rows: this.productOwned ? [{ id: params[0], designer_id: params[1], status: "active" }] : [] };
    }
    if (text.includes("INSERT INTO campaigns")) {
      return { rows: [{ id: "campaign-1", owner_type: "designer", owner_id: "user-1", designer_id: "designer-1", product_id: "product-1", status: "draft", ...validInput }] };
    }
    if (text.includes("FROM campaigns") && text.includes("FOR UPDATE")) {
      return { rows: this.campaignOwned ? [{ id: "campaign-1", owner_type: "designer", owner_id: "user-1", designer_id: "designer-1", product_id: "product-1", status: "draft", ...validInput }] : [] };
    }
    if (text.includes("UPDATE campaigns")) {
      return { rows: [{ id: "campaign-1", owner_type: "designer", designer_id: "designer-1", title: "Updated", status: "draft", ...validInput }] };
    }
    if (text.includes("FROM campaign_participations") && text.includes("JOIN campaigns")) {
      return { rows: this.campaignOwned ? [{ id: "participation-1", campaign_id: "campaign-1", status: this.participationStatus, settlement_status: "none" }] : [] };
    }
    if (text.includes("COUNT(*)") && text.includes("campaign_participations")) return { rows: [{ count: "0" }] };
    if (text.includes("UPDATE campaign_participations")) {
      const nextStatus = params[1];
      return { rows: [{ id: "participation-1", campaign_id: "campaign-1", status: nextStatus, settlement_status: "none" }] };
    }
    if (text.includes("UPDATE content_submissions")) return { rows: [{ id: "submission-1" }] };
    if (text.includes("INSERT INTO campaign_events")) return { rows: [] };
    throw new Error(`Unexpected query: ${text}`);
  }

  release() {}
}

test("creates a designer-owned campaign only after locking the authenticated partner and its product", async () => {
  const client = new RecordingClient();
  activeClient = client;

  const campaign = await createBeautyPartnerCampaign("designer-1", "user-1", validInput);

  assert.equal(campaign.owner_type, "designer");
  const partnerRead = client.statements.find(({ text }) => text.includes("FROM designers") && text.includes("FOR UPDATE"));
  assert.deepEqual(partnerRead.params, ["designer-1", "user-1"]);
  const productRead = client.statements.find(({ text }) => text.includes("FROM products") && text.includes("FOR"));
  assert.deepEqual(productRead.params, ["product-1", "designer-1"]);
  const insert = client.statements.find(({ text }) => text.includes("INSERT INTO campaigns"));
  assert.match(insert.text, /owner_type[^)]*owner_id[^)]*designer_id[^)]*product_id/s);
  assert.deepEqual(insert.params.slice(0, 4), ["user-1", "designer-1", "product-1", "Glow launch"]);
  assert.equal(client.statements.at(-2).text, "COMMIT");
});

test("rejects another brand's product before campaign insertion", async () => {
  const client = new RecordingClient({ productOwned: false });
  activeClient = client;

  await assert.rejects(createBeautyPartnerCampaign("designer-1", "user-1", validInput), /owned product was not found/i);
  assert.equal(client.statements.some(({ text }) => text.includes("INSERT INTO campaigns")), false);
  assert.equal(client.statements.at(-2).text, "ROLLBACK");
});

test("scopes campaign edits by designer owner in the locking query", async () => {
  const client = new RecordingClient({ campaignOwned: false });
  activeClient = client;

  await assert.rejects(updateBeautyPartnerCampaign("designer-1", "user-1", "campaign-other", { title: "Updated" }), /campaign was not found/i);
  const campaignRead = client.statements.find(({ text }) => text.includes("FROM campaigns") && text.includes("FOR UPDATE"));
  assert.match(campaignRead.text, /owner_type\s*=\s*'designer'/);
  assert.match(campaignRead.text, /designer_id\s*=\s*\$2/);
  assert.deepEqual(campaignRead.params, ["campaign-other", "designer-1"]);
  assert.equal(client.statements.some(({ text }) => text.includes("UPDATE campaigns")), false);
});

test("scopes participation decisions through the owned campaign and records content review decisions", async () => {
  const client = new RecordingClient({ participationStatus: "review" });
  activeClient = client;

  const participation = await transitionBeautyPartnerParticipation("designer-1", "user-1", "participation-1", "published", "검수 승인");

  assert.equal(participation.status, "published");
  const participationRead = client.statements.find(({ text }) => text.includes("FROM campaign_participations") && text.includes("JOIN campaigns"));
  assert.match(participationRead.text, /campaign\.owner_type\s*=\s*'designer'/);
  assert.match(participationRead.text, /campaign\.designer_id\s*=\s*\$2/);
  assert.deepEqual(participationRead.params, ["participation-1", "designer-1"]);
  const reviewUpdate = client.statements.find(({ text }) => text.includes("UPDATE content_submissions"));
  assert.match(reviewUpdate.text, /status\s*=\s*'approved'/);
  assert.deepEqual(reviewUpdate.params, ["participation-1", "검수 승인"]);
  assert.equal(client.statements.some(({ text }) => text.includes("INSERT INTO campaign_events")), true);
});

test("rejects a participation outside the current brand without issuing an update", async () => {
  const client = new RecordingClient({ campaignOwned: false });
  activeClient = client;

  await assert.rejects(transitionBeautyPartnerParticipation("designer-1", "user-1", "participation-other", "approve"), /participation was not found/i);
  assert.equal(client.statements.some(({ text }) => text.includes("UPDATE campaign_participations")), false);
});
