import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("approved creator authentication exposes guarded, email-linked Google login boundaries", async () => {
  const [types, db, auth, callback] = await Promise.all([
    source("../src/lib/types.ts"),
    source("../src/lib/db.ts"),
    source("../src/lib/auth.ts"),
    source("../src/app/api/auth/google/callback/route.ts"),
  ]);

  assert.match(types, /Role\s*=\s*"admin"\s*\|\s*"designer"\s*\|\s*"creator"/);
  assert.match(db, /export async function getCreatorAccountForUser\(userId: string\)/);
  assert.match(db, /export async function getCreatorAccountByEmail\(email: string\)/);
  assert.match(db, /email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(db, /creator_accounts\s+WHERE user_id = \$1/);
  assert.match(db, /lower\(google_email\) = \$1/);

  assert.match(auth, /export async function requireApprovedCreator\(\)/);
  assert.match(auth, /export async function getApprovedCreatorForApi\(\)/);
  assert.match(auth, /getCreatorAccountForUser\(user\.id\)/);
  assert.match(auth, /creator\.approval_status !== "approved"/);

  assert.match(callback, /getCreatorAccountByEmail\(email\)/);
  assert.match(callback, /linkCreatorAccountToUser\(creator\.id, user\.id\)/);
  assert.match(callback, /updateUserRole\(user\.id, "creator"\)/);
  assert.match(callback, /dest \|\| "\/dashboard\/creator"/);
});
