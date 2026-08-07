# Malay Locale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Bahasa Melayu as the first translated language while keeping Korean as the default.

**Architecture:** Extend the existing static locale registry and translation table in `site-i18n.js`. Keep the current DOM translation, storage, and fallback behavior unchanged.

**Tech Stack:** Vanilla JavaScript, Node.js contract tests, static HTML/CSS.

## Global Constraints

- Korean remains the default locale.
- Locale order is Korean, Malay, Vietnamese, Traditional Chinese, English.
- Existing routes, authentication, APIs, and catalogue data remain unchanged.

---

### Task 1: Malay locale contract

**Files:**
- Create: `tests/malay-locale-contract.test.mjs`
- Modify: `site-i18n.js`

**Interfaces:**
- Consumes: existing `LOCALES`, `ORDER`, `TEXT`, `INDEX`, and `translated()` behavior.
- Produces: selectable `ms-MY` locale with Malay UI strings.

- [ ] **Step 1: Write the failing contract test**

Assert that `ms-MY` exists, follows `ko-KR` in `ORDER`, representative shared/page translations include Malay, and dynamic creator counts support Malay.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/malay-locale-contract.test.mjs`

Expected: FAIL because `ms-MY` is absent.

- [ ] **Step 3: Implement the minimal locale extension**

Add Malaysian locale metadata, insert Malay as the first translated column in `TEXT`, update locale indexes, and add Malay branches for dynamic count phrases.

- [ ] **Step 4: Run focused and full tests**

Run the focused contract, all JavaScript tests, TypeScript tests, and production build. All must pass.

- [ ] **Step 5: Visually verify and publish**

Check desktop and mobile language menus and translated pages, commit, push, deploy to Railway, and verify production.
