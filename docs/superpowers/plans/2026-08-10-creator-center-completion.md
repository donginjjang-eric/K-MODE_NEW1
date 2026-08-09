# Creator Center Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the creator content-production, performance, grade, and profile pages with real-data UI and align the remaining creator center styling.

**Architecture:** Add small pure presentation helpers for performance percentages and grade progress, then keep each route as a server-rendered page consuming existing creator-scoped queries. Extend the shared creator stylesheet with page-specific classes while preserving submission APIs, persona filters, and currency separation.

**Tech Stack:** Next.js 16 App Router, React server components, TypeScript, Node test runner, PostgreSQL-backed existing query helpers, CSS.

## Global Constraints

- Do not invent scores, rankings, payout data, profile fields, or campaign metrics.
- Do not combine revenue in different currencies.
- Preserve authenticated creator ownership and administrator persona filtering.
- Preserve the existing content submission API and form behavior.
- At 760px or below, major grids and content rows must become single-column layouts.

---

### Task 1: Performance and grade presentation helpers

**Files:**
- Modify: `src/lib/creator-center.ts`
- Modify: `tests/creator-activity-revenue-center.test.mjs`

**Interfaces:**
- Produces: `creatorRate(numerator: number, denominator: number): number` and `creatorGradeProgress(completed: number): { current; next; remaining; value; max }`.

- [ ] Add a failing test asserting `creatorRate(15, 100) === 15`, zero-denominator output `0`, and STARTER/RISING/PRO grade progress boundaries.
- [ ] Run `node --import tsx --test tests/creator-activity-revenue-center.test.mjs` and confirm missing-export failure.
- [ ] Implement the two pure helpers using existing `creatorGrade` thresholds 0, 1, and 3.
- [ ] Re-run the focused test and confirm all tests pass.
- [ ] Commit helper and test changes.

### Task 2: Content production workspace

**Files:**
- Modify: `src/app/dashboard/creator/submissions/page.tsx`
- Modify: `src/app/dashboard/creator/creator.css`
- Modify: `tests/creator-campaign-pages-contract.test.mjs`

**Interfaces:**
- Consumes: existing mission participations, submissions, `CreatorSubmissionForm`, next-action and status labels.
- Produces: `creator-production-card-grid`, `creator-production-card`, `creator-production-review`, and mission-detail links.

- [ ] Add failing contract assertions for the production summary, card grid, latest review note, conditional submission form, and detail link.
- [ ] Run the contract test and confirm missing-section failures.
- [ ] Rewrite the page cards using real submission history; show the form only for `creating` or `review`.
- [ ] Add desktop and mobile styles for production cards and their embedded form.
- [ ] Re-run the contract test and commit the page, CSS, and test.

### Task 3: Performance dashboard

**Files:**
- Modify: `src/app/dashboard/creator/performance/page.tsx`
- Modify: `src/app/dashboard/creator/creator.css`
- Modify: `tests/creator-activity-revenue-center.test.mjs`

**Interfaces:**
- Consumes: `getCreatorPerformanceRows`, `creatorRate`, persona currency filter.
- Produces: `creator-performance-summary`, `creator-performance-cards`, per-campaign engagement and order conversion, mission links.

- [ ] Add failing route assertions for summary and campaign cards plus real helper usage and detail links.
- [ ] Run the focused test and confirm absent-class failures.
- [ ] Replace the table-first page with KPI summary and flexible campaign cards while keeping currency-local revenue.
- [ ] Add responsive styles that avoid horizontal scrolling.
- [ ] Re-run the focused test and commit page, CSS, and tests.

### Task 4: Grade and profile completion

**Files:**
- Modify: `src/app/dashboard/creator/grade/page.tsx`
- Modify: `src/app/dashboard/creator/profile/page.tsx`
- Modify: `src/app/dashboard/creator/creator.css`
- Modify: `tests/creator-activity-revenue-center.test.mjs`
- Modify: `tests/creator-performance-contract.test.mjs`

**Interfaces:**
- Consumes: `creatorGradeProgress`, creator account fields, existing status label.
- Produces: grade hero, benefit cards, next-goal guidance, profile identity card, information grid, operations guidance.

- [ ] Add failing assertions for `creator-grade-benefits`, helper usage, `creator-profile-identity`, `creator-profile-grid`, and no editable form.
- [ ] Run focused tests and confirm missing-class failures.
- [ ] Rewrite grade copy and structure with STARTER/RISING/PRO conditions and honest benefits.
- [ ] Rewrite profile into identity, account detail, and operations guidance cards without inputs.
- [ ] Add shared responsive styles, re-run tests, and commit.

### Task 5: Cross-page polish, verification, and deployment

**Files:**
- Modify if required by visual inspection: `src/app/dashboard/creator/page.tsx`, `src/app/dashboard/creator/campaigns/page.tsx`, `src/app/dashboard/creator/creator.css`
- Test: existing creator contract tests.

**Interfaces:**
- Produces: consistent headings, spacing, empty states, and production deployment.

- [ ] Add contract assertions only if home or recommendation markup changes are necessary for consistency.
- [ ] Apply the minimum shared-style or copy changes discovered during visual review.
- [ ] Run `node --import tsx --test tests/creator-activity-revenue-center.test.mjs`.
- [ ] Run `node --test tests/creator-campaign-pages-contract.test.mjs tests/creator-performance-contract.test.mjs tests/creator-shell-contract.test.mjs`.
- [ ] Run `cmd /c npm run build` and confirm exit code 0.
- [ ] Deploy the exact worktree root to Railway service `k-modu` in `production`.
- [ ] Inspect `/dashboard/creator/submissions`, `/performance`, `/grade`, and `/profile` at desktop size; check visible content and horizontal overflow. Inspect mobile size if supported by the connected browser.
