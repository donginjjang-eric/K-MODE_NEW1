import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function pageFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? pageFiles(full) : entry.name === "page.tsx" ? [full] : [];
  }));
  return nested.flat();
}

test("every designer studio page resolves the selected fashion workspace", async () => {
  const files = await pageFiles(path.join(process.cwd(), "src/app/dashboard/designer"));
  assert.ok(files.length >= 7);
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.match(source, /requireFashionPartner\(\)/, path.relative(process.cwd(), file));
    assert.doesNotMatch(source, /requireApprovedDesigner\(/, path.relative(process.cwd(), file));
  }
});
