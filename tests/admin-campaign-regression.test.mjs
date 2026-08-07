import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, import.meta.url), "utf8");
const exists = async (path) => (await stat(new URL(path, import.meta.url))).isFile();

async function filesBelow(relativePath) {
  const directory = new URL(relativePath, root);
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = `${relativePath}${entry.name}`;
    return entry.isDirectory() ? filesBelow(`${path}/`) : [path];
  }))).flat();
}

test("admin campaign routes and pages keep the complete operational surface", async () => {
  const requiredFiles = [
    "../src/app/api/admin/campaigns/route.ts",
    "../src/app/api/admin/campaigns/[id]/route.ts",
    "../src/app/api/admin/campaigns/[id]/status/route.ts",
    "../src/app/api/admin/campaigns/[id]/invitations/route.ts",
    "../src/app/api/admin/participations/[id]/route.ts",
    "../src/app/dashboard/admin/campaigns/page.tsx",
    "../src/app/dashboard/admin/campaigns/new/page.tsx",
    "../src/app/dashboard/admin/campaigns/[id]/page.tsx",
    "../src/app/dashboard/admin/campaigns/[id]/edit/page.tsx",
  ];

  for (const path of requiredFiles) assert.equal(await exists(path), true, `${path} must exist`);
});

test("every admin campaign and participation mutation requires an admin user", async () => {
  const mutationRoutes = [
    "../src/app/api/admin/campaigns/route.ts",
    "../src/app/api/admin/campaigns/[id]/route.ts",
    "../src/app/api/admin/campaigns/[id]/status/route.ts",
    "../src/app/api/admin/campaigns/[id]/invitations/route.ts",
    "../src/app/api/admin/participations/[id]/route.ts",
  ];

  for (const path of mutationRoutes) {
    const content = await source(path);
    assert.match(content, /export async function (POST|PATCH)\b/, `${path} must expose its mutation`);
    assert.match(content, /requireUser\(["']admin["']\)/, `${path} must require an admin`);
  }
});

test("campaign operations expose no destructive delete route or campaign delete SQL", async () => {
  const routeFiles = await filesBelow("src/app/api/admin/campaigns/");
  const campaignSources = [
    ...routeFiles,
    "src/app/api/admin/participations/[id]/route.ts",
    "src/lib/creator-campaigns.ts",
    "src/lib/db.ts",
  ];

  for (const path of campaignSources) {
    const content = await readFile(new URL(path, root), "utf8");
    assert.doesNotMatch(content, /export async function DELETE\b/, `${path} must not expose campaign deletion`);
    assert.doesNotMatch(content, /DELETE\s+FROM\s+(campaigns|campaign_participations|campaign_events)\b/i, `${path} must not delete campaign data`);
  }
});

test("participation mutations lock the record, update it, and record an event inside a transaction", async () => {
  const campaignDomain = await source("../src/lib/creator-campaigns.ts");
  const transition = campaignDomain.match(/export async function transitionParticipationAsAdmin[\s\S]*?\n}\n/);

  assert.ok(transition, "the admin participation transition must exist");
  assert.match(transition[0], /withDatabaseTransaction/);
  assert.match(transition[0], /SELECT \* FROM campaign_participations WHERE id = \$1 FOR UPDATE/);
  assert.match(transition[0], /UPDATE campaign_participations SET status/);
  assert.match(transition[0], /insertCampaignEvent/);
});

test("changed creator and admin campaign surfaces remain isolated from designer studio components", async () => {
  const creatorAndCampaignComponents = (await filesBelow("src/components/"))
    .filter((path) => /\/(AdminCampaign|Creator)/.test(path));
  const surfaceFiles = [
    ...(await filesBelow("src/app/api/admin/campaigns/")),
    ...(await filesBelow("src/app/dashboard/creator/")),
    ...creatorAndCampaignComponents,
    "src/app/api/admin/participations/[id]/route.ts",
    "src/app/dashboard/admin/campaigns/page.tsx",
    "src/app/dashboard/admin/campaigns/new/page.tsx",
    "src/app/dashboard/admin/campaigns/[id]/page.tsx",
    "src/app/dashboard/admin/campaigns/[id]/edit/page.tsx",
    "src/components/AdminCampaignForm.tsx",
    "src/components/AdminCampaignList.tsx",
    "src/components/AdminCampaignOperations.tsx",
    "src/components/AdminCampaignStatusAction.tsx",
  ];

  for (const path of surfaceFiles) {
    const content = await readFile(new URL(path, root), "utf8");
    assert.doesNotMatch(content, /from\s+["'][^"']*(DesignerStudio|dashboard\/designer|designer\/studio)[^"']*["']/i, `${path} must not import designer studio`);
  }
});

test("creator quick link stays ordered, localized, mobile-safe, and hidden behind overlays", async () => {
  const [authNav, translations] = await Promise.all([
    source("../auth-nav.js"),
    source("../site-i18n.js"),
  ]);

  const studioIndex = authNav.indexOf("stack.appendChild(banner)");
  const creatorIndex = authNav.indexOf("stack.appendChild(creatorBanner)");
  const kakaoIndex = authNav.indexOf("stack.appendChild(kakaoBanner)");
  assert.ok(studioIndex >= 0 && studioIndex < creatorIndex && creatorIndex < kakaoIndex, "Creator Center must remain between designer studio and Kakao");
  assert.match(authNav, /creatorBanner\.href = ["']\/dashboard\/creator["']/);

  for (const locale of ["ko-KR", "vi-VN", "zh-TW", "en-US"]) {
    assert.match(translations, new RegExp(`["']${locale}["']\\s*:`), `${locale} must remain a supported locale`);
  }
  for (const sourceText of ["크리에이터 센터", "크리에이터 센터 바로가기", "크리에이터 바로가기"]) {
    assert.match(translations, new RegExp(`["']${sourceText}["']\\s*:\\s*\\[[^\\]]+,[^\\]]+,[^\\]]+\\]`), `${sourceText} must include Vietnamese, Traditional Chinese, and English translations`);
  }

  assert.match(authNav, /@media \(max-width: 760px\)[\s\S]*?\.quick-link-stack\s*\{[\s\S]*?bottom:\s*calc\(24px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(authNav, /@media \(max-width: 760px\)[\s\S]*?\.quick-link-stack \.studio-quick-banner\s*\{[\s\S]*?min-height:\s*54px/);
  for (const overlayState of ["body:has(.modal.is-open)", "body.proposal-open", "body.sheet-open"]) {
    assert.match(authNav, new RegExp(`${overlayState.replace(/[().]/g, "\\$&")} \\.quick-link-stack`), `${overlayState} must hide the complete quick-link stack`);
  }
});
