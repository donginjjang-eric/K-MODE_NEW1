# Creator Dashboard Korean Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace user-facing English across the creator dashboard with clear Korean while preserving internal codes and required proper nouns.

**Architecture:** Add one creator-only presentation helper for repeated status, stage, and match-reason labels. Keep API/database values unchanged, replace fixed UI copy in pages and client components, and enforce the result with source contract tests plus browser checks.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node.js built-in test runner

## Global Constraints

- Keep `K-MODU`, email addresses, URLs, currency codes (`KRW`, `USD`, `VND`, `TWD`, `MYR`), and platform proper names unchanged.
- Do not change API payloads, database values, route paths, or internal participation status codes.
- Prefer action-oriented Korean over literal translations.
- Translate fixed copy, state labels, progress stages, empty states, success messages, and error messages.
- Do not modify administrator-only screens or database-authored campaign content.

---

### Task 1: Shared Creator Display Labels

**Files:**
- Create: `src/lib/creator-copy.ts`
- Create: `tests/creator-korean-copy.test.mjs`

**Interfaces:**
- Produces: `creatorStatusLabel(status: string): string`, `creatorMatchReasonLabel(reason: string): string`, and `creatorFieldLabel(field: string): string`.
- Consumes: raw database/API string codes without modifying them.

- [ ] **Step 1: Write the failing test**

Create `tests/creator-korean-copy.test.mjs` that reads `src/lib/creator-copy.ts` and asserts mappings for `invited → 초대됨`, `creating → 제작 중`, `review → 검수 중`, `published → 게시 완료`, `settlement → 정산 중`, `market → 활동 국가 적합`, `platform → 활동 채널 적합`, `category → 관심 분야 적합`, and `deadline → 현재 모집 중`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/creator-korean-copy.test.mjs`

Expected: FAIL because `src/lib/creator-copy.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create maps with Korean labels and exported functions that return the mapped label or the original input when no mapping exists. Include field mappings for `views`, `likes`, `comments`, `orders`, `revenue`, and `currency`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/creator-korean-copy.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/creator-copy.ts tests/creator-korean-copy.test.mjs
git commit -m "feat: add Korean creator display labels"
```

### Task 2: Campaign, Mission, and Profile Pages

**Files:**
- Modify: `src/app/dashboard/creator/campaigns/page.tsx`
- Modify: `src/app/dashboard/creator/my-campaigns/page.tsx`
- Modify: `src/app/dashboard/creator/my-campaigns/[id]/page.tsx`
- Modify: `src/app/dashboard/creator/profile/page.tsx`
- Modify: `src/app/dashboard/creator/page.tsx`
- Modify: `tests/creator-korean-copy.test.mjs`

**Interfaces:**
- Consumes: `creatorStatusLabel` and `creatorMatchReasonLabel` from Task 1.
- Produces: Korean campaign discovery, mission tracking, mission detail, profile, and creator-home copy.

- [ ] **Step 1: Extend the failing test**

Assert that campaign filters contain `카테고리`, `활동 국가`, `활동 채널`, `조건 적용`, and `초기화`; mission screens contain `내 미션`, `미션 보기`, `진행 단계`, `캠페인 안내`, `배송 안내`, `콘텐츠 마감일`, and `제출 내역`; profile contains `크리에이터 프로필`, `활동명`, `플랫폼`, `활동 국가`, `관심 분야`, and `승인 상태`. Assert the old fixed strings `Apply filters`, `My missions`, `Mission timeline`, `Creator profile`, and `CREATOR ACTIVITY · REVENUE CENTER` are absent from these files.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/creator-korean-copy.test.mjs`

Expected: FAIL on the first remaining English UI string.

- [ ] **Step 3: Replace fixed page copy and displayed codes**

Translate headings, filters, counts, card metadata, empty states, links, profile fields, timeline labels, submission history, and activity messages. Use the shared helper whenever raw participation or match-reason codes are rendered.

