# Creator Action Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 승인된 기존 크리에이터가 Google 로그인 후 추천 캠페인 신청, 초대 수락, 콘텐츠 제출, 성과·정산 조회를 수행하는 독립적인 크리에이터 센터를 구축한다.

**Architecture:** `/dashboard/creator`를 기존 디자이너 스튜디오와 분리된 App Router 영역으로 만든다. `creator_accounts`가 기존 운영자 관리 프로필의 `creator_key`와 로그인 사용자를 연결하며, 캠페인 상태는 `campaigns`, `campaign_participations`, `content_submissions`, `campaign_events`, `campaign_performance`에 저장한다. 디자이너 스튜디오는 수정하지 않고 관리자 화면과 크리에이터 화면만 공유 캠페인 API를 사용한다.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, PostgreSQL/`pg`, 기존 HMAC 세션, Google OAuth, CSS, Node test runner

## Global Constraints

- 기존 `/dashboard/designer` 파일, 메뉴, 레이아웃, 상품·AI 룩·룩북 동작을 변경하지 않는다.
- 승인된 기존 크리에이터 프로필에 연결된 Google 이메일만 크리에이터 센터에 접근한다.
- 추천 캠페인 직접 신청과 운영자 초대를 모두 지원한다.
- 모든 참여 상태 변경은 `campaign_events`에 기록한다.
- 다른 크리에이터의 참여·콘텐츠·정산 데이터에는 404로 응답한다.
- 모바일 390px에서 가로 스크롤이 없어야 한다.
- 자동 송금, 세금계산서, 실시간 채팅은 구현하지 않는다.

---

### Task 1: Creator and Campaign Schema

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `db/schema.sql`
- Modify: `src/lib/types.ts`
- Create: `tests/creator-schema.test.mjs`

**Interfaces:**
- Produces: `Role = "admin" | "designer" | "creator"`
- Produces: `CreatorAccount`, `Campaign`, `CampaignParticipation`, `ContentSubmission`, `CampaignEvent`, `CampaignPerformance`
- Consumes: existing `users` table and `creator_key` values from the public creator catalogue

