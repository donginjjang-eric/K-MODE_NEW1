import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("admin member query joins both creator and designer membership", async () => {
  const db = await readFile(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  assert.match(db, /creator_match\.id AS creator_id/);
  assert.match(db, /FROM creator_accounts/);
  assert.match(db, /lower\(creator_accounts\.google_email\) = lower\(users\.email\)/);
});
