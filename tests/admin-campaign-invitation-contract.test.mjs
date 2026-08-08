import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admin invitation creation is transactional, capacity-aware, and records an event", async () => {
  const domain = await source("../src/lib/creator-campaigns.ts");

  assert.match(domain, /export async function createCampaignInvitation\(actorUserId: string, campaignId: string, creatorId: string\)/);
  assert.match(domain, /withDatabaseTransaction\(async \(client\)/);
  assert.match(domain, /SELECT \* FROM campaigns WHERE id = \$1 FOR UPDATE/);
  assert.match(domain, /SELECT \* FROM creator_accounts WHERE id = \$1 FOR UPDATE/);
  assert.match(domain, /approval_status !== "approved"/);
  assert.match(domain, /assertCreatorCanAccessCampaign\(\{ \.\.\.creator, owner_role:/);
  assert.match(domain, /SELECT role FROM users WHERE id = \$1 FOR UPDATE/);
  assert.match(domain, /COUNT\(\*\).*campaign_participations/s);
  assert.match(domain, /INSERT INTO campaign_participations/);
  assert.match(domain, /'invitation', 'invited'/);
  assert.match(domain, /insertCampaignEvent\(client, participation, actorUserId, null, "invitation_created"/);
});

test("admin invitation API authenticates operations and returns only the participation reference", async () => {
  const route = await source("../src/app/api/admin/campaigns/[id]/invitations/route.ts");

  assert.match(route, /await requireUser\("admin"\)/);
  assert.match(route, /createCampaignInvitation\(admin\.id, campaignId, creatorId\)/);
  assert.match(route, /status: 400/);
  assert.match(route, /status: 404/);
  assert.match(route, /status: 409/);
  assert.match(route, /participation: \{ id: participation\.id, status: participation\.status \}/);
  assert.doesNotMatch(route, /return Response\.json\(\{[^}]*creator[^}]*campaign/s);
});