- [ ] **Step 4: Run focused creator tests**

Run: `node --test tests/creator-korean-copy.test.mjs tests/creator-campaign-pages-contract.test.mjs tests/creator-mission-contract.test.mjs tests/creator-activity-revenue-center.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/creator src/lib/creator-copy.ts tests/creator-korean-copy.test.mjs
git commit -m "feat: translate creator campaign and mission pages"
```

### Task 3: Forms, Actions, and Remaining Dashboard Pages

**Files:**
- Modify: `src/components/CreatorCampaignApplyButton.tsx`
- Modify: `src/components/CreatorInvitationActions.tsx`
- Modify: `src/components/CreatorSubmissionForm.tsx`
- Modify: `src/components/CreatorPerformanceForm.tsx`
- Modify: `src/components/CreatorNav.tsx`
- Modify: `src/app/dashboard/creator/submissions/page.tsx`
- Modify: `src/app/dashboard/creator/performance/page.tsx`
- Modify: `src/app/dashboard/creator/settlement/page.tsx`
- Modify: `src/app/dashboard/creator/grade/page.tsx`
- Modify: `tests/creator-korean-copy.test.mjs`

**Interfaces:**
- Consumes: `creatorStatusLabel` and `creatorFieldLabel` from Task 1.
- Produces: Korean interactive labels and feedback for all creator actions.

- [ ] **Step 1: Extend the failing test**

Assert Korean labels for applying, accepting/declining invitations, submitting content, entering performance, settlement, grade, and navigation branding. Assert user-facing strings such as `Apply now`, `Accept invitation`, `Submit for review`, `Save performance`, `LOCAL CURRENCY`, `CREATOR GRADE`, `CONTENT PRODUCTION`, and `EARNINGS · SETTLEMENT` are absent.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/creator-korean-copy.test.mjs`

Expected: FAIL on remaining form/action English.

- [ ] **Step 3: Translate components and remaining pages**

Use Korean for button states, validation feedback, success/error messages, form labels, placeholders, headings, empty states, and displayed participation statuses. Preserve URLs, currency codes, and platform names.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/creator-korean-copy.test.mjs tests/creator-performance-contract.test.mjs tests/creator-shell-contract.test.mjs tests/creator-center-regression.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Creator*.tsx src/app/dashboard/creator tests/creator-korean-copy.test.mjs
git commit -m "feat: translate creator actions and dashboard copy"
```

### Task 4: Full Verification and Visual Review

**Files:**
- Modify only if verification reveals a specific copy or layout defect.

**Interfaces:**
- Consumes: completed Korean creator dashboard from Tasks 1-3.
- Produces: verified desktop and mobile local preview.

- [ ] **Step 1: Scan for unapproved English copy**

Run: `rg -n "Apply|Clear|Category|Market|Platform|Campaign|Mission|Profile|Performance|Revenue|Currency|Shipping|Reward|Submission|Activity|CREATOR|LOCAL CURRENCY" src/app/dashboard/creator src/components/Creator*.tsx`

Expected: only internal identifiers, imports, route names, proper nouns, and explicitly allowed codes remain.

- [ ] **Step 2: Run all creator tests**

Run: `node --test tests/creator-*.test.mjs`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: build completes successfully.

- [ ] **Step 4: Verify desktop and mobile in the browser**

Open the local creator dashboard, confirm no error overlay or console errors, inspect `/dashboard/creator/campaigns`, `/dashboard/creator/my-campaigns`, `/dashboard/creator/submissions`, `/dashboard/creator/performance`, `/dashboard/creator/settlement`, `/dashboard/creator/grade`, and `/dashboard/creator/profile`. Repeat the campaigns and mission-detail checks at a mobile viewport and confirm Korean labels do not overlap or clip.

- [ ] **Step 5: Commit verification fixes if any**

```bash
git add <only-files-fixed-during-verification>
git commit -m "fix: polish Korean creator dashboard copy"
```
