import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("all four workspaces use one account card with logout", async () => {
  const [card, admin, creator, fashion, beauty] = await Promise.all([
    readFile(new URL("../src/components/WorkspaceAccountCard.tsx", import.meta.url), "utf8").catch(() => ""),
    readFile(new URL("../src/components/AdminNav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/CreatorNav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/StudioNav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/BeautyPartnerNav.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(card, /workspace-account-card/);
  assert.match(card, /<LogoutButton/);
  for (const source of [admin, creator, fashion, beauty]) {
    assert.match(source, /<WorkspaceAccountCard/);
  }
});

test("workspace account cards clearly identify the active center", async () => {
  const [admin, creator, fashion, beauty] = await Promise.all([
    readFile(new URL("../src/components/AdminNav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/CreatorNav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/StudioNav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/BeautyPartnerNav.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(admin, /centerLabel="관리자 콘솔"/);
  assert.match(creator, /centerLabel="크리에이터 센터"/);
  assert.match(fashion, /centerLabel="패션 브랜드 센터"/);
  assert.match(beauty, /centerLabel="뷰티 브랜드 센터"/);
});

test("master preview sidebars keep the account card inside the viewport", async () => {
  const [creatorCss, studioCss, beautyCss] = await Promise.all([
    readFile(new URL("../src/app/dashboard/creator/creator.css", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dashboard/designer/studio.css", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dashboard/beauty/beauty.css", import.meta.url), "utf8"),
  ]);

  assert.match(creatorCss, /creator-center:has\(\.master-workspace-bar\).*creator-rail/);
  assert.match(studioCss, /studio:has\(> \.master-workspace-bar\).*st-side/);
  assert.match(beautyCss, /beauty-partner:has\(> \.master-workspace-bar\).*beauty-side/);
});
