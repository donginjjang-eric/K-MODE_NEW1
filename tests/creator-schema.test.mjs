import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("creator campaign schema is idempotent and role aware", async () => {
  const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  for (const table of ["creator_accounts", "campaigns", "campaign_participations", "content_submissions", "campaign_events", "campaign_performance"]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(sql, /role IN \('admin', 'designer', 'creator'\)/);
  assert.match(sql, /UNIQUE \(campaign_id, creator_account_id\)/);
});
