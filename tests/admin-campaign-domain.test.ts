import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import { createAdminCampaign } from "../src/lib/creator-campaigns";
import type { AdminCampaignInput } from "../src/lib/types";

const execFileAsync = promisify(execFile);

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

test("runs transaction behavior checks without requiring flags on the documented command", async () => {
  if (process.platform === "win32") {
    await execFileAsync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", "npx.cmd tsx --experimental-test-module-mocks --test tests\\admin-campaign-transaction-runner.mjs"],
      { cwd: process.cwd() },
    );
    return;
  }

  await execFileAsync(
    "npx",
    ["tsx", "--experimental-test-module-mocks", "--test", "tests/admin-campaign-transaction-runner.mjs"],
    { cwd: process.cwd() },
  );
});
