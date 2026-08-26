import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { parseBeautyCampaignCreateInput, parseBeautyCampaignPatchInput } from "../src/lib/beauty-campaign-input";
import { canTransitionCampaignStatus } from "../src/lib/creator-campaigns";

const execFileAsync = promisify(execFile);
const tsxCli = resolve("node_modules/tsx/dist/cli.mjs");

const validCampaign = {
  product_id: "product-1",
  title: "Glow launch",
  category: "beauty",
  markets: ["한국"],
  platforms: ["Instagram"],
  brief: "Create one short-form review.",
  reward_text: "KRW 300,000",
  application_deadline: "2026-09-01T00:00:00.000Z",
  content_deadline: "2026-09-15T00:00:00.000Z",
  slots: 3,
  image_urls: [],
};

test("beauty campaign input requires one explicit owned-product reference", () => {
  assert.deepEqual(parseBeautyCampaignCreateInput(validCampaign), validCampaign);
  assert.equal(parseBeautyCampaignCreateInput({ ...validCampaign, product_id: "" }), null);
  const { product_id: _productId, ...withoutProduct } = validCampaign;
  assert.equal(parseBeautyCampaignCreateInput(withoutProduct), null);
  assert.equal(parseBeautyCampaignCreateInput({ ...validCampaign, designer_id: "designer-other" }), null);
  assert.deepEqual(parseBeautyCampaignPatchInput({ title: "Updated", product_id: "product-2" }), { title: "Updated", product_id: "product-2" });
});

test("beauty campaign lifecycle reuses the existing one-way campaign state machine", () => {
  assert.equal(canTransitionCampaignStatus("draft", "recruiting"), true);
  assert.equal(canTransitionCampaignStatus("recruiting", "active"), true);
  assert.equal(canTransitionCampaignStatus("active", "closed"), true);
  assert.equal(canTransitionCampaignStatus("closed", "recruiting"), false);
  assert.equal(canTransitionCampaignStatus("active", "draft"), false);
});

test("owner-scoped campaign transactions reject foreign products and foreign campaign records", async () => {
  await execFileAsync(process.execPath, ["--experimental-test-module-mocks", tsxCli, "--test", "tests/beauty-partner-campaign-transaction-runner.mjs"], { cwd: process.cwd() });
});
