# Admin Creator Campaign Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영자가 관리자 화면에서 크리에이터 캠페인을 생성·모집·승인·진행·마감하고, 메인 페이지에서 크리에이터 센터로 진입할 수 있게 한다.

**Architecture:** 기존 `campaigns`와 참여 관련 테이블을 유지하고 관리자 전용 도메인 함수와 API를 추가한다. 관리자 App Router 화면은 목록, 공용 폼, 상세 운영 컴포넌트로 분리하며 기존 크리에이터 API와 상태 모델을 공유한다. 레거시 메인 페이지의 퀵 링크는 기존 마크업과 다국어 구조를 재사용한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL, Node test runner, static legacy HTML/CSS/JavaScript

## Global Constraints

- 기존 디자이너 스튜디오 화면과 API는 수정하지 않는다.
- 관리자만 캠페인 생성·수정·모집·참여 상태 변경을 수행한다.
- 공개된 캠페인은 삭제하지 않고 마감한다.
- 참여 상태 변경과 이벤트 기록은 하나의 데이터베이스 트랜잭션으로 처리한다.
- 메인 퀵 링크는 PC와 모바일에서 기존 버튼을 가리지 않아야 한다.
- 기존 한국어·베트남어·중문·영문 다국어 체계를 유지한다.

---

### Task 1: Campaign Administration Domain and Schema

**Files:**
- Modify: `db/schema.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/creator-campaigns.ts`
- Modify: `src/lib/db.ts`
- Create: `tests/admin-campaign-management-contract.test.mjs`
- Create: `tests/admin-campaign-domain.test.ts`

**Interfaces:**
- Produces: `AdminCampaignInput`, `AdminCampaignStatus`, `AdminParticipationAction`
- Produces: `listAdminCampaigns(filters)`, `getAdminCampaign(id)`, `createAdminCampaign(adminId, input)`, `updateAdminCampaign(adminId, id, input)`, `setAdminCampaignStatus(adminId, id, status)`, `transitionParticipationAsAdmin(adminId, participationId, action, note?)`
- Consumes: existing `Campaign`, `ParticipationStatus`, `campaign_events`, admin user ID

- [ ] **Step 1: Write failing schema and domain tests**

```js
test("campaign status supports private drafts and closed campaigns", () => {
  assert.match(schema, /status IN \('draft', 'recruiting', 'active', 'closed'\)/);
});

test("admin campaign mutations require transactions and event history", () => {
  assert.match(source, /transitionParticipationAsAdmin/);
  assert.match(source, /BEGIN/);
  assert.match(source, /campaign_events/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/admin-campaign-management-contract.test.mjs && npx.cmd tsx --test tests/admin-campaign-domain.test.ts`
Expected: FAIL because draft/closed statuses and admin functions do not exist.

- [ ] **Step 3: Implement validation and transactional domain functions**

```ts
export type AdminCampaignStatus = "draft" | "recruiting" | "active" | "closed";
export type AdminParticipationAction = "approve" | "reject" | "shipping" | "creating" | "review" | "published" | "settlement" | "completed" | "cancel";
```

Validate non-empty title/category/brief/reward, positive slots, at least one market and platform, HTTPS image URL when present, and `applicationDeadline < contentDeadline`. Lock the campaign and participation rows before capacity or transition checks.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/admin-campaign-management-contract.test.mjs && npx.cmd tsx --test tests/admin-campaign-domain.test.ts`
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add db/schema.sql src/lib/types.ts src/lib/creator-campaigns.ts src/lib/db.ts tests/admin-campaign-management-contract.test.mjs tests/admin-campaign-domain.test.ts
git commit -m "feat: add admin campaign operations domain"
```

### Task 2: Admin Campaign APIs and List/Form Screens

**Files:**
- Create: `src/app/api/admin/campaigns/route.ts`
- Create: `src/app/api/admin/campaigns/[id]/route.ts`
- Create: `src/app/api/admin/campaigns/[id]/status/route.ts`
- Create: `src/app/dashboard/admin/campaigns/page.tsx`
- Create: `src/app/dashboard/admin/campaigns/new/page.tsx`
- Create: `src/app/dashboard/admin/campaigns/[id]/edit/page.tsx`
- Create: `src/components/AdminCampaignForm.tsx`
- Create: `src/components/AdminCampaignList.tsx`
- Modify: `src/components/AdminNav.tsx`
- Modify: `src/app/dashboard/admin/admin.css`
- Create: `tests/admin-campaign-pages-contract.test.mjs`

**Interfaces:**
- `POST /api/admin/campaigns` creates a draft.
- `PATCH /api/admin/campaigns/:id` updates a draft or recruiting campaign.
- `PATCH /api/admin/campaigns/:id/status` accepts only `recruiting | active | closed`.
- Form consumes `AdminCampaignInput` and returns actionable Korean validation messages.

- [ ] **Step 1: Write failing route, authorization, navigation, and form tests**

```js
test("admin campaign routes use admin guards", () => {
  for (const file of routeFiles) assert.match(read(file), /requireAdmin|requireAdminApi/);
});

test("admin navigation exposes creator campaigns", () => {
  assert.match(read("src/components/AdminNav.tsx"), /\/dashboard\/admin\/campaigns/);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/admin-campaign-pages-contract.test.mjs`
Expected: FAIL because routes and screens are missing.

- [ ] **Step 3: Implement APIs, list, filters, and shared form**

List columns: title, category, markets, platforms, applications, matched, slots, deadline, status. Form fields match the approved design exactly and use a checkbox group for markets/platforms.

- [ ] **Step 4: Run focused tests and build**

