# Creator Action Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an action-first K-MODU creator center that is clear and usable on mobile and desktop.

**Architecture:** Keep the existing Next.js routes and database queries. Centralize status-to-presentation mapping in a focused creator mission helper, then consume it from home, mission list, detail, and navigation components with responsive CSS.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, server components, CSS.

## Global Constraints

- Preserve existing creator authentication, persona preview, database schema, and URLs.
- Show one primary action for each mission state.
- Use five creator-facing stages: delivery, production, review, publishing, settlement.
- Mobile bottom navigation contains exactly five destinations.
- Remove mixed Korean and English copy from the changed primary UI.

---

### Task 1: Shared action model

**Files:**
- Modify: `src/lib/creator-mission-view.ts`

**Interfaces:**
- Produces: `creatorMissionPresentation(status)` returning group, stage index, action label, and action destination kind.

- [ ] Add presentation cases for every participation status.
- [ ] Type-check with `npm run build` and correct exhaustive mapping errors.
- [ ] Commit as `feat: add creator mission action model`.

### Task 2: Home and mission list

**Files:**
- Modify: `src/app/dashboard/creator/page.tsx`
- Modify: `src/app/dashboard/creator/my-campaigns/page.tsx`

**Interfaces:**
- Consumes: `creatorMissionPresentation(status)`.
- Produces: action-first home card and grouped mission lists.

- [ ] Replace the KPI-first home hierarchy with today's primary action, deadlines, active missions, and earnings.
- [ ] Group mission cards into needs-attention, active, and completed sections.
- [ ] Give each card one state-aware primary link while preserving invitation accept/decline actions.
- [ ] Run `npm run build` and resolve rendering/type failures.
- [ ] Commit as `feat: make creator missions action first`.

### Task 3: Mission detail

**Files:**
- Modify: `src/app/dashboard/creator/my-campaigns/[id]/page.tsx`
- Modify: `src/components/CreatorPerformanceForm.tsx` only if creator-facing labels need correction.

**Interfaces:**
- Consumes: shared five-stage mapping and existing participation data.
- Produces: compact detail hierarchy with sticky action and separated secondary sections.

- [ ] Replace the long status list with the five-stage tracker.
- [ ] Add the state-aware action panel with deadline and reward.
- [ ] Move performance, submissions, settlement, and activity into labeled panels; collapse long history.
- [ ] Remove mixed-language campaign UI labels while leaving user-provided campaign content unchanged.
- [ ] Run `npm run build` and resolve failures.
- [ ] Commit as `feat: redesign creator mission detail`.

### Task 4: Responsive navigation and styling

**Files:**
- Modify: `src/components/CreatorNav.tsx`
- Modify: `src/app/dashboard/creator/creator.css`

**Interfaces:**
- Produces: seven-item desktop rail and five-item mobile navigation with a More entry.

- [ ] Reduce mobile navigation to Home, Missions, Create, Settlement, and More.
- [ ] Style action cards, grouped missions, five-stage tracker, sticky actions, and desktop support column.
- [ ] Enforce 44px controls and prevent horizontal overflow at mobile width.
- [ ] Run `npm run build` and correct CSS or type regressions.
- [ ] Commit as `feat: polish responsive creator workflow`.

### Task 5: End-to-end verification and deployment

**Files:**
- Modify only files required by verified defects.

**Interfaces:**
- Produces: verified production creator center and deployment URL.

- [ ] Run `npm run build` and `npm run check:inline-scripts`.
- [ ] Start the production-equivalent local server.
- [ ] Inspect home, mission list, and mission detail at desktop and mobile viewports; check console logs and overflow.
- [ ] Fix verified defects and repeat the checks.
- [ ] Commit final fixes, push the branch, deploy through the configured production workflow, and inspect the deployed routes.
