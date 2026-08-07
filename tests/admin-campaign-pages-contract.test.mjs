import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

const routeFiles = [
  "../src/app/api/admin/campaigns/route.ts",
  "../src/app/api/admin/campaigns/[id]/route.ts",
  "../src/app/api/admin/campaigns/[id]/status/route.ts",
];

test("admin campaign APIs guard mutations, validate input, and revalidate campaign screens", async () => {
  const [collectionRoute, campaignRoute, statusRoute] = await Promise.all(routeFiles.map(source));

  for (const route of [collectionRoute, campaignRoute, statusRoute]) {
    assert.match(route, /requireUser\(["']admin["']\)/);
    assert.match(route, /Response\.json\([\s\S]*status:\s*400/);
    assert.match(route, /Response\.json\([\s\S]*status:\s*404/);
    assert.match(route, /Response\.json\([\s\S]*status:\s*409/);
    assert.match(route, /revalidatePath\(["']\/dashboard\/admin\/campaigns["']\)/);
    assert.match(route, /[가-힣]/);
  }

  assert.match(collectionRoute, /createAdminCampaign\(admin\.id, input\)/);
  assert.match(campaignRoute, /updateAdminCampaign\(admin\.id, campaignId, input\)/);
  assert.match(statusRoute, /setAdminCampaignStatus\(admin\.id, campaignId, status\)/);
  assert.match(statusRoute, /["']recruiting["']/);
  assert.match(statusRoute, /["']active["']/);
  assert.match(statusRoute, /["']closed["']/);
  assert.doesNotMatch(statusRoute, /["']draft["']/);
});

test("admin campaign list, navigation, and editor expose the required campaign workflow", async () => {
  const [nav, list, form, listPage, newPage, editPage, css] = await Promise.all([
    source("../src/components/AdminNav.tsx"),
    source("../src/components/AdminCampaignList.tsx"),
    source("../src/components/AdminCampaignForm.tsx"),
    source("../src/app/dashboard/admin/campaigns/page.tsx"),
    source("../src/app/dashboard/admin/campaigns/new/page.tsx"),
    source("../src/app/dashboard/admin/campaigns/[id]/edit/page.tsx"),
    source("../src/app/dashboard/admin/admin.css"),
  ]);

  assert.match(nav, /href:\s*["']\/dashboard\/admin\/campaigns["']/);
  assert.match(listPage, /listAdminCampaigns/);
  assert.match(listPage, /AdminCampaignList/);
  assert.match(list, /["']all["']/);
  for (const status of ["draft", "recruiting", "active", "closed"]) assert.match(list, new RegExp(`["']${status}["']`));
  for (const field of ["title", "category", "markets", "platforms", "application", "matched", "slots", "deadline", "status"]) {
    assert.match(list, new RegExp(field, "i"));
  }

  for (const field of ["title", "category", "markets", "platforms", "brief", "reward", "slots", "application_deadline", "content_deadline", "image"]) {
    assert.match(form, new RegExp(field, "i"));
  }
  assert.match(form, /https:/i);
  assert.match(form, /aria-live=["']polite["']/);
  assert.match(form, /[가-힣]/);
  assert.match(newPage, /INITIAL_STATUS\s*=\s*["']draft["']/);
  assert.match(newPage, /router\.push\(`\/dashboard\/admin\/campaigns\/\$\{campaign\.id\}`\)/);
  assert.match(editPage, /getAdminCampaign/);
  assert.match(editPage, /AdminCampaignForm/);
  assert.match(css, /\.admin-studio\s+\.admin-campaign/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
