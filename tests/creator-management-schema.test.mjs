import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("크리에이터 관리 스키마와 agency 역할을 선언한다", async () => {
  const [schema, types] = await Promise.all([
    readFile(new URL("../db/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/types.ts", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /CHECK \(role IN \('admin', 'designer', 'creator', 'agency'\)\)/);
  assert.match(schema, /ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS onboarding_source TEXT NOT NULL DEFAULT 'self_registered'/);
  assert.match(schema, /ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS claim_state TEXT NOT NULL DEFAULT 'claimed'/);
  assert.match(schema, /ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS instagram_followers BIGINT NOT NULL DEFAULT 0 CHECK \(instagram_followers >= 0\)/);
  assert.match(schema, /ALTER TABLE creator_accounts ADD COLUMN IF NOT EXISTS tiktok_followers BIGINT NOT NULL DEFAULT 0 CHECK \(tiktok_followers >= 0\)/);

  for (const table of [
    "creator_management_groups",
    "creator_management_group_members",
    "creator_management_group_users",
    "creator_management_audit_logs",
  ]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }

  assert.match(schema, /creator_account_id text NOT NULL REFERENCES creator_accounts\(id\) ON DELETE CASCADE/);
  assert.match(schema, /UNIQUE \(creator_account_id\)/);
  assert.match(schema, /metadata jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
  assert.match(schema, /ON creator_management_group_users\(group_id, lower\(invited_email\)\)/);
  assert.match(schema, /ON creator_management_audit_logs\(group_id, created_at DESC\)/);

  assert.match(types, /export type Role = "admin" \| "designer" \| "creator" \| "agency";/);
  assert.match(types, /export type CreatorOnboardingSource = "self_registered" \| "admin";/);
  assert.match(types, /export type CreatorClaimState = "unclaimed" \| "claimed";/);
  assert.match(types, /onboarding_source: CreatorOnboardingSource;/);
  assert.match(types, /created_by_admin_id: string \| null;/);
  assert.match(types, /followers_verified_at: string \| null;/);
});
