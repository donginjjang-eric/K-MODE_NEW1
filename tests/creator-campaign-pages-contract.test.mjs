import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("creator campaign action surfaces preserve the guarded recruiting workflow", async () => {
  const applyRoute = await source("../src/app/api/creator/campaigns/[id]/apply/route.ts");
  const [home, campaigns, applyButton, css] = await Promise.all([
    source("../src/app/dashboard/creator/page.tsx"),
    source("../src/app/dashboard/creator/campaigns/page.tsx"),
    source("../src/components/CreatorCampaignApplyButton.tsx"),
    source("../src/app/dashboard/creator/creator.css"),
  ]);

  assert.match(home, /requireApprovedCreator\(\)/);
  assert.match(home, /getCreatorActionSummary\(creator\.id\)/);
  assert.match(home, /getRecommendedCampaigns\(creator\.id\)/);
  assert.match(home, /getCreatorCampaignActivity\(creator\.id\)/);
  assert.match(home, /getCreatorSettlementSummary\(creator\.id\)/);
  assert.ok(home.indexOf("오늘 할 일") < home.indexOf("마감 임박"), "home must prioritize today actions before deadlines");
  assert.match(home, /recommendedCampaigns\.slice\(0, 3\)/);
  assert.match(home, /href="\/dashboard\/creator\/campaigns"/);

  assert.match(campaigns, /requireApprovedCreator\(\)/);
  assert.match(campaigns, /getRecommendedCampaigns\(creator\.id\)/);
  assert.match(campaigns, /campaign\.status === "recruiting"/);
  assert.match(campaigns, /category/);
  assert.match(campaigns, /market/);
  assert.match(campaigns, /platform/);
  assert.match(campaigns, /campaign\.fit\.reasons/);
  assert.match(campaigns, /campaign\.fit\.score/);
  assert.match(campaigns, /<img/);
  assert.match(campaigns, /reward_text/);
  assert.match(campaigns, /application_deadline/);
  assert.match(campaigns, /slots/);

  assert.match(applyRoute, /getApprovedCreatorForApi\(\)/);
  assert.match(applyRoute, /applyToCampaign\(auth\.creator\.id, campaignId\)/);
  assert.match(applyRoute, /code:\s*["']duplicate["']/);
  assert.match(applyRoute, /code:\s*["']closed["']/);
  assert.match(applyRoute, /revalidatePath\(["']\/dashboard\/creator["']\)/);
  assert.match(applyRoute, /revalidatePath\(["']\/dashboard\/creator\/campaigns["']\)/);

  assert.match(applyButton, /fetch\(`\/api\/creator\/campaigns\/\$\{campaignId\}\/apply`/);
  assert.match(applyButton, /aria-live="polite"/);
  assert.match(applyButton, /disabled=\{busy \|\| terminalState\}/);
  assert.match(applyButton, /result\.code === "duplicate"/);
  assert.match(applyButton, /result\.code === "closed"/);
  assert.match(applyButton, /router\.refresh\(\)/);
  assert.ok(applyButton.indexOf("if (!response.ok)") < applyButton.indexOf('setState("success")'), "success must only be set after an OK response");
  assert.match(applyButton, /다시 시도/);

  assert.match(css, /\.creator-center\s+\.creator-action-home/);
  assert.match(css, /\.creator-center\s+\.creator-campaign-card/);
});
