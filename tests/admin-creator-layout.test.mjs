import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("admin creator management uses the desktop width needed by its operations table", async () => {
  const css = await readFile(new URL("../src/app/dashboard/designer/studio.css", import.meta.url), "utf8");

  assert.match(css, /\.admin-studio \.st-shell\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*1680px;/s);
});
