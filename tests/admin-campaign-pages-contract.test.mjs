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
  const [collectionRoute, campaignRoute, statusRoute, handlers] = await Promise.all([
    ...routeFiles.map(source),
    source("../src/lib/admin-campaign-route-handlers.js"),
  ]);

  for (const route of [collectionRoute, campaignRoute, statusRoute]) {
    assert.match(route, /requireUser\(["']admin["']\)/);
  }

  for (const status of [400, 404, 409]) assert.match(handlers, new RegExp(`status:\\s*${status}`));
  assert.match(handlers, /revalidatePath\(["']\/dashboard\/admin\/campaigns["']\)/);
  assert.match(handlers, /[가-힣]/);

  assert.match(collectionRoute, /handleAdminCampaignCreate/);
  assert.match(campaignRoute, /handleAdminCampaignUpdate/);
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
  assert.match(list, /campaign\.application_count/);
  assert.match(list, /campaign\.matched_count/);
  assert.doesNotMatch(list, /<td>0<\/td><td>0<\/td>/);
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
  const detailPage = await source("../src/app/dashboard/admin/campaigns/[id]/page.tsx");
  assert.match(detailPage, /getAdminCampaign/);
  assert.match(detailPage, /notFound\(\)/);
  assert.match(editPage, /getAdminCampaign/);
  assert.match(editPage, /AdminCampaignForm/);
  assert.match(css, /\.admin-studio\s+\.admin-campaign/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
