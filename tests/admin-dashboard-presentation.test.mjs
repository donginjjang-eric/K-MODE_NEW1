import assert from "node:assert/strict";
import { mock, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adminCampaignStatusLabel } from "../src/lib/admin-campaign-ui.js";

await mock.module("next/navigation", {
  namedExports: {
    useRouter: () => ({ push() {} }),
  },
});

await mock.module("@/lib/db", {
  namedExports: {
    getAdminDashboardStats: async () => ({
      usersTotal: 81, designersTotal: 12, pendingDesigners: 3, approvedDesigners: 9,
      productsTotal: 44, generatedLooksTotal: 20, liveGenerationsToday: 7,
      signupsToday: 2, signupsWeek: 11, aiGenerationsWeek: 27,
      creatorProposalsNew: 4, creatorProposalsTotal: 18,
    }),
  },
});

const [{ default: AdminDashboardPage }, { default: NewAdminCampaignPage }] = await Promise.all([
  import("../src/app/dashboard/admin/page.tsx"),
  import("../src/app/dashboard/admin/campaigns/new/page.tsx"),
]);

test("new campaign confirmation uses the shared Korean status label", () => {
  const html = renderToStaticMarkup(React.createElement(NewAdminCampaignPage));

  assert.equal(adminCampaignStatusLabel("draft"), "초안");
  assert.match(html, /새 캠페인은 초안 상태로 저장됩니다\./);
  assert.doesNotMatch(html, /새 캠페인은 draft 상태로 저장됩니다\./);
});

test("admin dashboard leads with actionable work and labels metrics as aggregates", async () => {
  const html = renderToStaticMarkup(await AdminDashboardPage());

  assert.match(html, /바로 처리할 일/);
  assert.match(html, /운영 현황 집계/);
  assert.match(html, /신규 협업 제안/);
  assert.match(html, /승인 대기 브랜드 파트너/);
  assert.match(html, /현재 보유 데이터 기준의 집계/);
  assert.doesNotMatch(html, /최근 활동|최근 이벤트|활동 내역/);
  assert.ok(html.indexOf("바로 처리할 일") < html.indexOf("운영 현황 집계"));
});