Run: `node --test tests/admin-campaign-pages-contract.test.mjs && npm.cmd run build`
Expected: PASS and build exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/campaigns src/app/dashboard/admin/campaigns src/components/AdminCampaignForm.tsx src/components/AdminCampaignList.tsx src/components/AdminNav.tsx src/app/dashboard/admin/admin.css tests/admin-campaign-pages-contract.test.mjs
git commit -m "feat: add admin campaign list and editor"
```

### Task 3: Campaign Detail Operations

**Files:**
- Create: `src/app/dashboard/admin/campaigns/[id]/page.tsx`
- Create: `src/components/AdminCampaignOperations.tsx`
- Create: `src/components/AdminCampaignStatusAction.tsx`
- Create: `src/app/api/admin/participations/[id]/route.ts`
- Modify: `src/app/api/admin/campaigns/[id]/invitations/route.ts`
- Modify: `src/app/dashboard/admin/admin.css`
- Create: `tests/admin-campaign-operations-contract.test.mjs`

**Interfaces:**
- `PATCH /api/admin/participations/:id` accepts `{ action, note? }`.
- Detail page consumes `getAdminCampaign(id)` including participants, submissions, performance, and event history.
- Existing invitation endpoint remains the single path for direct invitations.

- [ ] **Step 1: Write failing operation and ownership tests**

```js
test("participation mutations are admin-only and revalidate both centers", () => {
  const source = read("src/app/api/admin/participations/[id]/route.ts");
  assert.match(source, /requireAdminApi/);
  assert.match(source, /revalidatePath\("\/dashboard\/admin\/campaigns/);
  assert.match(source, /revalidatePath\("\/dashboard\/creator/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/admin-campaign-operations-contract.test.mjs`
Expected: FAIL because detail operations are missing.

- [ ] **Step 3: Implement detail page, invitation search, and legal transitions**

Render campaign summary, capacity, participant source/status, submission versions, review notes, performance, settlement, and event timeline. Disable impossible actions in the UI while the server independently rejects them with 409.

- [ ] **Step 4: Run focused and creator regression tests**

Run: `node --test tests/admin-campaign-operations-contract.test.mjs tests/admin-campaign-invitation-contract.test.mjs tests/creator-center-regression.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/admin/campaigns/[id]/page.tsx src/components/AdminCampaignOperations.tsx src/components/AdminCampaignStatusAction.tsx src/app/api/admin/participations src/app/api/admin/campaigns/[id]/invitations/route.ts src/app/dashboard/admin/admin.css tests/admin-campaign-operations-contract.test.mjs
git commit -m "feat: add admin campaign workflow controls"
```

### Task 4: Main Creator Center Quick Link

**Files:**
- Modify: `index.html`
- Modify: `platform.css`
- Modify: `site-i18n.js`
- Create: `tests/creator-quick-link-contract.test.mjs`

**Interfaces:**
- Produces a quick-link anchor to `/dashboard/creator` with a stable `data-i18n` key.
- Reuses existing desktop stack and mobile sizing rules for designer studio and Kakao links.

- [ ] **Step 1: Write failing markup, translation, and responsive tests**

```js
test("main quick links expose creator center in every locale", () => {
  assert.match(html, /href="\/dashboard\/creator"/);
  for (const locale of ["ko", "vi", "zh", "en"]) assert.ok(messages[locale].quickCreator);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/creator-quick-link-contract.test.mjs`
Expected: FAIL because the link and translations are absent.

- [ ] **Step 3: Implement the middle quick-link button and responsive spacing**

Desktop order: designer studio, creator center, Kakao. Mobile uses reduced dimensions and reserves enough bottom/right inset to avoid viewport controls and content overlap.

- [ ] **Step 4: Run focused static checks**

Run: `node --test tests/creator-quick-link-contract.test.mjs && npm.cmd run check:inline-scripts`
Expected: PASS with no inline-script policy violations.

- [ ] **Step 5: Commit**

```bash
git add index.html platform.css site-i18n.js tests/creator-quick-link-contract.test.mjs
git commit -m "feat: add creator center quick link"
```

### Task 5: Full Verification, Production Activation, and Deployment

**Files:**
- Modify only when verification finds a defect: files from Tasks 1-4
- Create: `tests/admin-campaign-regression.test.mjs`

**Interfaces:**
- Consumes all admin campaign APIs/screens, creator center screens, and the main quick link.
- Produces a deployable commit with verified schema migration and no designer studio regression.

- [ ] **Step 1: Add final regression checks**

Assert admin authorization, no designer component imports, no delete route, transaction/event invariants, creator link translations, and all required routes.

- [ ] **Step 2: Run complete automated verification**

Run: `node --test tests/*.test.mjs && npx.cmd tsx --test tests/*.test.ts && npm.cmd run build`
Expected: zero failed tests and build exit code 0.

- [ ] **Step 3: Run local browser verification**

At 1440×900 and 390×844 inspect `/`, `/dashboard/admin/campaigns`, new/edit/detail routes, and `/dashboard/creator`. Confirm no horizontal overflow, no console errors, usable fixed links, and visible primary actions.

- [ ] **Step 4: Commit verification fixes and regression test**

```bash
git add tests/admin-campaign-regression.test.mjs
git commit -m "test: verify admin creator campaign operations"
```

- [ ] **Step 5: Push and deploy exact source to Railway production**

Push `codex/creator-action-center`, deploy the exact committed source to project `overflowing-quietude`, environment `production`, service `k-modu`, then verify deployment status, startup logs, schema application, live PC/mobile pages, and console output.

