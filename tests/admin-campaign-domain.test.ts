import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import * as campaignDomain from "../src/lib/creator-campaigns";
import { createAdminCampaign } from "../src/lib/creator-campaigns";
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
  reward_text: "₩300,000",
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
