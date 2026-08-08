import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const i18n = await readFile(new URL('../site-i18n.js', import.meta.url), 'utf8');

test('Malay is the first translated locale after Korean', () => {
  assert.match(i18n, /'ms-MY':\s*\{\s*short:\s*'MY',\s*flag:\s*'my'/);
  assert.match(i18n, /const ORDER = \['ko-KR', 'ms-MY', 'vi-VN', 'zh-TW', 'en-US'\]/);
});

test('Malay translations cover shared navigation and primary public pages', () => {
  assert.match(i18n, /const MALAY = Object\.freeze\(\s*\{/);
  assert.match(i18n, /["']소개["']:\s*["']Pengenalan["']/);
  assert.match(i18n, /["']뷰티["']:\s*["']Kecantikan["']/);
  assert.match(i18n, /["']디자이너["']:\s*["']Pereka["']/);
  assert.match(i18n, /["']크리에이터["']:\s*["']Pencipta["']/);
  assert.match(i18n, /["']제품 둘러보기["']:\s*["']Terokai produk["']/);
  assert.match(i18n, /["']추천 캠페인["']:\s*["']Kempen disyorkan["']/);
  assert.match(i18n, /["']디자이너 스튜디오["']:\s*["']Studio Pereka["']/);
  assert.match(i18n, /targetLocale === 'ms-MY'\) return MALAY\[lookupSource\] \|\| source/);
});

test('Malay dynamic listing counts are translated', () => {
  assert.match(i18n, /targetLocale === 'ms-MY'\) return `Jumlah \$\{match\[1\]\} pencipta`/);
  assert.match(i18n, /targetLocale === 'ms-MY'\) return `\$\{match\[1\]\} dipilih`/);
  assert.match(i18n, /targetLocale === 'ms-MY'\) return `Jumlah \$\{match\[1\]\} jenama`/);
});

test('first visit detects a supported browser language while saved choice wins', () => {
  assert.match(i18n, /function detectBrowserLocale\(\)/);
  assert.match(i18n, /startsWith\('ms'\).*'ms-MY'/s);
  assert.match(i18n, /localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(i18n, /return detectBrowserLocale\(\) \|\| DEFAULT_LOCALE/);
});
