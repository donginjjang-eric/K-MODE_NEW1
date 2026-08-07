import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BEAUTY_PRODUCTS,
  PAGE_SIZE,
  getMatchingProducts,
  getVisibleProductState,
} from '../beauty-products.js';

test('provides thirty complete beauty matching products', () => {
  assert.equal(BEAUTY_PRODUCTS.length, 30);
  assert.equal(new Set(BEAUTY_PRODUCTS.map((product) => product.id)).size, 30);
  for (const product of BEAUTY_PRODUCTS) {
    assert.ok(product.name);
    assert.ok(product.category);
    assert.ok(product.categoryLabel);
    assert.ok(product.markets.length > 0);
    assert.ok(product.formats.length > 0);
    assert.ok(product.slots > 0);
    assert.ok(product.image);
  }
});

test('filters products by category and market', () => {
  const matches = getMatchingProducts({ category: 'makeup', market: 'US' });
  assert.ok(matches.length > 0);
  assert.ok(matches.every((product) => product.category === 'makeup'));
  assert.ok(matches.every((product) => product.markets.includes('US')));
});

test('shows ten products initially and ten more per increment', () => {
  assert.equal(PAGE_SIZE, 10);
  const first = getVisibleProductState({ category: 'all', market: 'all' }, PAGE_SIZE);
  const second = getVisibleProductState({ category: 'all', market: 'all' }, PAGE_SIZE * 2);
  const third = getVisibleProductState({ category: 'all', market: 'all' }, PAGE_SIZE * 3);

  assert.equal(first.visibleProducts.length, 10);
  assert.equal(first.remainingCount, 20);
  assert.equal(second.visibleProducts.length, 20);
  assert.equal(second.remainingCount, 10);
  assert.equal(third.visibleProducts.length, 30);
  assert.equal(third.remainingCount, 0);
});

test('does not expose a load-more remainder when a filter has ten or fewer matches', () => {
  const state = getVisibleProductState({ category: 'hair-body', market: 'US' }, PAGE_SIZE);
  assert.ok(state.totalCount <= PAGE_SIZE);
  assert.equal(state.remainingCount, 0);
});

test('beauty page exposes the product board controls and module entrypoint', async () => {
  const html = await readFile(new URL('../beauty.html', import.meta.url), 'utf8');

  assert.match(html, /id="beautyProductGrid"/);
  assert.match(html, /id="beautyProductResults"[^>]*aria-live="polite"/);
  assert.match(html, /id="beautyLoadMore"/);
  assert.match(html, /type="module" src="\/beauty-products\.js\?v=/);
  assert.match(html, /platform\.css\?v=20260807-matching-grid/);
});

test('beauty board CSS defines matching-card hierarchy and responsive columns', async () => {
  const css = await readFile(new URL('../platform.css', import.meta.url), 'utf8');

  assert.match(css, /\.beauty-product-grid\s*{[^}]*grid-template-columns:\s*repeat\(5,/s);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*?\.beauty-product-grid\s*{[^}]*repeat\(3,/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.beauty-product-grid\s*{[^}]*repeat\(2,/);
  assert.match(css, /\.beauty-recruiting-badge/);
  assert.match(css, /\.beauty-product-format/);
  assert.match(css, /\.beauty-load-more/);
});

test('legacy route serves the beauty product module', async () => {
  const route = await readFile(new URL('../src/app/[...legacyPath]/route.ts', import.meta.url), 'utf8');
  assert.match(route, /"beauty-products\.js"/);
});

test('sprite products use a dedicated modal crop surface', async () => {
  const moduleSource = await readFile(new URL('../beauty-products.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../platform.css', import.meta.url), 'utf8');

  assert.match(moduleSource, /classList\.toggle\('has-sprite'/);
  assert.match(moduleSource, /backgroundPosition/);
  assert.match(css, /\.beauty-product-sheet-visual\.has-sprite/);
});

test('mobile beauty quick links stay clear of the two-column cards', async () => {
  const css = await readFile(new URL('../platform.css', import.meta.url), 'utf8');
  assert.match(css, /body:has\(\.beauty-market\) \.studio-quick-banner\s*{[^}]*width:\s*44px !important;[^}]*min-height:\s*44px !important;/s);
});
