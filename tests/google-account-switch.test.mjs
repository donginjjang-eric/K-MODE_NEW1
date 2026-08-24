import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8").catch(() => "");

test("Google account switch clears the existing K-MODU session before restarting OAuth", async () => {
  const [route, login] = await Promise.all([
    source("../src/app/api/auth/google/switch/route.ts"),
    source("../src/components/LoginForm.tsx"),
  ]);

  assert.match(route, /cookieStore\.delete\(sessionCookieName\)/);
  assert.match(route, /\/api\/auth\/google/);
  assert.match(login, /다른 Google 계정으로 전환/);
  assert.match(login, /action="\/api\/auth\/google\/switch"/);
});
