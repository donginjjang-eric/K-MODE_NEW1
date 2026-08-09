# Creator Mission Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the creator mission detail route into a polished, action-oriented workspace consistent with the creator dashboard.

**Architecture:** Extend the pure mission view helper with display-safe demo copy and stage metadata, restructure the existing server-rendered detail page into scoped semantic cards, and style existing action forms through creator-only CSS without changing APIs or database values.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, Node.js test runner

## Global Constraints

- Preserve all API routes, mutations, database values, and status conditions.
- Reuse creator copy helpers for Korean status and next-action labels.
- Replace only known demo campaign English descriptions at display time.
- Keep all styling scoped under `.creator-center`.
- Verify desktop and mobile production rendering.

---

### Task 1: Detail Display Helpers

**Files:**
- Modify: `src/lib/creator-mission-view.ts`
- Modify: `tests/creator-mission-view.test.ts`

- [ ] Add failing tests for known demo description translation and unknown-copy preservation.
- [ ] Implement `missionBriefLabel(brief: string): string`.
- [ ] Run focused helper tests.

### Task 2: Detail Page Structure

**Files:**
- Modify: `src/app/dashboard/creator/my-campaigns/[id]/page.tsx`
- Modify: `tests/creator-mission-contract.test.mjs`

- [ ] Add failing contract expectations for hero, progress, brief cards, work forms, submission cards, and activity cards.
- [ ] Rebuild the page markup while preserving invitation, submission, and performance conditions.
- [ ] Run mission and performance contracts.

### Task 3: Forms and Responsive Styling

**Files:**
- Modify: `src/app/dashboard/creator/creator.css`
- Modify: `tests/creator-shell-contract.test.mjs`

- [ ] Add failing CSS contract checks for detail hero, progress, form grid, history, and mobile rules.
- [ ] Add scoped desktop and mobile styles for every detail component and native form control.
- [ ] Run focused tests and the production build.

### Task 4: Deploy and Verify

- [ ] Commit implementation files.
- [ ] Deploy the explicit worktree root to Railway production.
- [ ] Confirm the deployment reaches `SUCCESS`.
- [ ] Inspect the production detail route at desktop and 390px mobile widths for hierarchy, overflow, form layout, and console errors.
