import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const file = new URL('../site-i18n.js', import.meta.url);
let source = await readFile(file, 'utf8');

if (source.includes("'ms-MY':")) {
  throw new Error('Malay locale already exists');
}

const entries = [];
for (const line of source.split(/\r?\n/)) {
  const match = line.match(/^\s{4}('(?:[^'\\]|\\.)*'):\s*(\[[\s\S]*\]),?\s*$/);
  if (!match) continue;
  const key = vm.runInNewContext(match[1]);
  const values = vm.runInNewContext(match[2]);
  if (typeof key === 'string' && Array.isArray(values) && values.length === 3) {
    entries.push([key, values[2]]);
  }
}

if (entries.length < 300) {
  throw new Error(`Expected at least 300 translation entries, found ${entries.length}`);
}

async function translate(text) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'auto');
  url.searchParams.set('tl', 'ms');
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`Translation failed: ${response.status}`);
  const payload = await response.json();
  return payload[0].map((part) => part[0]).join('').trim();
}

const malay = {};
for (let index = 0; index < entries.length; index += 8) {
  const batch = entries.slice(index, index + 8);
  const translated = await Promise.all(batch.map(async ([key, english]) => {
    try {
      return [key, await translate(english)];
    } catch (error) {
      console.warn(`Falling back to English for ${key}: ${error.message}`);
      return [key, english];
    }
  }));
  translated.forEach(([key, value]) => { malay[key] = value; });
}

// Curated high-visibility terms override machine phrasing.
Object.assign(malay, {
  '소개': 'Pengenalan',
  '뷰티': 'Kecantikan',
  '디자이너': 'Pereka',
  '크리에이터': 'Pencipta',
  '문의': 'Hubungi',
  '로그인': 'Log masuk',
  '로그아웃': 'Log keluar',
  '제품 둘러보기': 'Terokai produk',
  '추천 캠페인': 'Kempen disyorkan',
  '디자이너 스튜디오': 'Studio Pereka',
  '크리에이터 센터': 'Pusat Pencipta',
});

const malayBlock = `\n  const MALAY = Object.freeze(${JSON.stringify(malay, null, 4).replace(/^/gm, '  ')});\n`;
source = source
  .replace(
    "    'ko-KR': { short: 'KR', flag: 'kr', country: '대한민국', language: '한국어', current: '현재' },",
    "    'ko-KR': { short: 'KR', flag: 'kr', country: '대한민국', language: '한국어', current: '현재' },\n    'ms-MY': { short: 'MY', flag: 'my', country: 'Malaysia', language: 'Bahasa Melayu', current: 'Semasa' },",
  )
  .replace("const ORDER = ['ko-KR', 'vi-VN', 'zh-TW', 'en-US'];", "const ORDER = ['ko-KR', 'ms-MY', 'vi-VN', 'zh-TW', 'en-US'];")
  .replace("\n  const INDEX = { 'vi-VN': 0, 'zh-TW': 1, 'en-US': 2 };", `${malayBlock}\n  const INDEX = { 'vi-VN': 0, 'zh-TW': 1, 'en-US': 2 };`)
  .replace(
    "    const row = TEXT[lookupSource];\n    if (row) return row[INDEX[targetLocale]] || source;",
    "    const row = TEXT[lookupSource];\n    if (targetLocale === 'ms-MY') return MALAY[lookupSource] || row?.[2] || source;\n    if (row) return row[INDEX[targetLocale]] || source;",
  )
  .replace(
    "      if (targetLocale === 'vi-VN') return `Tổng ${match[1]} người`;",
    "      if (targetLocale === 'ms-MY') return `Jumlah ${match[1]} pencipta`;\n      if (targetLocale === 'vi-VN') return `Tổng ${match[1]} người`;",
  )
  .replace(
    "      if (targetLocale === 'vi-VN') return `Đã chọn ${match[1]}`;",
    "      if (targetLocale === 'ms-MY') return `${match[1]} dipilih`;\n      if (targetLocale === 'vi-VN') return `Đã chọn ${match[1]}`;",
  )
  .replace(
    "      if (targetLocale === 'vi-VN') return `Tổng ${match[1]} thương hiệu`;",
    "      if (targetLocale === 'ms-MY') return `Jumlah ${match[1]} jenama`;\n      if (targetLocale === 'vi-VN') return `Tổng ${match[1]} thương hiệu`;",
  );

await writeFile(file, source, 'utf8');
console.log(`Added ${Object.keys(malay).length} Malay translations.`);
