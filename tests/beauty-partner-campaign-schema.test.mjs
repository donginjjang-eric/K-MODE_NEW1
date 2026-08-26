import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("campaign schema adds designer ownership and product linkage without removing the admin owner reference", async () => {
  const schema = await source("../db/schema.sql");

  assert.match(schema, /owner_type text NOT NULL DEFAULT 'admin' CHECK \(owner_type IN \('admin', 'designer'\)\)/);
  assert.match(schema, /owner_id text NOT NULL REFERENCES users\(id\) ON DELETE RESTRICT/);
  assert.match(schema, /designer_id text REFERENCES designers\(id\) ON DELETE RESTRICT/);
  assert.match(schema, /product_id text REFERENCES products\(id\) ON DELETE SET NULL/);
  assert.match(schema, /campaigns_designer_owner_check/);
  assert.match(schema, /campaigns_designer_owner_idx[\s\S]*owner_type, designer_id, created_at DESC/);
  assert.match(schema, /campaigns_product_idx[\s\S]*product_id/);
  assert.doesNotMatch(schema, /DROP CONSTRAINT IF EXISTS campaigns_owner_id_fkey/);
});

test("admin campaign reads and mutations remain isolated to admin-owned rows", async () => {
  const domain = await source("../src/lib/creator-campaigns.ts");

  assert.match(domain, /listAdminCampaigns[\s\S]*c\.owner_type = 'admin'/);
  assert.match(domain, /getAdminCampaign[\s\S]*owner_type = 'admin'/);
  for (const functionName of ["updateAdminCampaign", "setAdminCampaignStatus", "transitionParticipationAsAdmin", "createCampaignInvitation"]) {
    const operation = domain.match(new RegExp(`export async function ${functionName}[\\s\\S]*?(?=\\nexport async function|\\n$)`));
    assert.ok(operation, `${functionName} must exist`);
    assert.match(operation[0], /owner_type\s*=\s*'admin'/, `${functionName} must reject designer campaigns`);
  }
});

test("production startup continues applying the single idempotent schema source", async () => {
  const [startup, setup] = await Promise.all([
    source("../scripts/ensure-schema.mjs"),
    source("../scripts/db-setup.mjs"),
  ]);
  for (const script of [startup, setup]) {
    assert.match(script, /readFileSync\(path\.join\(root, "db", "schema\.sql"\), "utf8"\)/);
    assert.match(script, /pool\.query\(schema\)/);
  }
});