- [ ] **Step 1: Write the failing schema contract test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("creator campaign schema is idempotent and role aware", async () => {
  const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  for (const table of ["creator_accounts", "campaigns", "campaign_participations", "content_submissions", "campaign_events", "campaign_performance"]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(sql, /role IN \('admin', 'designer', 'creator'\)/);
  assert.match(sql, /UNIQUE \(campaign_id, creator_account_id\)/);
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `node --test tests/creator-schema.test.mjs`

Expected: FAIL because creator tables and role do not exist.

- [ ] **Step 3: Add idempotent schema migration and indexes**

Implement the exact columns and status constraints from the approved design. Replace the existing `users_role_check` inside an idempotent PostgreSQL `DO $$` block so existing production databases accept `creator` without dropping data. Add indexes for creator user lookup, recruiting campaign filters, participation owner/status, submission participation/version, and event participation/date.

- [ ] **Step 4: Add the TypeScript test runner**

Run: `npm.cmd install --save-dev tsx`

Expected: `tsx` is recorded in `package.json` and `package-lock.json`; application runtime dependencies are unchanged.

- [ ] **Step 5: Add matching TypeScript domain types**

```ts
export type CreatorApprovalStatus = "pending" | "approved" | "disabled";
export type CampaignStatus = "draft" | "recruiting" | "active" | "closed";
export type ParticipationStatus = "applied" | "invited" | "matched" | "shipping" | "creating" | "review" | "published" | "settlement" | "completed" | "cancelled";
export type SettlementStatus = "none" | "pending" | "confirmed" | "paid";
export type SubmissionStatus = "submitted" | "revision_requested" | "approved" | "published";
```

- [ ] **Step 6: Verify schema contract and build**

Run: `node --test tests/creator-schema.test.mjs && npm.cmd run build`

Expected: PASS and production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json db/schema.sql src/lib/types.ts tests/creator-schema.test.mjs
git commit -m "Add creator campaign schema"
```

---

### Task 2: Approved Creator Authentication

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/app/api/auth/google/callback/route.ts`
- Create: `tests/creator-auth-contract.test.mjs`

**Interfaces:**
- Produces: `getCreatorAccountForUser(userId: string): Promise<CreatorAccount | null>`
- Produces: `getCreatorAccountByEmail(email: string): Promise<CreatorAccount | null>`
- Produces: `requireApprovedCreator(): Promise<{ user: SessionUser; creator: CreatorAccount }>`
- Produces: `getApprovedCreatorForApi()` returning an `{ ok, user, creator }` discriminated union
- Consumes: `creator_accounts.user_id`, `creator_accounts.google_email`, existing session cookie

- [ ] **Step 1: Write a failing source contract test**

Assert that `Role` contains creator, auth exports both creator guards, Google callback checks the linked creator account, and approved creator login redirects to `/dashboard/creator`.

- [ ] **Step 2: Run the test and confirm failure**

Run: `node --test tests/creator-auth-contract.test.mjs`

Expected: FAIL on missing creator guards.

- [ ] **Step 3: Implement creator account lookup functions**

Use parameterized SQL and normalize emails with `trim().toLowerCase()`. Never auto-create a creator account from an arbitrary Google login.

- [ ] **Step 4: Implement creator server guards**

`requireApprovedCreator()` must re-read `creator_accounts.approval_status` on every request. Missing, pending, or disabled links redirect to `/login?error=creator_required` or `/login?error=creator_approval_required`.

- [ ] **Step 5: Route approved Google creator logins**

After `findOrCreateGoogleUser`, resolve the creator link by email. If approved, update `users.role` to `creator`, attach `user_id` to the creator account, issue the existing session token, and use the requested safe `next` path or `/dashboard/creator`.

- [ ] **Step 6: Verify authentication contracts and build**

Run: `node --test tests/creator-auth-contract.test.mjs && npm.cmd run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db.ts src/lib/auth.ts src/app/api/auth/google/callback/route.ts tests/creator-auth-contract.test.mjs
git commit -m "Add approved creator authentication"
```

---

### Task 3: Admin Creator Account Linking

**Files:**
- Create: `src/app/dashboard/admin/creators/page.tsx`
- Create: `src/components/AdminCreatorAccountManager.tsx`
- Create: `src/app/api/admin/creators/[creatorKey]/route.ts`
- Create: `src/app/dashboard/admin/admin.css`
- Modify: `src/app/dashboard/admin/layout.tsx`
- Modify: `src/components/AdminNav.tsx`
- Modify: `src/lib/db.ts`
- Create: `tests/admin-creator-linking-contract.test.mjs`

**Interfaces:**
- Produces: `getCreatorAccountsForAdmin()`
- Produces: `upsertCreatorAccountLink({ creatorKey, displayName, googleEmail, platform, market, categories, approvalStatus })`
- API: `PATCH /api/admin/creators/:creatorKey` with normalized Google email and `approved | disabled`
- Consumes: existing admin guard and public `creator_key`

- [ ] **Step 1: Write failing admin route and navigation contract tests**

Check for admin authorization, email normalization, approved/disabled validation, and the `/dashboard/admin/creators` navigation item.

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test tests/admin-creator-linking-contract.test.mjs`

Expected: FAIL because the page and route are missing.

- [ ] **Step 3: Implement DB upsert and admin API**

The upsert must use `creator_key` as the stable unique identity, reject an email already linked to another creator, and preserve the existing creator display snapshot.

- [ ] **Step 4: Build account linking UI**

Show creator name, platform, market, current email, approval status, and actions `연결·승인` and `비활성화`. Do not add campaign editing to this screen.

- [ ] **Step 5: Add responsive styles in the admin-only stylesheet**

At 760px and below, collapse each row into a readable two-column detail card with one full-width action area.

- [ ] **Step 6: Verify tests and build**

Run: `node --test tests/admin-creator-linking-contract.test.mjs && npm.cmd run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/admin/creators src/app/dashboard/admin/admin.css src/app/dashboard/admin/layout.tsx src/app/api/admin/creators src/components/AdminCreatorAccountManager.tsx src/components/AdminNav.tsx src/lib/db.ts tests/admin-creator-linking-contract.test.mjs
git commit -m "Add admin creator account linking"
```

---

### Task 4: Campaign Domain and Recommendation Rules

**Files:**
- Create: `src/lib/creator-campaigns.ts`
- Modify: `src/lib/db.ts`
- Create: `scripts/seed-creator-campaigns.mjs`
- Create: `tests/creator-campaign-domain.test.ts`

**Interfaces:**
- Produces: `getRecommendedCampaigns(creatorId: string)`
- Produces: `getCreatorActionSummary(creatorId: string)`
- Produces: `applyToCampaign(creatorId: string, campaignId: string)`
- Produces: `respondToInvitation(creatorId: string, participationId: string, accept: boolean)`
- Produces: `scoreCampaignFit({ creator, campaign }): { score: number; reasons: string[] }`
- Consumes: creator market/platform/categories and recruiting campaigns

- [ ] **Step 1: Write failing recommendation and state tests**

Cover market 40, platform 30, category 20, deadline 10, stable deadline tie-break, duplicate application rejection, expired campaign rejection, and invitation/application convergence to `matched`.

- [ ] **Step 2: Run the domain tests and confirm failure**

Run: `npx.cmd tsx --test tests/creator-campaign-domain.test.ts`

Expected: FAIL because the domain module is missing.

- [ ] **Step 3: Implement pure recommendation and transition helpers**

Keep score calculation and allowed transitions in exported pure functions. DB functions call these helpers before updates.

- [ ] **Step 4: Implement transactional participation writes**

Application, invitation response, and status changes must update `campaign_participations` and insert `campaign_events` in one transaction.

- [ ] **Step 5: Add idempotent local campaign seed**

Seed at least six fashion/beauty campaigns across VN, TW, and US using deterministic IDs and `ON CONFLICT DO UPDATE`. Do not execute the seed against production automatically.

- [ ] **Step 6: Verify domain tests and build**

Run: `npx.cmd tsx --test tests/creator-campaign-domain.test.ts && npm.cmd run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/creator-campaigns.ts src/lib/db.ts scripts/seed-creator-campaigns.mjs tests/creator-campaign-domain.test.ts
git commit -m "Add creator campaign domain"
```

---

### Task 5: Independent Creator Center Shell

**Files:**
- Create: `src/app/dashboard/creator/layout.tsx`
- Create: `src/app/dashboard/creator/creator.css`
- Create: `src/components/CreatorNav.tsx`
- Create: `tests/creator-shell-contract.test.mjs`

**Interfaces:**
- Consumes: `requireApprovedCreator()`
- Produces routes for home, recommended campaigns, my campaigns, submissions, settlement, and profile
- Must not import or modify `StudioNav` or designer route files

- [ ] **Step 1: Write failing shell isolation test**

Assert creator layout uses `requireApprovedCreator`, imports `creator.css`, exposes the six menu destinations, includes mobile bottom navigation, and contains no `/dashboard/designer` mutation/import.

- [ ] **Step 2: Run the test and confirm failure**

Run: `node --test tests/creator-shell-contract.test.mjs`

Expected: FAIL because creator shell files are missing.

- [ ] **Step 3: Implement desktop and mobile navigation**

Desktop uses a dark left rail. Mobile uses a top logo/menu and five bottom destinations: 홈, 캠페인, 미션, 정산, 내 정보.

- [ ] **Step 4: Implement isolated visual tokens**

Use cream, ivory, black, muted gold, and teal accents. Scope every selector under `.creator-center` to prevent designer/admin style leakage.

- [ ] **Step 5: Verify shell contract and build**

Run: `node --test tests/creator-shell-contract.test.mjs && npm.cmd run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/creator/layout.tsx src/app/dashboard/creator/creator.css src/components/CreatorNav.tsx tests/creator-shell-contract.test.mjs
git commit -m "Add creator center shell"
```

---

### Task 6: Action Home and Recommended Campaigns

**Files:**
- Create: `src/app/dashboard/creator/page.tsx`
- Create: `src/app/dashboard/creator/campaigns/page.tsx`
- Create: `src/components/CreatorCampaignApplyButton.tsx`
- Create: `src/app/api/creator/campaigns/[id]/apply/route.ts`
- Create: `tests/creator-campaign-pages-contract.test.mjs`

**Interfaces:**
- Home consumes: `getCreatorActionSummary`, top recommended campaigns, current participations, settlement summary
- Apply API consumes: `getApprovedCreatorForApi`, `applyToCampaign`
- UI produces: immediate application feedback and revalidation of `/dashboard/creator` and `/dashboard/creator/campaigns`

- [ ] **Step 1: Write failing page/API contract tests**

Check home priority order, recruiting filters, match-reason tags, server-side creator guard, duplicate handling, and `revalidatePath` calls.

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test tests/creator-campaign-pages-contract.test.mjs`

Expected: FAIL because routes are missing.

- [ ] **Step 3: Implement action-first home**

Render one primary `오늘 할 일` card, secondary deadline tasks, three recommended campaigns, active campaign progress, and settlement summary. Empty state links to recommended campaigns.

- [ ] **Step 4: Implement recommended campaign page**

Provide category, market, and platform filters. Campaign cards show product/campaign image, reward, deadline, slots, match reasons, and application state.

- [ ] **Step 5: Implement application action**

Use an accessible client button with pending, success, duplicate, closed, and retry states. Do not optimistically claim success before API confirmation.

- [ ] **Step 6: Verify tests and build**

Run: `node --test tests/creator-campaign-pages-contract.test.mjs && npm.cmd run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/creator/page.tsx src/app/dashboard/creator/campaigns/page.tsx src/components/CreatorCampaignApplyButton.tsx src/app/api/creator/campaigns tests/creator-campaign-pages-contract.test.mjs
git commit -m "Add creator action home and campaigns"
```

---

### Task 7: My Campaign, Mission, and Content Submission

**Files:**
- Create: `src/app/dashboard/creator/my-campaigns/page.tsx`
- Create: `src/app/dashboard/creator/my-campaigns/[id]/page.tsx`
- Create: `src/app/dashboard/creator/submissions/page.tsx`
- Create: `src/components/CreatorSubmissionForm.tsx`
- Create: `src/components/CreatorInvitationActions.tsx`
- Create: `src/app/api/creator/participations/[id]/invitation/route.ts`
- Create: `src/app/api/creator/participations/[id]/submissions/route.ts`
- Modify: `src/lib/db.ts`
- Create: `tests/creator-mission-contract.test.mjs`

**Interfaces:**
- Produces: `getParticipationForCreator(creatorId, participationId)` returning null for foreign ownership
- Produces: `createContentSubmission(creatorId, participationId, { contentUrl, captionText })`
- Produces: `respondToInvitation`
- Submission API accepts HTTPS URLs only and increments version transactionally

- [ ] **Step 1: Write failing ownership, transition, and submission tests**

Cover foreign record 404, invitation accept/reject, HTTPS validation, version increment, revision re-submission, and event creation.

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test tests/creator-mission-contract.test.mjs`

Expected: FAIL because mission routes are missing.

- [ ] **Step 3: Implement my-campaign list and detail**

The detail page shows status timeline, current next action, product/shipping brief, submission history, review notes, and publication requirement.

- [ ] **Step 4: Implement invitation actions**

Accept moves `invited → matched`; reject moves `invited → cancelled`. Reject all other source states with HTTP 409.

- [ ] **Step 5: Implement submission flow**

On first valid submission move `creating → review`. On revision re-submission remain in `review` and create a new version. Preserve the entered URL and caption on network failure.

- [ ] **Step 6: Verify tests and build**

Run: `node --test tests/creator-mission-contract.test.mjs && npm.cmd run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/creator/my-campaigns src/app/dashboard/creator/submissions src/components/CreatorSubmissionForm.tsx src/components/CreatorInvitationActions.tsx src/app/api/creator/participations src/lib/db.ts tests/creator-mission-contract.test.mjs
git commit -m "Add creator missions and submissions"
```

---

### Task 8: Performance, Settlement, and Profile

**Files:**
- Create: `src/app/dashboard/creator/settlement/page.tsx`
- Create: `src/app/dashboard/creator/profile/page.tsx`
- Create: `src/components/CreatorPerformanceForm.tsx`
- Create: `src/app/api/creator/participations/[id]/performance/route.ts`
- Modify: `src/lib/db.ts`
- Create: `tests/creator-performance-contract.test.mjs`

**Interfaces:**
- Produces: `upsertCampaignPerformance(creatorId, participationId, input)`
- Produces: `getCreatorSettlementSummary(creatorId)`
- Performance input allows non-negative integer views/likes/comments/orders and non-negative decimal revenue
- Settlement status is read-only for creators

- [ ] **Step 1: Write failing performance and settlement tests**

Cover ownership, non-negative validation, published-or-later state requirement, currency allowlist, and creator inability to mark settlement paid.

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test tests/creator-performance-contract.test.mjs`

Expected: FAIL because performance routes are missing.

- [ ] **Step 3: Implement performance API and form**

Allow updates only for `published`, `settlement`, or `completed` participations. Use `KRW`, `USD`, `VND`, `TWD`, and `MYR` as the initial currency allowlist.

- [ ] **Step 4: Implement settlement page**

Show expected, pending, confirmed, and paid totals grouped by currency. Do not convert currencies or invent exchange rates.

- [ ] **Step 5: Implement read-only linked profile page**

Show display name, platform, market, categories, Google email, and approval status. Profile editing remains an admin operation in the first release.

- [ ] **Step 6: Verify tests and build**

Run: `node --test tests/creator-performance-contract.test.mjs && npm.cmd run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/creator/settlement src/app/dashboard/creator/profile src/components/CreatorPerformanceForm.tsx src/app/api/creator/participations src/lib/db.ts tests/creator-performance-contract.test.mjs
git commit -m "Add creator performance and settlement"
```

---

### Task 9: End-to-End Verification and Regression Guard

**Files:**
- Create: `tests/creator-center-regression.test.mjs`
- Modify only if verification finds defects: creator/admin files created in Tasks 1-8

**Interfaces:**
- Consumes all creator center routes and APIs
- Produces no new feature surface

- [ ] **Step 1: Write regression tests for designer isolation**

Record hashes or source assertions for `src/components/StudioNav.tsx`, `src/app/dashboard/designer/layout.tsx`, and the existing designer navigation destinations. Assert creator files do not import designer components.

- [ ] **Step 2: Run the complete automated suite**

Run: `node --test tests/*.test.mjs && npx.cmd tsx --test tests/*.test.ts && npm.cmd run check:inline-scripts && npm.cmd run audit:images && npm.cmd run build && git diff --check`

Expected: all commands exit 0. The known non-fatal NFT trace warning may remain; no new warning is accepted.

- [ ] **Step 3: Apply schema in a disposable local database or transaction**

Run `db/schema.sql` twice and confirm both applications succeed. Verify the `users` role constraint includes `creator` and every new index exists.

- [ ] **Step 4: Verify desktop flows in the browser**

At 1440×900 verify login routing, home CTA, campaign filters, application, invitation response, submission, performance, settlement, and no console errors.

- [ ] **Step 5: Verify mobile flows in the browser**

At 390×844 verify no horizontal overflow, bottom navigation visibility, first-screen CTA, readable cards/forms, keyboard-safe submission form, and no quick-link overlap.

- [ ] **Step 6: Verify existing designer studio**

Open `/dashboard/designer/brand`, products, generated looks, lookbooks, short, and orders with an existing approved designer account. Confirm routes, authentication, and layout are unchanged.

- [ ] **Step 7: Commit verification guard**

```bash
git add tests/creator-center-regression.test.mjs
git commit -m "Verify creator center isolation"
```

## Deployment Gate

Deployment is allowed only after Tasks 1-9 pass, an operator links one test creator Google email, and both PC/mobile browser checks succeed. Production schema application must occur through the existing idempotent `scripts/ensure-schema.mjs` startup path. Do not seed demo campaigns into production automatically.
