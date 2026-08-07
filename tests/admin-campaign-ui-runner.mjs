import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mock, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

await mock.module("next/navigation", {
  namedExports: {
    useRouter: () => ({ push() {}, refresh() {} }),
  },
});

const [{ default: AdminCampaignForm }, { default: AdminCampaignList }, { default: AdminCampaignOperations }] = await Promise.all([
  import("../src/components/AdminCampaignForm.tsx"),
  import("../src/components/AdminCampaignList.tsx"),
  import("../src/components/AdminCampaignOperations.tsx"),
]);

const baseCampaign = {
  id: "campaign-1",
  owner_type: "admin",
  owner_id: "admin-1",
  title: "Campaign",
  category: "beauty",
  markets: ["KR"],
  platforms: ["Instagram"],
  brief: "Campaign brief",
  reward_text: "500,000 KRW",
  application_deadline: "2026-09-01T00:00:00.000Z",
  content_deadline: "2026-09-15T00:00:00.000Z",
  slots: 3,
  image_urls: [],
  status: "draft",
  created_at: "2026-08-08T00:00:00.000Z",
  updated_at: "2026-08-08T00:00:00.000Z",
  application_count: 0,
  matched_count: 0,
};

function participant(id, status, submissions = []) {
  return {
    id,
    campaign_id: "campaign-1",
    creator_account_id: `creator-${id}`,
    source: status === "invited" ? "invitation" : "application",
    status,
    next_action: "",
    shipping_note: "",
    expected_reward: "500,000 KRW",
    settlement_status: "none",
    created_at: "2026-08-08T00:00:00.000Z",
    updated_at: "2026-08-08T00:00:00.000Z",
    creator_display_name: `Creator ${id}`,
    creator_google_email: `creator-${id}@example.com`,
    creator_platform: "Instagram",
    creator_market: "KR",
    submissions,
    performance: null,
    events: [],
  };
}

test("campaign form requires ordered application and content deadlines", () => {
  const html = renderToStaticMarkup(React.createElement(AdminCampaignForm, {
    campaign: baseCampaign,
    endpoint: "/api/admin/campaigns/campaign-1",
    method: "PATCH",
  }));

  assert.match(html, /<input(?=[^>]*name="application_deadline")(?=[^>]*required)/);
  assert.match(html, /<input(?=[^>]*name="content_deadline")(?=[^>]*required)/);
  assert.match(html, /<input(?=[^>]*name="application_deadline")(?=[^>]*max="2026-09-15T00:00")/);
  assert.match(html, /<input(?=[^>]*name="content_deadline")(?=[^>]*min="2026-09-01T00:00")/);
});

test("campaign list shows legal edit and close actions plus an empty-state creation CTA", () => {
  const campaigns = [
    { ...baseCampaign, id: "draft-id", status: "draft" },
    { ...baseCampaign, id: "recruiting-id", status: "recruiting" },
    { ...baseCampaign, id: "active-id", status: "active" },
    { ...baseCampaign, id: "closed-id", status: "closed" },
  ];
  const html = renderToStaticMarkup(React.createElement(AdminCampaignList, { campaigns, selectedStatus: "all" }));

  assert.match(html, /href="\/dashboard\/admin\/campaigns\/draft-id\/edit"/);
  assert.match(html, /href="\/dashboard\/admin\/campaigns\/recruiting-id\/edit"/);
  assert.doesNotMatch(html, /href="\/dashboard\/admin\/campaigns\/(?:active-id|closed-id)\/edit"/);
  assert.equal((html.match(/data-campaign-close=/g) ?? []).length, 3);

  const emptyHtml = renderToStaticMarkup(React.createElement(AdminCampaignList, { campaigns: [], selectedStatus: "all" }));
  assert.match(emptyHtml, /href="\/dashboard\/admin\/campaigns\/new"/);
  assert.match(emptyHtml, /새 캠페인/);
});

test("participant controls use semantic actions and never let admins accept invitations", () => {
  const html = renderToStaticMarkup(React.createElement(AdminCampaignOperations, {
    campaignId: "campaign-1",
    campaignStatus: "recruiting",
    creators: [],
    participants: [participant("applied", "applied"), participant("invited", "invited")],
  }));

  assert.match(html, /신청 승인/);
  assert.match(html, /신청 거절/);
  assert.match(html, /초대 취소/);
  assert.doesNotMatch(html, /Mark accepted|수락 처리/);
});

test("submission URLs render as links only when they are safe HTTPS URLs", () => {
  const submissions = [{
    id: "submission-1",
    participation_id: "participation-1",
    version: 1,
    content_url: "https://content.example.com/post",
    caption_text: "Caption",
    status: "published",
    review_note: "Approved",
    published_url: "javascript:alert(1)",
    submitted_at: "2026-08-08T00:00:00.000Z",
    reviewed_at: null,
    published_at: null,
  }];
  const html = renderToStaticMarkup(React.createElement(AdminCampaignOperations, {
    campaignId: "campaign-1",
    campaignStatus: "active",
    creators: [],
    participants: [participant("matched", "matched", submissions)],
  }));

  assert.match(html, /href="https:\/\/content\.example\.com\/post"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test("operation response codes map to Korean guidance without exposing raw errors", async () => {
  const ui = await import("../src/lib/admin-campaign-ui.js").catch(() => ({}));
  assert.equal(typeof ui.adminCampaignOperationMessage, "function");
  assert.equal(typeof ui.safeHttpsUrl, "function");
  assert.equal(typeof ui.isAdminCampaignEditable, "function");

  const raw = "duplicate key value violates unique constraint campaign_participations_campaign_id_creator_account_id_key";
  for (const input of [
    { status: 409, code: "capacity_full", error: raw },
    { status: 409, code: "invalid_state", error: raw },
    { status: 404, code: "not_found", error: raw },
    { status: 500, code: "server_error", error: raw },
    { status: 0, code: "network_error", error: raw },
  ]) {
    const message = ui.adminCampaignOperationMessage(input);
    assert.match(message, /[가-힣]/u);
    assert.doesNotMatch(message, /duplicate key|constraint|campaign_participations/i);
  }

  assert.equal(ui.safeHttpsUrl("https://content.example.com/post"), "https://content.example.com/post");
  for (const unsafe of ["http://content.example.com", "javascript:alert(1)", "https://user:pass@example.com", "not-a-url", null]) {
    assert.equal(ui.safeHttpsUrl(unsafe), null);
  }
  assert.equal(ui.isAdminCampaignEditable("draft"), true);
  assert.equal(ui.isAdminCampaignEditable("recruiting"), true);
  assert.equal(ui.isAdminCampaignEditable("active"), false);
  assert.equal(ui.isAdminCampaignEditable("closed"), false);

  const componentSources = await Promise.all([
    readFile(new URL("../src/components/AdminCampaignForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/AdminCampaignOperations.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/AdminCampaignStatusAction.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of componentSources) {
    assert.doesNotMatch(source, /set(?:Error|Message)\([^\n]*result\.error/);
    assert.match(source, /adminCampaignOperationMessage/);
  }
});
