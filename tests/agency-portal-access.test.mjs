import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { mock, test } from "node:test";

let activeClient;

await mock.module("pg", {
  namedExports: {
    Pool: class {
      async query(sql, params = []) {
        if (!activeClient) throw new Error("Agency test client was not configured.");
        return activeClient.query(sql, params);
      }
    },
  },
});

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/kmodu_test";

const {
  getAgencyGroupOverview,
  listAgencyManagementGroups,
} = await import("../src/lib/creator-management.ts");

class AgencyReadClient {
  constructor({ active = true } = {}) {
    this.active = active;
    this.statements = [];
  }

  async query(text, params = []) {
    this.statements.push({ text, params });

    if (text.includes("agency_group_summary")) {
      const requestedGroupId = params[1];
      if (!this.active || requestedGroupId === "group-other") return { rows: [], rowCount: 0 };
      return {
        rows: [{
          id: "group-own",
          name: "SEA Beauty",
          agency_name: "Partner Agency",
          creator_count: "2",
          active_campaign_count: "1",
          deal_count: "2",
          pending_settlement_count: "1",
        }],
        rowCount: 1,
      };
    }

    if (text.includes("agency_group_creators")) {
      return {
        rows: [{
          creator_key: "creator-a",
          display_name: "Creator A",
          profile_image_url: "/creator-a.webp",
          instagram_followers: "120",
          tiktok_followers: "880",
        }],
        rowCount: 1,
      };
    }

    if (text.includes("agency_group_campaign_facts")) {
      return {
        rows: [
          {
            campaign_id: "campaign-1",
            campaign_title: "Glow Launch",
            campaign_status: "active",
            creator_key: "creator-a",
            creator_name: "Creator A",
            participation_status: "matched",
            expected_reward: "RM 420 + product",
            settlement_status: "pending",
            views: "10000",
            likes: "500",
            comments: "30",
            orders: "7",
            revenue: "1250.50",
            performance_currency: "MYR",
          },
          {
            campaign_id: "campaign-2",
            campaign_title: "Skin Edit",
            campaign_status: "closed",
            creator_key: "creator-b",
            creator_name: "Creator B",
            participation_status: "completed",
            expected_reward: "USD 300",
            settlement_status: "paid",
            views: "8000",
            likes: "410",
            comments: "20",
            orders: "4",
            revenue: "300.00",
            performance_currency: "USD",
          },
        ],
        rowCount: 2,
      };
    }

    throw new Error(`Unexpected agency query: ${text}`);
  }
}

test("agency list is limited to active user-group relationships and keeps reward currencies honest", async () => {
  const client = new AgencyReadClient();
  activeClient = client;

  const groups = await listAgencyManagementGroups(" agency-user ");

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0], {
    id: "group-own",
    name: "SEA Beauty",
    agencyName: "Partner Agency",
    creatorCount: 2,
    activeCampaignCount: 1,
    dealCount: 2,
    pendingSettlementCount: 1,
  });
  assert.deepEqual(client.statements[0].params, ["agency-user"]);
  assert.match(client.statements[0].text, /group_user\.user_id = \$1/);
  assert.match(client.statements[0].text, /group_user\.invite_status = 'active'/);
  assert.match(client.statements[0].text, /group_row\.status = 'active'/);
  assert.match(client.statements[0].text, /matched.*shipping.*creating.*review.*published.*settlement.*completed/s);
});

test("agency detail returns creators, confirmed deals, exact reward text, and currency-separated performance", async () => {
  const client = new AgencyReadClient();
  activeClient = client;

  const overview = await getAgencyGroupOverview("agency-user", "group-own");

  assert.equal(overview?.id, "group-own");
  assert.equal(overview?.creators[0].followerTotal, 1000);
  assert.equal(overview?.campaigns[0].expectedReward, "RM 420 + product");
  assert.equal(overview?.campaigns[0].revenue, 1250.5);
  assert.deepEqual(overview?.rewardEntries, [
    { text: "RM 420 + product", count: 1 },
    { text: "USD 300", count: 1 },
  ]);
  assert.deepEqual(overview?.revenueByCurrency, [
    { currency: "MYR", amount: 1250.5 },
    { currency: "USD", amount: 300 },
  ]);
  for (const statement of client.statements.slice(1)) {
    assert.deepEqual(statement.params.slice(0, 2), ["agency-user", "group-own"]);
    assert.match(statement.text, /group_user\.user_id = \$1/);
    assert.match(statement.text, /group_row\.id = \$2/);
    assert.match(statement.text, /group_user\.invite_status = 'active'/);
  }
});

test("revoked access and direct other-group IDs reveal no group data", async () => {
  const revokedClient = new AgencyReadClient({ active: false });
  activeClient = revokedClient;
  assert.deepEqual(await listAgencyManagementGroups("agency-user"), []);

  const client = new AgencyReadClient();
  activeClient = client;
  assert.equal(await getAgencyGroupOverview("agency-user", "group-other"), null);
  assert.equal(client.statements.length, 1, "an inaccessible group must stop before creator or campaign reads");
});

test("agency portal exposes no mutation route or mutation controls", async () => {
  await assert.rejects(access(new URL("../src/app/api/agency", import.meta.url)));
  const [home, detail] = await Promise.all([
    readFile(new URL("../src/app/dashboard/agency/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dashboard/agency/groups/[groupId]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(`${home}\n${detail}`, /<(button|form)\b|fetch\s*\(|\/api\/agency/);
});
