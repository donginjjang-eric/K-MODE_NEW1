import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import * as campaignDomain from "../src/lib/creator-campaigns";
import { createAdminCampaign, normalizeCampaignRewardText } from "../src/lib/creator-campaigns";
import { campaignEventMessageLabel, normalizeCampaignDeadlineForDatetimeLocal, participationNextActionLabel } from "../src/lib/admin-campaign";
import type { AdminCampaignInput } from "../src/lib/types";

const execFileAsync = promisify(execFile);
const tsxCli = resolve("node_modules/tsx/dist/cli.mjs");

async function runMockedRunner(path: string) {
  await execFileAsync(process.execPath, ["--experimental-test-module-mocks", tsxCli, "--test", path], { cwd: process.cwd() });
}

const validInput: AdminCampaignInput = {
  title: "Summer launch",
  category: "beauty",
  markets: ["KR"],
  platforms: ["Instagram"],
  brief: "Create one short-form campaign video.",
  reward_text: "KRW 300,000",
  application_deadline: "2026-09-01T00:00:00.000Z",
  content_deadline: "2026-09-15T00:00:00.000Z",
  slots: 3,
  image_urls: ["https://cdn.example.com/brief.png"],
};

test("rejects an admin campaign without its required campaign details", async () => {
  await assert.rejects(
    createAdminCampaign("admin-1", { ...validInput, title: "   " }),
    /title is required/i,
  );
});

test("rejects an admin campaign with invalid capacity, targeting, image URLs, or deadline order", async (t) => {
  const invalidInputs: Array<[string, AdminCampaignInput, RegExp]> = [
    ["slots", { ...validInput, slots: 0 }, /slots must be positive/i],
    ["markets", { ...validInput, markets: [] }, /market is required/i],
    ["platforms", { ...validInput, platforms: [] }, /platform is required/i],
    ["image URL", { ...validInput, image_urls: ["http://cdn.example.com/brief.png"] }, /HTTPS/i],
    ["deadlines", { ...validInput, application_deadline: validInput.content_deadline, content_deadline: validInput.application_deadline }, /application deadline.*content deadline/i],
  ];

  for (const [name, input, error] of invalidInputs) {
    await t.test(name, async () => {
      await assert.rejects(createAdminCampaign("admin-1", input), error);
    });
  }
});

test("requires both campaign deadlines", async (t) => {
  const invalidInputs: Array<[string, AdminCampaignInput]> = [
    ["application deadline", { ...validInput, application_deadline: "" }],
    ["content deadline", { ...validInput, content_deadline: "" }],
    ["null application deadline", { ...validInput, application_deadline: null } as unknown as AdminCampaignInput],
    ["null content deadline", { ...validInput, content_deadline: null } as unknown as AdminCampaignInput],
  ];

  for (const [name, input] of invalidInputs) {
    await t.test(name, async () => {
      await assert.rejects(createAdminCampaign("admin-1", input), /deadline is required/i);
    });
  }
});

test("normalizes campaign deadlines for datetime-local inputs without changing explicit local time", () => {
  const localDate = new Date(2026, 8, 1, 9, 30, 45);

  assert.equal(normalizeCampaignDeadlineForDatetimeLocal(localDate), "2026-09-01T09:30");
  assert.equal(normalizeCampaignDeadlineForDatetimeLocal("2026-09-01T09:30:45.123Z"), "2026-09-01T09:30");
  assert.equal(normalizeCampaignDeadlineForDatetimeLocal("2026-09-01T09:30:45.123456Z"), "2026-09-01T09:30");
  assert.equal(normalizeCampaignDeadlineForDatetimeLocal("2026-09-01T09:30:45+09:00"), "2026-09-01T09:30");
  assert.equal(normalizeCampaignDeadlineForDatetimeLocal("2026-09-01T09:30:45.123456+09:00"), "2026-09-01T09:30");

  for (const value of [null, undefined, "", "not-a-date", "2026-02-31T09:30:00Z", "2026-09-01T09:30invalid", "2026-09-01T09:30:45Zinvalid"]) {
    assert.equal(normalizeCampaignDeadlineForDatetimeLocal(value), "");
  }
});

test("localizes stored campaign operation messages while preserving admin notes", () => {
  assert.equal(participationNextActionLabel("Await campaign response"), "캠페인 응답 대기");
  assert.equal(participationNextActionLabel("Custom admin note"), "Custom admin note");
  assert.equal(campaignEventMessageLabel("Status changed to review."), "상태가 콘텐츠 검수로 변경되었습니다.");
  assert.equal(campaignEventMessageLabel("운영팀 확인 완료"), "운영팀 확인 완료");
});

test("accepts only canonical creator reward formats", () => {
  for (const reward of ["RM 420", "MYR 420", "VND 2,500,000", "USD 250", "TWD 8,000", "KRW 300,000"]) {
    assert.equal(normalizeCampaignRewardText(reward), reward);
  }
  for (const reward of ["420 RM", "$420", "₩300,000", "free products", "RM 4,20", "USD 12.50"]) {
    assert.throws(() => normalizeCampaignRewardText(reward), /currency code followed by a whole-number amount/i);
  }
});

test("only matched and active lifecycle statuses consume campaign capacity", () => {
  const consumesCapacity = (campaignDomain as typeof campaignDomain & {
    participationConsumesCampaignCapacity?: (status: string) => boolean;
  }).participationConsumesCampaignCapacity;

  assert.equal(typeof consumesCapacity, "function");
  for (const status of ["matched", "shipping", "creating", "review", "published", "settlement"]) {
    assert.equal(consumesCapacity?.(status), true, `${status} must consume a slot`);
  }
  for (const status of ["applied", "invited", "cancelled"]) {
    assert.equal(consumesCapacity?.(status), false, `${status} must not consume a slot`);
  }
});

test("completed participations remain occupied after lifecycle completion", () => {
  assert.equal(campaignDomain.participationConsumesCampaignCapacity("completed"), true);
});

test("runs transaction behavior checks without requiring flags on the documented command", async () => {
  await runMockedRunner("tests/admin-campaign-transaction-runner.mjs");
});

test("runs final locked-capacity and editability transaction checks", async () => {
  await runMockedRunner("tests/admin-campaign-final-fix-transaction-runner.mjs");
});
