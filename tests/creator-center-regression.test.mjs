import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

async function readSource(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function normalizedHash(source) {
  return createHash("sha256").update(source.replaceAll("\r\n", "\n")).digest("hex");
}

async function collectSourceFiles(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(relativePath);
    return /\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [relativePath] : [];
  }));
  return files.flat();
}

test("designer studio shell remains isolated from creator center work", async () => {
  const studioNav = await readSource("src/components/StudioNav.tsx");
  const designerLayout = await readSource("src/app/dashboard/designer/layout.tsx");

  assert.equal(
    normalizedHash(studioNav),
    "534c66c1994d75891efe74dd7100e3e12ace1aba04027c8044627fa6dee34f0b",
    "StudioNav.tsx changed; verify the existing designer studio before accepting a new hash",
  );
  assert.equal(
    normalizedHash(designerLayout),
    "0f052836beb3bc9374939ff2d022148e5a09e6e8ff0167eb6dc7586408569de7",
    "designer/layout.tsx changed; verify the existing designer studio before accepting a new hash",
  );
});

test("designer studio navigation destinations remain unchanged", async () => {
  const studioNav = await readSource("src/components/StudioNav.tsx");
  const destinations = [...studioNav.matchAll(/href:\s*"(\/dashboard\/designer(?:\/[^"]+)?)"/g)]
    .map((match) => match[1]);

  assert.deepEqual(destinations, [
    "/dashboard/designer/brand",
    "/dashboard/designer/products",
    "/dashboard/designer/generated-looks",
    "/dashboard/designer/lookbooks",
    "/dashboard/designer/short",
    "/dashboard/designer/orders",
    "/dashboard/designer",
  ]);
});

test("creator center source does not import designer studio components", async () => {
  const creatorFiles = [
    ...await collectSourceFiles("src/app/dashboard/creator"),
    ...await collectSourceFiles("src/app/api/creator"),
    ...await collectSourceFiles("src/lib"),
    ...await collectSourceFiles("src/components"),
  ].filter((relativePath) =>
    relativePath.includes(`${path.sep}creator${path.sep}`)
      || /(?:^|[\\/])Creator[^\\/]*\.(?:ts|tsx|js|jsx|mjs)$/.test(relativePath)
      || /(?:^|[\\/])creator[^\\/]*\.(?:ts|tsx|js|jsx|mjs)$/i.test(relativePath),
  );

  const forbiddenImports = [];
  for (const relativePath of creatorFiles) {
    const source = await readSource(relativePath);
    for (const match of source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)) {
      if (/StudioNav|(?:^|\/)designer(?:\/|$)|Designer[A-Z]/.test(match[1])) {
        forbiddenImports.push(`${relativePath}: ${match[1]}`);
      }
    }
  }

  assert.deepEqual(forbiddenImports, [], "creator center imports designer studio code");
});
