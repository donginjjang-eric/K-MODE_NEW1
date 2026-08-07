import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("campaign operations are guarded, validate state changes, and refresh both workspaces", async () => {
  const [route, statusRoute] = await Promise.all([
    source("../src/app/api/admin/participations/[id]/route.ts"),
    source("../src/app/api/admin/campaigns/[id]/status/route.ts"),
  ]);

  assert.match(route, /requireUser\(["']admin["']\)/);
  assert.match(route, /transitionParticipationAsAdmin\(admin\.id, participationId, action(?: as AdminParticipationAction)?, note\)/);
  assert.match(route, /status:\s*400/);
  assert.match(route, /status:\s*404/);
  assert.match(route, /status:\s*409/);
  assert.match(route, /revalidatePath\(["']\/dashboard\/admin\/campaigns["']\)/);
  assert.match(route, /revalidatePath\(`\/dashboard\/admin\/campaigns\/\$\{participation\.campaign_id\}`\)/);
  assert.match(route, /revalidatePath\(["']\/dashboard\/creator["']\)/);
  assert.match(route, /revalidatePath\(["']\/dashboard\/creator\/my-campaigns["']\)/);
  assert.match(route, /revalidatePath\(`\/dashboard\/creator\/my-campaigns\/\$\{participationId\}`\)/);
  assert.match(statusRoute, /cannot transition/i);
  assert.match(statusRoute, /revalidatePath\(["']\/dashboard\/creator["']\)/);
  assert.match(statusRoute, /revalidatePath\(["']\/dashboard\/creator\/campaigns["']\)/);
});

test("campaign detail presents operational context and preserves the invitation endpoint", async () => {
  const [page, operations, statusAction, invitations, campaignDomain] = await Promise.all([
    source("../src/app/dashboard/admin/campaigns/[id]/page.tsx"),
    source("../src/components/AdminCampaignOperations.tsx"),
    source("../src/components/AdminCampaignStatusAction.tsx"),
    source("../src/app/api/admin/campaigns/[id]/invitations/route.ts"),
    source("../src/lib/creator-campaigns.ts"),
  ]);

  assert.match(page, /getAdminCampaign/);
  assert.match(page, /getCreatorAccountsForAdmin/);
  assert.match(page, /AdminCampaignOperations/);
  assert.match(page, /AdminCampaignStatusAction/);
  for (const field of ["slots", "participants"]) assert.match(page, new RegExp(field, "i"));
  for (const field of ["submissions", "performance", "events"]) assert.match(operations, new RegExp(field, "i"));
  assert.match(operations, /\/api\/admin\/participations\//);
  assert.match(operations, /\/api\/admin\/campaigns\/\$\{campaignId\}\/invitations/);
  assert.match(operations, /approved/);
  assert.match(operations, /disabled=/);
  assert.match(operations, /aria-live=["']polite["']/);
  assert.match(statusAction, /\/api\/admin\/campaigns\/\$\{campaignId\}\/status/);
  assert.match(statusAction, /aria-live=["']polite["']/);
  assert.match(invitations, /revalidatePath/);
  assert.match(invitations, /\/dashboard\/creator/);
  assert.match(campaignDomain, /campaign_participations p/);
  assert.match(campaignDomain, /content_submissions/);
  assert.match(campaignDomain, /campaign_performance/);
  assert.match(campaignDomain, /campaign_events/);
});

test("campaign operations remain isolated from designer studio", async () => {
  const [page, operations, statusAction, route] = await Promise.all([
    source("../src/app/dashboard/admin/campaigns/[id]/page.tsx"),
    source("../src/components/AdminCampaignOperations.tsx"),
    source("../src/components/AdminCampaignStatusAction.tsx"),
    source("../src/app/api/admin/participations/[id]/route.ts"),
  ]);

  for (const content of [page, operations, statusAction, route]) {
    assert.doesNotMatch(content, /dashboard\/designer|DesignerStudio|designer\/studio/i);
  }
});
