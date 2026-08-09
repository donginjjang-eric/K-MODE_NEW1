# Creator Mission Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sparse creator mission list with action-oriented mission cards that expose progress, deadlines, rewards, and next actions.

**Architecture:** Add pure mission presentation helpers for grouping and progress calculations, then render active and completed mission sections from the existing server data. Extend the isolated creator stylesheet with desktop and mobile card layouts while preserving existing invitation actions and detail routes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS, Node.js test runner

## Global Constraints

- Keep participation database and API status codes unchanged.
- Reuse `creatorStatusLabel` and `creatorNextActionLabel` for Korean presentation.
- Preserve invitation accept/decline actions and mission detail navigation.
- Use existing category fallback images because mission query data has no image URL.
- Verify desktop and mobile layouts after deployment.

---

### Task 1: Mission Presentation Helpers

**Files:**
- Create: `src/lib/creator-mission-view.ts`
- Create: `tests/creator-mission-view.test.ts`

**Interfaces:**
- Produces: `missionStageIndex(status: string): number`, `isActiveMission(status: string): boolean`, `isCompletedMission(status: string): boolean`, `missionImage(category: string): string`.

- [ ] Write tests for stage indexes, active/completed grouping, and beauty/fashion fallback images.
- [ ] Run `node --import tsx --test tests/creator-mission-view.test.ts` and confirm the missing module failure.
- [ ] Implement the minimal pure helpers.
- [ ] Re-run the test and confirm all cases pass.

### Task 2: Mission Card Page

**Files:**
- Modify: `src/app/dashboard/creator/my-campaigns/page.tsx`
- Modify: `tests/creator-mission-contract.test.mjs`

**Interfaces:**
- Consumes: Task 1 helpers and existing creator copy helpers.
- Produces: summary metrics, active mission cards, completed mission cards, and the existing empty state.

- [ ] Add contract expectations for the summary, progress list, deadline, reward, active/completed sections, invitation actions, and detail link.
- [ ] Run the contract test and confirm it fails on the old list.
- [ ] Render the new semantic card structure without changing server queries or actions.
- [ ] Re-run mission tests and confirm they pass.

### Task 3: Responsive Visual Design

**Files:**
- Modify: `src/app/dashboard/creator/creator.css`
- Modify: `tests/creator-shell-contract.test.mjs`

**Interfaces:**
- Consumes: mission card class names from Task 2.
- Produces: desktop two-column cards, clear progress states, and a single-column mobile layout.

- [ ] Add CSS contract checks for mission summary, card grid, progress, and mobile rules.
- [ ] Run the shell contract test and confirm failure before styles exist.
- [ ] Add scoped creator-center styles for summary cards, mission cards, progress states, actions, and mobile stacking.
- [ ] Run focused tests and `npm run build`.

### Task 4: Deploy and Verify

**Files:**
- Modify only if browser verification reveals a specific defect.

**Interfaces:**
- Consumes: completed mission card UI.
- Produces: verified production deployment.

- [ ] Commit the implementation.
- [ ] Deploy the explicit worktree root to Railway production.
- [ ] Verify deployment status is `SUCCESS`.
- [ ] Inspect the production `내 미션` page at desktop and mobile widths, checking card hierarchy, progress labels, buttons, clipping, and console errors.
