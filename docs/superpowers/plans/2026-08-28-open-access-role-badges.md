# Open Access and Role Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove person-account approval waiting while preserving moderation for public content, and add consistent role badges.

**Architecture:** Keep existing status columns for future reactivation of approvals, but write new person accounts as approved and migrate pending records. Centralize role badge labels in one utility and render them in the shared workspace switcher.

**Tech Stack:** Next.js 16, React 19, TypeScript, PostgreSQL, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-28-open-access-role-badges-design.md`

## Global Constraints

- Disabled and rejected access remains blocked.
- Product and generated-content moderation remains unchanged.
- Existing pending person accounts become usable on deployment.

---

### Task 1: Open account access

- [ ] Add failing account access contract tests.
- [ ] Make creator/designer creation approved and workspace creation active.
- [ ] Migrate existing pending person accounts and workspaces to active.
- [ ] Remove pending-account redirects while retaining disabled/rejected blocks.
- [ ] Run focused tests.

### Task 2: Unified role badges

- [ ] Add failing badge label and shared-header tests.
- [ ] Add centralized role badge labels and shared switcher markup/styles.
- [ ] Run focused tests.

### Task 3: Release verification

- [ ] Run full focused suite, TypeScript, and production build.
- [ ] Deploy master and wait for Railway success.
- [ ] Verify public API, admin, creator, fashion, and beauty routes at desktop/mobile sizes.
