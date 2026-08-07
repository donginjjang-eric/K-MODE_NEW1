import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("creator center shell is guarded, isolated, and exposes its campaign navigation", async () => {
  const [layout, nav, css] = await Promise.all([
    source("../src/app/dashboard/creator/layout.tsx"),
    source("../src/components/CreatorNav.tsx"),
    source("../src/app/dashboard/creator/creator.css"),
  ]);

  assert.match(layout, /import "\.\/creator\.css"/);
  assert.match(layout, /requireApprovedCreator\(\)/);
  assert.match(layout, /CreatorSideNav/);
  assert.match(layout, /CreatorTabBar/);
  assert.match(layout, /creator=\{creator\}/);
  assert.match(layout, /user=\{user\}/);
  assert.doesNotMatch(layout, /dashboard\/designer|StudioNav/);

  for (const href of [
    "/dashboard/creator",
    "/dashboard/creator/campaigns",
    "/dashboard/creator/my-campaigns",
    "/dashboard/creator/submissions",
    "/dashboard/creator/settlement",
    "/dashboard/creator/profile",
  ]) {
    assert.match(nav, new RegExp(`href:\\s*["']${href}["']`));
  }
  assert.match(nav, /export function CreatorSideNav/);
  assert.match(nav, /export function CreatorTabBar/);
  assert.match(nav, /className="creator-mobile-nav"/);
  assert.match(nav, /CREATOR_NAV\.slice\(0, 5\)/);
  assert.doesNotMatch(nav, /dashboard\/designer|StudioNav/);

  assert.match(css, /\.creator-center/);
  assert.match(css, /--creator-cream:/);
  assert.match(css, /--creator-ivory:/);
  assert.match(css, /--creator-black:/);
  assert.match(css, /--creator-muted-gold:/);
  assert.match(css, /--creator-teal:/);
  assert.match(css, /\.creator-center\s+\.creator-rail/);
  assert.match(css, /\.creator-center\s+\.creator-mobile-top/);
  assert.match(css, /\.creator-center\s+\.creator-mobile-nav/);
  assert.doesNotMatch(css, /(^|\n)\s*(?:body|html|:root)\s*[{,]/);
});
