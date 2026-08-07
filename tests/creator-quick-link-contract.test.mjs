import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("main quick links expose an accessible creator center destination", async () => {
  const html = await source("../index.html");

  assert.match(html, /<a\s+class="creator-quick-banner"\s+href="\/dashboard\/creator"\s+aria-label="크리에이터 센터 바로가기">/);
  assert.match(html, /<strong>크리에이터<br>센터<\/strong>/);
});

test("creator center quick link translates from one stable Korean source string", async () => {
  const i18n = await source("../site-i18n.js");

  assert.match(i18n, /'크리에이터 센터':\s*\['Trung tâm nhà sáng tạo',\s*'創作者中心',\s*'Creator Center'\]/);
  assert.match(i18n, /'크리에이터 센터 바로가기':\s*\['Đi đến Trung tâm nhà sáng tạo',\s*'前往創作者中心',\s*'Go to Creator Center'\]/);
});

test("creator quick link keeps the desktop and 390px mobile fixed-link stack clear", async () => {
  const css = await source("../platform.css");

  assert.match(css, /\.creator-quick-banner\s*{[^}]*position:\s*fixed;[^}]*right:\s*24px;[^}]*top:\s*calc\(50% \+ 66px\);/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)\s*{[^}]*body:has\(\.creator-quick-banner\)\s+\.studio-quick-banner:not\(\.creator-quick-banner\):not\(\.kakao-quick-banner\)\s*{[^}]*bottom:\s*152px\s*!important;[^}]*}[\s\S]*?\.creator-quick-banner\s*{[^}]*right:\s*12px;[^}]*bottom:\s*88px;[^}]*max-width:\s*calc\(100vw - 24px\);[^}]*box-sizing:\s*border-box;/s);
});

test("main page ships the creator quick-link styles it needs without loading the global platform stylesheet", async () => {
  const html = await source("../index.html");

  assert.match(html, /\.creator-quick-banner\s*{[^}]*position:\s*fixed;[^}]*top:\s*calc\(50% \+ 66px\);/s);
  assert.match(html, /\.creator-quick-banner\s*{[^}]*bottom:\s*88px;[^}]*max-width:\s*calc\(100vw - 24px\);/s);
  assert.doesNotMatch(html, /<link[^>]+href=["'][^"']*platform\.css/i);
});

test("creator quick link is centered between the desktop links and resets that transform on mobile", async () => {
  const [html, css] = await Promise.all([
    source("../index.html"),
    source("../platform.css"),
  ]);

  for (const sourceText of [html, css]) {
    assert.match(sourceText, /\.creator-quick-banner\s*{[^}]*top:\s*calc\(50% \+ 66px\);[^}]*transform:\s*translateY\(-50%\);/s);
    assert.match(sourceText, /\.creator-quick-banner:hover\s*{[^}]*transform:\s*translateY\(-50%\)\s+translateX\(-2px\);/s);
    assert.match(sourceText, /\.studio-quick-banner:not\(\.creator-quick-banner\):not\(\.kakao-quick-banner\)\s*{[^}]*bottom:\s*152px\s*!important;/s);
    assert.match(sourceText, /\.creator-quick-banner\s*{[^}]*top:\s*auto;[^}]*bottom:\s*88px;[^}]*transform:\s*none;/s);
  }
});

test("modal and sheet states hide the creator quick link with the existing fixed links", async () => {
  const [html, css] = await Promise.all([
    source("../index.html"),
    source("../platform.css"),
  ]);

  assert.match(html, /body:has\(\.modal\.is-open\)\s+\.creator-quick-banner/);
  assert.match(css, /body\.proposal-open\s+\.creator-quick-banner\s*{\s*opacity:\s*0;\s*pointer-events:\s*none;\s*}/);
  assert.match(css, /body\.sheet-open\s+\.creator-quick-banner\s*{\s*opacity:\s*0;\s*pointer-events:\s*none;\s*}/);
});
