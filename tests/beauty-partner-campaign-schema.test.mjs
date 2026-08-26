import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");
const execFileAsync = promisify(execFile);

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

test("campaign schema prevents future designer campaign and product ownership mismatches without rejecting legacy rows", async () => {
  const schema = await source("../db/schema.sql");

  assert.match(schema, /UPDATE campaigns campaign[\s\S]*SET product_id = NULL[\s\S]*campaign\.owner_type = 'designer'/);
  assert.match(schema, /CREATE OR REPLACE FUNCTION enforce_campaign_product_designer_match/);
  assert.match(schema, /NEW\.owner_type = 'designer'[\s\S]*NEW\.product_id IS NOT NULL/);
  assert.match(schema, /product\.id = NEW\.product_id[\s\S]*product\.designer_id = NEW\.designer_id/);
  assert.match(schema, /ERRCODE = '23514'/);
  assert.match(schema, /CREATE TRIGGER campaigns_product_designer_match_trigger/);
  assert.match(schema, /CREATE OR REPLACE FUNCTION enforce_product_campaign_designer_match/);
  assert.match(schema, /NEW\.designer_id IS DISTINCT FROM OLD\.designer_id[\s\S]*campaign\.product_id = OLD\.id/);
  assert.match(schema, /CREATE TRIGGER products_campaign_designer_match_trigger/);
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

test("production startup and manual setup apply the single schema source through required transactional validation", async () => {
  const [startup, setup] = await Promise.all([
    source("../scripts/ensure-schema.mjs"),
    source("../scripts/db-setup.mjs"),
  ]);
  for (const script of [startup, setup]) {
    assert.match(script, /readFileSync\(path\.join\(root, "db", "schema\.sql"\), "utf8"\)/);
    assert.match(script, /applyRequiredSchema\(pool, schema\)/);
  }
});

test("schema migration is rerunnable and fails validation inside a transaction", async () => {
  await execFileAsync(process.execPath, ["tests/schema-bootstrap-transaction-runner.mjs"], { cwd: process.cwd() });
});

test("configured production startup exits nonzero when required schema bootstrap fails", async () => {
  const result = await execFileAsync(
    process.execPath,
    ["--experimental-test-module-mocks", "tests/schema-startup-failure-runner.mjs"],
    { cwd: process.cwd() },
  ).then(
    () => ({ code: 0 }),
    (error) => ({ code: typeof error.code === "number" ? error.code : -1 }),
  );

  assert.notEqual(result.code, 0);
});

test("optional startup synchronization failures do not undo a validated required schema", async () => {
  await execFileAsync(
    process.execPath,
    ["--experimental-test-module-mocks", "tests/schema-startup-optional-runner.mjs"],
    { cwd: process.cwd() },
  );
});
