import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const globals = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const creator = readFileSync(path.join(root, "src/app/dashboard/creator/creator.css"), "utf8");

if (!/\.site-shell:has\(\.creator-center\)\s*>\s*\.top-nav\s*{[^}]*position:\s*relative/s.test(globals)) {
  throw new Error("Creator routes must disable the global sticky top navigation.");
}

if (!/\.creator-admin-preview\s*{[^}]*position:\s*relative/s.test(creator)) {
  throw new Error("The admin preview bar must scroll normally instead of covering creator navigation.");
}

console.log("[creator-sticky-layout] OK");
