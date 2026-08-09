import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("creator performance persistence scopes updates to the owning creator and published-or-later missions", async () => {
  const db = await source("../src/lib/db.ts");

  assert.match(db, /export async function upsertCampaignPerformance\(creatorId: string, participationId: string, input:/);
  assert.match(db, /campaign_participations WHERE id = \$1 AND creator_account_id = \$2 FOR UPDATE/);
  assert.match(db, /participation\.status !== "published" && participation\.status !== "settlement" && participation\.status !== "completed"/);
  assert.match(db, /INSERT INTO campaign_performance/);
  assert.match(db, /ON CONFLICT \(participation_id\) DO UPDATE/);
});

test("performance accepts only non-negative integer engagement values, non-negative revenue, and supported currencies", async () => {
  const db = await source("../src/lib/db.ts");

  assert.match(db, /Number\.isInteger\(value\) \|\| value < 0/);
  assert.match(db, /typeof input\.revenue !== "number" \|\| !Number\.isFinite\(input\.revenue\) \|\| input\.revenue < 0/);
  assert.match(db, /const CREATOR_PERFORMANCE_CURRENCIES = \["KRW", "USD", "VND", "TWD", "MYR"\] as const/);
  assert.match(db, /CREATOR_PERFORMANCE_CURRENCIES\.includes\(input\.currency/);
});

test("creator performance API authenticates the creator and cannot accept a settlement status update", async () => {
  const route = await source("../src/app/api/creator/participations/[id]/performance/route.ts");

  assert.match(route, /getApprovedCreatorForApi\(\)/);
  assert.match(route, /upsertCampaignPerformance\(auth\.creator\.id, participationId/);
  assert.match(route, /status: 400/);
  assert.match(route, /status: 404/);
  assert.match(route, /status: 409/);
  assert.doesNotMatch(route, /settlementStatus|settlement_status|paid/);
});

test("settlement and profile pages keep monetary totals grouped by currency and profile fields read-only", async () => {
  const [db, settlement, profile, form] = await Promise.all([
    source("../src/lib/db.ts"),
    source("../src/app/dashboard/creator/settlement/page.tsx"),
    source("../src/app/dashboard/creator/profile/page.tsx"),
    source("../src/components/CreatorPerformanceForm.tsx"),
  ]);

  assert.match(db, /export async function getCreatorSettlementSummary\(creatorId: string\)/);
  assert.match(db, /summarizeCreatorSettlementRewards/);
  assert.match(db, /p\.expected_reward/);
  const settlementFunction = db.slice(db.indexOf("export async function getCreatorSettlementSummary"), db.indexOf("export async function getCreatorSubmissionWorkspace"));
  assert.doesNotMatch(settlementFunction, /performance\.revenue/);
  assert.match(settlement, /requireApprovedCreator\(\)/);
  assert.match(settlement, /getCreatorSettlementSummary\(creator\.id\)/);
  assert.match(settlement, /expected/);
  assert.match(settlement, /pending/);
  assert.match(settlement, /confirmed/);
  assert.match(settlement, /paid/);
  assert.match(profile, /requireApprovedCreator\(\)/);
  assert.match(profile, /creator\.display_name/);
  assert.match(profile, /creator\.platform/);
  assert.match(profile, /creator\.market/);
  assert.match(profile, /creator\.categories/);
  assert.match(profile, /creator\.google_email/);
  assert.match(profile, /creator\.approval_status/);
  assert.doesNotMatch(profile, /<input|<textarea|<form/);
  assert.match(form, /\/performance/);
});

test("published-or-later mission detail pages expose the performance form", async () => {
  const detail = await source("../src/app/dashboard/creator/my-campaigns/[id]/page.tsx");

  assert.match(detail, /import CreatorPerformanceForm from "@\/components\/CreatorPerformanceForm"/);
  assert.match(detail, /const canReportPerformance = participation\.status === "published" \|\| participation\.status === "settlement" \|\| participation\.status === "completed"/);
  assert.match(detail, /canReportPerformance \? <section className="creator-detail-panel creator-detail-work">/);
  assert.match(detail, /<CreatorPerformanceForm participationId=\{participation\.id\} \/>/);
});
