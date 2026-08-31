# Beauty Product Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shopping-style beauty product detail experience with up to 15 ordered detail images while preserving K-MODU collaboration actions.

**Architecture:** Store long-form detail images separately in `products.detail_image_urls`, retaining `image_urls` for the product gallery. The partner editor uploads and orders both sets independently. The public modal becomes a scrollable product detail sheet with commerce information first, long-form detail content next, and a persistent collaboration CTA.

**Tech Stack:** Next.js, React, TypeScript, PostgreSQL JSONB, static HTML/CSS/ES modules, Node test runner.

**Spec:** Approved in this task on 2026-08-31.

## Global Constraints

- Product gallery remains limited to 8 images.
- Detail page images are limited to 15 images.
- Existing products without detail images remain compatible.
- Collaboration inquiry remains the primary action; no checkout is introduced.

---

### Task 1: Detail image model and persistence

**Files:** `src/lib/product-detail-images.ts`, `src/lib/types.ts`, `db/schema.sql`, `src/lib/db.ts`, product API routes, focused test.

- [ ] Write failing tests for ordered unique detail images, 15-image cap, schema, and API persistence.
- [ ] Run the focused test and confirm failure.
- [ ] Implement normalization, JSONB persistence, and public API mapping.
- [ ] Run the focused test and confirm it passes.

### Task 2: Partner detail-image editor

**Files:** `src/components/ProductManager.tsx`, `src/app/dashboard/designer/studio.css`, focused test.

- [ ] Add failing UI contract tests for separate detail-image upload, order controls, preview, and removal.
- [ ] Run the focused test and confirm failure.
- [ ] Add upload/reorder/remove UI with a 15-image counter.
- [ ] Re-run the focused test.

### Task 3: Shopping-style collaboration detail sheet

**Files:** `beauty.html`, `beauty-products.js`, `platform.css`, focused test.

- [ ] Add failing tests for product information, long detail section, sticky collaboration CTA, and responsive layout.
- [ ] Run the focused test and confirm failure.
- [ ] Implement the scrollable detail sheet and empty-detail fallback.
- [ ] Re-run focused tests and production build.

### Task 4: Deploy and visual verification

**Files:** Verify only.

- [ ] Commit and push to the production branch.
- [ ] Verify public product detail at desktop and mobile breakpoints.
- [ ] Verify the production API exposes ordered detail images.
