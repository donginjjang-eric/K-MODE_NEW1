import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workspace schema supports independent creator fashion beauty and admin memberships", async () => {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

  assert.match(schema, /CREATE TABLE IF NOT EXISTS user_workspace_memberships/);
  assert.match(schema, /workspace_type IN \('admin', 'creator', 'fashion_partner', 'beauty_partner', 'agency'\)/);
  assert.match(schema, /UNIQUE NULLS NOT DISTINCT \(user_id, workspace_type, resource_id\)/);
  assert.match(schema, /user_workspace_memberships_user_status_idx/);
  assert.match(schema, /user_workspace_memberships_resource_idx/);
});

test("workspace schema backfills every legacy capability without replacing another one", async () => {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

  for (const source of ["users", "creator_accounts", "designers", "creator_management_group_users"]) {
    assert.match(schema, new RegExp(`INSERT INTO user_workspace_memberships[\\s\\S]*FROM ${source}`));
  }
  const designerBackfill = schema.match(
    /INSERT INTO user_workspace_memberships[\s\S]*?FROM designers[\s\S]*?ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING/,
  )?.[0] ?? "";
  assert.match(designerBackfill, /SELECT 'fashion_partner'[\s\S]*?WHERE[^;]*'복합'/);
  assert.match(designerBackfill, /SELECT 'fashion_partner'[\s\S]*?WHERE[^;]*'미분류'/);
  assert.match(designerBackfill, /SELECT 'beauty_partner'[\s\S]*?WHERE[^;]*'복합'/);
  assert.match(schema, /ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING/);
});

test("workspace backfill never overwrites any existing membership state", async () => {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  const domain = await readFile(new URL("../src/lib/workspace-access.ts", import.meta.url), "utf8");
  const schemaConflicts = schema.match(/ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING/g) ?? [];
  const runtimeConflicts = domain.match(/ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING/g) ?? [];
  const runtimeInserts = domain.match(/INSERT INTO user_workspace_memberships/g) ?? [];

  assert.equal(schemaConflicts.length, 4);
  assert.equal(runtimeConflicts.length, runtimeInserts.length);
  assert.ok(runtimeConflicts.length >= 4);
  assert.doesNotMatch(schema, /ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO UPDATE/);
  assert.doesNotMatch(domain, /ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO UPDATE/);
});

test("partner workspace query joins only a designer owned by the membership user", async () => {
  const source = await readFile(new URL("../src/lib/workspace-access.ts", import.meta.url), "utf8");

  assert.match(source, /designers\.user_id = memberships\.user_id/);
  assert.match(source, /designers\.user_id AS designer_user_id/);
});
