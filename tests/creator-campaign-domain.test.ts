import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCampaignCanCreateInvitation,
  assertCampaignCanAcceptApplication,
  canTransitionParticipation,
  rankCampaignRecommendations,
  resolveApplicationStatus,
  resolveInvitationResponseStatus,
  scoreCampaignFit,
} from "../src/lib/creator-campaigns";

const creator = {
  id: "creator-1",
  market: "VN",
  platform: "TikTok",
  categories: ["beauty", "skincare"],
};

const futureDeadline = "2030-01-15T00:00:00.000Z";

test("scores market, platform, category, and deadline with their full weights", () => {
  const result = scoreCampaignFit({
    creator,
    campaign: {
      id: "campaign-1",
      markets: ["vn"],
      platforms: ["tiktok"],
      category: "beauty",
      application_deadline: futureDeadline,
    },
    now: new Date("2030-01-01T00:00:00.000Z"),
  });

  assert.equal(result.score, 100);
  assert.deepEqual(result.reasons, ["market", "platform", "category", "deadline"]);
});

test("assigns each compatibility dimension its exact independent weight", () => {
  const now = new Date("2030-01-01T00:00:00.000Z");
  const base = { id: "campaign", markets: ["US"], platforms: ["YouTube"], category: "fashion", application_deadline: null };

  assert.equal(scoreCampaignFit({ creator, campaign: { ...base, markets: ["VN"] }, now }).score, 40);
  assert.equal(scoreCampaignFit({ creator, campaign: { ...base, platforms: ["TikTok"] }, now }).score, 30);
  assert.equal(scoreCampaignFit({ creator, campaign: { ...base, category: "beauty" }, now }).score, 20);
  assert.equal(scoreCampaignFit({ creator, campaign: { ...base, application_deadline: futureDeadline }, now }).score, 10);
});

test("ranks equal-fit campaigns by deadline while preserving original order for equal deadlines", () => {
  const ranked = rankCampaignRecommendations(
    creator,
    [
      { id: "no-deadline", markets: ["VN"], platforms: ["TikTok"], category: "beauty", application_deadline: null },
      { id: "later", markets: ["VN"], platforms: ["TikTok"], category: "beauty", application_deadline: "2030-01-20T00:00:00.000Z" },
      { id: "earlier-first", markets: ["VN"], platforms: ["TikTok"], category: "beauty", application_deadline: futureDeadline },
      { id: "earlier-second", markets: ["VN"], platforms: ["TikTok"], category: "beauty", application_deadline: futureDeadline },
    ],
    new Date("2030-01-01T00:00:00.000Z"),
  );

  assert.deepEqual(ranked.map((campaign) => campaign.id), ["earlier-first", "earlier-second", "later", "no-deadline"]);
});

test("rejects duplicate applications and campaigns that are expired or not recruiting", () => {
  const recruiting = { id: "campaign-1", status: "recruiting" as const, application_deadline: futureDeadline };

  assert.throws(() => assertCampaignCanAcceptApplication(recruiting, "applied"), /already participates/i);
  assert.throws(
    () => assertCampaignCanAcceptApplication({ ...recruiting, application_deadline: "2029-12-31T23:59:59.000Z" }, null, new Date("2030-01-01T00:00:00.000Z")),
    /deadline/i,
  );
  assert.throws(() => assertCampaignCanAcceptApplication({ ...recruiting, status: "active" }, null), /recruiting/i);
});

test("creates invitations only while a recruiting campaign has an open slot and no existing participation", () => {
  const campaign = { id: "campaign-1", status: "recruiting" as const, application_deadline: futureDeadline, slots: 2 };
  const now = new Date("2030-01-01T00:00:00.000Z");

  assert.doesNotThrow(() => assertCampaignCanCreateInvitation(campaign, 1, null, now));
  assert.throws(() => assertCampaignCanCreateInvitation({ ...campaign, status: "active" }, 1, null, now), /recruiting/i);
  assert.throws(() => assertCampaignCanCreateInvitation(campaign, 2, null, now), /capacity/i);
  assert.throws(() => assertCampaignCanCreateInvitation(campaign, 0, "applied", now), /already participates/i);
});

test("converges an invitation response or an application after an invitation to matched", () => {
  assert.equal(resolveInvitationResponseStatus("invited", true), "matched");
  assert.equal(resolveApplicationStatus("invited"), "matched");
  assert.equal(resolveInvitationResponseStatus("invited", false), "cancelled");
});

test("allows only the campaign participation workflow transitions", () => {
  assert.equal(canTransitionParticipation("matched", "shipping"), true);
  assert.equal(canTransitionParticipation("matched", "completed"), false);
  assert.equal(canTransitionParticipation("cancelled", "matched"), false);
});
