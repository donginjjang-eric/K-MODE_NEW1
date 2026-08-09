# Creator Settlement Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the currency-total-only settlement screen with a real-data settlement center containing summary cards, settlement stages, campaign-level ledger rows, and honest payment guidance.

**Architecture:** Keep aggregate calculations in `creator-rewards.ts`, add a focused row-to-ledger presentation mapper there, and add a creator-scoped database query in `db.ts`. The server page consumes the existing summary plus the new ledger and renders all four sections without inventing unavailable payout data.

**Tech Stack:** Next.js 16 App Router, React server components, TypeScript, PostgreSQL query helpers, Node test runner, CSS.

## Global Constraints

- Never combine different currencies or apply an exchange rate.
- Do not display invented payout dates, payment accounts, bonus breakdowns, or statement downloads.
- Every database query must be scoped to the authenticated creator account ID.
- Cancelled campaigns and unparseable rewards must not appear in the settlement ledger.
- Preserve the existing admin persona currency filter.

---

### Task 1: Settlement ledger presentation model

**Files:**
- Modify: `src/lib/creator-rewards.ts`
- Modify: `tests/creator-activity-revenue-center.test.mjs`

**Interfaces:**
- Consumes: participation fields `id`, `campaign_title`, `campaign_category`, `status`, `expected_reward`, `settlement_status`, `updated_at`.
- Produces: `toCreatorSettlementItems(rows): CreatorSettlementItem[]` with parsed `currency`, numeric `amount`, Korean `statusLabel`, integer `stageIndex`, and `nextAction`.

- [ ] Write a failing test with paid, pending, none, cancelled, and unparseable reward rows; assert filtering, order preservation, MYR parsing, and stage mapping.
- [ ] Run `node --import tsx --test tests/creator-activity-revenue-center.test.mjs` and confirm failure because `toCreatorSettlementItems` is missing.
- [ ] Add `CreatorSettlementLedgerRow`, `CreatorSettlementItem`, status-copy maps, and `toCreatorSettlementItems` using the existing `parseCreatorReward`.
- [ ] Re-run the focused test and confirm it passes.
- [ ] Commit the model and test.

### Task 2: Creator-scoped settlement ledger query

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `tests/creator-performance-contract.test.mjs`

**Interfaces:**
- Consumes: `creatorId: string`.
- Produces: `getCreatorSettlementItems(creatorId): Promise<CreatorSettlementItem[]>`.

- [ ] Add a failing contract assertion requiring a query that joins `campaign_participations p` to `campaigns c`, selects the ledger fields, and includes `WHERE p.creator_account_id = $1`.
- [ ] Run `node --test tests/creator-performance-contract.test.mjs` and confirm failure because the query function is missing.
- [ ] Implement the query and pass its result through `toCreatorSettlementItems`.
- [ ] Re-run the contract test and confirm it passes.
- [ ] Commit the query and contract test.

### Task 3: Settlement center server page and responsive styles

**Files:**
- Modify: `src/app/dashboard/creator/settlement/page.tsx`
- Modify: `src/app/dashboard/creator/creator.css`
- Modify: `tests/creator-performance-contract.test.mjs`

**Interfaces:**
- Consumes: `getCreatorSettlementSummary`, `getCreatorSettlementItems`, persona currency filtering.
- Produces: summary cards, four-stage guide, campaign ledger linked to `/dashboard/creator/my-campaigns/[id]`, and payment guidance.

- [ ] Add failing page contract assertions for `creator-settlement-summary`, `creator-settlement-flow`, `creator-settlement-ledger`, `creator-payment-guide`, and mission detail links.
- [ ] Run the contract test and confirm failure because the new sections are absent.
- [ ] Rewrite the page with valid Korean copy and parallel data loading; retain empty state and currency filtering.
- [ ] Add scoped desktop styles and a `max-width: 760px` single-column responsive layout.
- [ ] Re-run the focused contract tests and confirm they pass.
- [ ] Commit the page, styles, and tests.

### Task 4: Full verification and deployment

**Files:**
- Verify only; no planned production edits.

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: deployed production settlement page.

- [ ] Run `node --import tsx --test tests/creator-activity-revenue-center.test.mjs`.
- [ ] Run `node --test tests/creator-performance-contract.test.mjs tests/creator-shell-contract.test.mjs`.
- [ ] Run `cmd /c npm run build` and confirm exit code 0.
- [ ] Commit any verification-only test corrections if necessary.
- [ ] Deploy the exact worktree root to Railway production service `k-modu`.
- [ ] Open `https://www.k-modu.co.kr/dashboard/creator/settlement`, visually inspect the desktop page, check horizontal overflow and browser console errors, and inspect mobile size if the browser viewport can be changed.
