# Beauty Product Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow beauty partners to upload, arrange, and publish up to eight product images while keeping existing single-image products compatible and making long detail titles readable.

**Architecture:** Keep `products.image_url` as the cover image and add an `image_urls` JSONB array containing the ordered gallery. API input is normalized by a small pure helper, persisted through existing product queries, and exposed to the static beauty page where the modal renders a thumbnail gallery. Existing products fall back to `[image_url]`.

**Tech Stack:** Next.js 16, React 19, TypeScript, PostgreSQL JSONB, Node test runner, legacy HTML/CSS/ES modules.

**Spec:** Approved in this task on 2026-08-31.

## Global Constraints

- Beauty products accept 1–8 images; each file remains limited to 8 MB and the existing supported MIME types.
- The first ordered image is the cover and remains mirrored in `image_url` for backward compatibility.
- Existing products without `image_urls` continue to render with `image_url`.
- Public detail title is capped at 48px desktop and 36px mobile.

---

### Task 1: Gallery normalization and schema

**Files:**
- Create: `src/lib/product-images.ts`
- Modify: `src/lib/types.ts`
- Modify: `db/schema.sql`
- Test: `tests/product-images.test.ts`

**Interfaces:**
- Produces: `normalizeProductImages(imageUrls: unknown, fallback?: string): string[]`

- [ ] Write tests proving trimming, duplicate removal, fallback behavior, and the eight-image limit.
- [ ] Run `npx tsx --test tests/product-images.test.ts` and confirm failure because the helper does not exist.
- [ ] Implement the helper and add `products.image_urls jsonb NOT NULL DEFAULT '[]'::jsonb`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Product API persistence

**Files:**
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`
- Modify: `src/lib/db.ts`
- Test: `tests/product-images.test.ts`

**Interfaces:**
- Consumes: `normalizeProductImages`.
- Produces: product records with ordered `image_urls` and cover `image_url`.

- [ ] Add a failing source-contract test proving create/update/public queries carry `image_urls`.
- [ ] Run the focused test and confirm the contract failure.
- [ ] Persist JSONB arrays on create/update and map them from both API routes.
- [ ] Re-run the test and confirm it passes.

### Task 3: Beauty partner multi-upload UI

**Files:**
- Modify: `src/components/ProductManager.tsx`
- Modify: `src/app/dashboard/designer/studio.css`
- Test: `tests/product-images.test.ts`

**Interfaces:**
- Consumes: product `image_urls`.
- Produces: `imageUrls` payload ordered by cover priority.

- [ ] Add a failing UI contract test for `multiple`, eight-image copy, remove, and cover controls.
- [ ] Run the focused test and confirm failure.
- [ ] Implement parallel file uploads, previews, cover selection, ordering, removal, and edit hydration.
- [ ] Re-run the test and confirm it passes.

### Task 4: Public gallery and typography

**Files:**
- Modify: `src/app/api/public/beauty-products/route.ts`
- Modify: `beauty.html`
- Modify: `beauty-products.js`
- Modify: `platform.css`
- Test: `tests/product-images.test.ts`

**Interfaces:**
- Consumes: public `imageUrls`.
- Produces: modal thumbnails, next/previous navigation, and responsive title sizing.

- [ ] Add a failing contract test for public `imageUrls`, gallery markup, and title size caps.
- [ ] Run the focused test and confirm failure.
- [ ] Implement API mapping, gallery controls, active-image state, and responsive CSS.
- [ ] Re-run the focused test and full relevant suite.

### Task 5: Build, deploy, and visual verification

**Files:**
- Verify only.

**Interfaces:**
- Produces: deployed production behavior at `/dashboard/beauty/products` and `/beauty`.

- [ ] Run `npm run build`.
- [ ] Commit and push the completed change to the production branch.
- [ ] Verify desktop and mobile partner upload UI and public detail gallery in Chrome.
- [ ] Confirm legacy one-image products and long Korean product names still render correctly.
