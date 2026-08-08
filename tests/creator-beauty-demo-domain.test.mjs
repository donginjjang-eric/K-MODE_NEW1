import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("creator beauty demo domain seeds the four overseas campaign stages transactionally", async () => {
  const domain = await source("../src/lib/creator-demo.ts");

  assert.match(domain, /export async function seedCreatorBeautyDemo\(adminUserId: string, creatorAccountId: string\)/);
  assert.match(domain, /export async function resetCreatorBeautyDemo\(adminUserId: string, creatorAccountId: string\)/);
  assert.match(domain, /demo-beauty-serum-recruiting/);
  assert.match(domain, /demo-beauty-cream-invited/);
  assert.match(domain, /demo-beauty-suncushion-review/);
  assert.match(domain, /demo-beauty-liptint-completed/);
  assert.match(domain, /withDatabaseTransaction/);
  assert.match(domain, /ON CONFLICT/);
  assert.match(domain, /DELETE FROM campaigns WHERE id = ANY/);
});

test("demo domain keeps Korean supplier and overseas creator currencies visible", async () => {
  const domain = await source("../src/lib/creator-demo.ts");

  assert.match(domain, /\[DEMO\]/);
  assert.match(domain, /Malaysia/);
  assert.match(domain, /Vietnam/);
  assert.match(domain, /MYR/);
  assert.match(domain, /RM 420/);
  assert.match(domain, /VND 2,500,000/);
  assert.match(domain, /currency: "MYR"/);
  assert.match(domain, /settlementStatus: "paid"/);
});

test("demo domain records the completed campaign performance contract", async () => {
  const domain = await source("../src/lib/creator-demo.ts");

  assert.match(domain, /views:\s*184200/);
  assert.match(domain, /likes:\s*12740/);
  assert.match(domain, /comments:\s*386/);
  assert.match(domain, /orders:\s*86/);
  assert.match(domain, /revenue:\s*12900/);
  assert.match(domain, /INSERT INTO content_submissions/);
  assert.match(domain, /INSERT INTO campaign_events/);
  assert.match(domain, /INSERT INTO campaign_performance/);
});

test("seed and reset require the admin-owned creator identity", async () => {
  const domain = await source("../src/lib/creator-demo.ts");

  assert.match(domain, /role = 'admin'/);
  assert.match(domain, /creator_accounts WHERE id = \$1 AND user_id = \$2/);
  assert.match(domain, /approval_status = 'approved'/);
  assert.match(domain, /owner_id = \$1/);
});

test("demo campaign slots reject collisions with non-demo or other-owner records", async () => {
  const domain = await source("../src/lib/creator-demo.ts");

  assert.match(domain, /title LIKE '\[DEMO\]%'/);
  assert.match(domain, /owner_id !== adminUserId/);
  assert.match(domain, /Demo campaign ID collision/);
});
