import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");
const exists = async (path) => (await stat(new URL(path, import.meta.url))).isFile();

const pages = ["campaigns", "proposals", "content", "orders", "settlements"];
const mutationRoutes = [
  "../src/app/api/beauty/campaigns/route.ts",
  "../src/app/api/beauty/campaigns/[id]/route.ts",
  "../src/app/api/beauty/campaigns/[id]/status/route.ts",
  "../src/app/api/beauty/participations/[id]/route.ts",
];

test("beauty operations pages exist, authenticate as a beauty partner, and pass only the current designer id to reads", async () => {
  for (const page of pages) {
    const path = `../src/app/dashboard/beauty/${page}/page.tsx`;
    assert.equal(await exists(path), true, path);
    const content = await source(path);
    assert.match(content, /requireBeautyPartner\(\)/);
    assert.match(content, /designer\.id/);
    assert.doesNotMatch(content, /searchParams[\s\S]*designerId|params[\s\S]*designerId/);
  }
});

test("beauty mutation APIs authenticate through requireBeautyPartner and never accept an owner id from request JSON", async () => {
  for (const path of mutationRoutes) {
    assert.equal(await exists(path), true, path);
    const route = await source(path);
    assert.match(route, /requireBeautyPartner\(\)/);
    assert.match(route, /designer\.id/);
    assert.match(route, /user\.id/);
    assert.doesNotMatch(route, /body\.(designer_id|designerId|owner_id|ownerId)/);
  }
});

test("campaign, content, order, proposal, and settlement screens expose real-data empty-state next actions", async () => {
  const [campaigns, proposals, content, orders, settlements] = await Promise.all(pages.map((page) => source(`../src/app/dashboard/beauty/${page}/page.tsx`)));

  assert.match(campaigns, /listBeautyPartnerCampaigns\(designer\.id\)/);
  assert.match(campaigns, /getProductsForDesigner\(designer\.id\)/);
  assert.match(proposals, /getCollabRequestsForDesigner\(designer\.id\)/);
  assert.match(content, /listBeautyPartnerContent\(designer\.id\)/);
  assert.match(orders, /listBeautyPartnerOrders\(designer\.id\)/);
  assert.match(orders, /getCollabRequestsForDesigner\(designer\.id\)/);
  assert.match(settlements, /listBeautyPartnerSettlements\(designer\.id\)/);
  for (const page of [campaigns, proposals, content, orders, settlements]) {
    assert.match(page, /beauty-empty-state/);
    assert.doesNotMatch(page, /mock|fixture|가상 매출|예상 조회수/i);
  }
});

test("content review actions carry the displayed latest submission id and campaign cards do not offer unbound review actions", async () => {
  const [campaigns, content, actions, route] = await Promise.all([
    source("../src/app/dashboard/beauty/campaigns/page.tsx"),
    source("../src/app/dashboard/beauty/content/page.tsx"),
    source("../src/components/BeautyCampaignActions.tsx"),
    source("../src/app/api/beauty/participations/[id]/route.ts"),
  ]);

  assert.match(content, /submission\.is_latest[\s\S]*submissionId=\{submission\.id\}/);
  assert.match(actions, /submissionId\?: string/);
  assert.match(actions, /\{ action, note, submissionId \}/);
  assert.match(route, /submissionId/);
  assert.match(campaigns, /participant\.status !== "review"[\s\S]*BeautyParticipationActions/);
});

test("beauty primary navigation contains all eight active destinations and fits as two mobile rows", async () => {
  const [navData, css] = await Promise.all([
    import("../src/lib/brand-partner-center.js"),
    source("../src/app/dashboard/beauty/beauty.css"),
  ]);
  assert.deepEqual(navData.BEAUTY_PARTNER_NAV_ITEMS.map(({ label, href, availability }) => ({ label, href, availability })), [
    { label: "홈", href: "/dashboard/beauty", availability: "active" },
    { label: "브랜드", href: "/dashboard/beauty/brand", availability: "active" },
    { label: "상품", href: "/dashboard/beauty/products", availability: "active" },
    { label: "캠페인·매칭", href: "/dashboard/beauty/campaigns", availability: "active" },
    { label: "제안·거래", href: "/dashboard/beauty/proposals", availability: "active" },
    { label: "콘텐츠 검수", href: "/dashboard/beauty/content", availability: "active" },
    { label: "성과·주문", href: "/dashboard/beauty/orders", availability: "active" },
    { label: "정산", href: "/dashboard/beauty/settlements", availability: "active" },
  ]);
  assert.match(css, /\.beauty-partner\s*{[\s\S]*?overflow-x:\s*clip/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.beauty-mobile-nav\s*{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
});

test("fashion designer shell uses the selected fashion workspace contract", async () => {
  const [layout, nav] = await Promise.all([
    source("../src/app/dashboard/designer/layout.tsx"),
    source("../src/components/StudioNav.tsx"),
  ]);
  assert.match(layout, /requireFashionPartner\(\)/);
  assert.doesNotMatch(layout, /requireApprovedDesigner\(/);
  assert.match(layout, /active="fashion_partner"/);
  assert.match(nav, /\/dashboard\/designer\/products/);
  assert.doesNotMatch(nav, /\/dashboard\/beauty/);
});
