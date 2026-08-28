import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("product and upload handlers resolve the selected partner workspace instead of the legacy designer", async () => {
  const routes = await Promise.all([
    source("../src/app/api/products/route.ts"),
    source("../src/app/api/products/[id]/route.ts"),
    source("../src/app/api/uploads/product-image/route.ts"),
  ]);
  for (const route of routes) {
    assert.match(route, /getSelectedPartnerForApi/);
    assert.doesNotMatch(route, /getApprovedDesignerForApi/);
  }
});

test("product client sends its fashion or beauty workspace type on every mutation and upload", async () => {
  const manager = await source("../src/components/ProductManager.tsx");
  assert.match(manager, /x-kmodu-workspace/);
  assert.match(manager, /x-kmodu-membership/);
  assert.match(manager, /mode === "beauty" \? "beauty_partner" : "fashion_partner"/);
});

test("product pages pass the server-selected membership to the client and APIs revalidate it", async () => {
  const [beautyPage, fashionPage, auth] = await Promise.all([
    source("../src/app/dashboard/beauty/products/page.tsx"),
    source("../src/app/dashboard/designer/products/page.tsx"),
    source("../src/lib/auth.ts"),
  ]);
  assert.match(beautyPage, /membershipId=\{workspace\?\.id \|\| ""\}/);
  assert.match(fashionPage, /membershipId=\{workspace\?\.id \|\| ""\}/);
  assert.match(auth, /request\.headers\.get\("x-kmodu-membership"\)/);
  assert.match(auth, /resolveUserWorkspace\(\{[\s\S]*membershipId/);
});

test("every beauty mutation route binds through the beauty membership guard", async () => {
  const routes = await Promise.all([
    source("../src/app/api/beauty/campaigns/route.ts"),
    source("../src/app/api/beauty/campaigns/[id]/route.ts"),
    source("../src/app/api/beauty/campaigns/[id]/status/route.ts"),
    source("../src/app/api/beauty/participations/[id]/route.ts"),
  ]);
  for (const route of routes) assert.match(route, /requireBeautyPartner\(\)/);
});
