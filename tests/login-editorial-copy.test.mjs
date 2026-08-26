import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("login editorial uses the approved K-beauty and K-fashion message", async () => {
  const component = await readFile(new URL("../src/components/LoginEditorialPanel.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../src/app/login/page.tsx", import.meta.url), "utf8");
  const i18n = await readFile(new URL("../site-i18n.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(component, /K-beauty, K-fashion/);
  assert.match(component, /세계를 향합니다/);
  assert.match(i18n, /'K-beauty, K-fashion':\s*\[[^\]]*'K-BEAUTY, K-FASHION\.'/s);
  assert.match(i18n, /'세계를 향합니다':\s*\[[^\]]*'TOWARD THE WORLD\.'/s);
  assert.match(component, /className="login-editorial-line"/);
  assert.match(css, /\.login-editorial-line\s*\{[^}]*white-space:\s*nowrap;/s);
  assert.match(component, /\/assets\/login-kbeauty-global-v1\.webp/);
  assert.match(component, /K-MODU \/ GLOBAL CREATOR NETWORK/);
  assert.match(component, /K-뷰티와 K-패션을 글로벌 크리에이터의 콘텐츠와 영향력으로 연결합니다\./);
  assert.match(component, />K-BEAUTY</);
  assert.match(component, />K-FASHION</);
  assert.match(component, />GLOBAL CREATORS</);
  assert.doesNotMatch(component, /DESIGNER STUDIO|AI LOOKBOOK|DIGITAL SHOWROOM|디자이너 브랜드의 룩북/);
  assert.match(page, /K-MODU 글로벌 파트너 시작/);
  assert.match(page, /K-뷰티·K-패션과 글로벌 크리에이터를 연결합니다\./);
});
