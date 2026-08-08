# Task 3 report — Creator activity and revenue center

## Outcome

- Rebuilt the creator dashboard home as an activity/revenue center without replacing the existing dashboard framework, authentication, or routes.
- Kept the business direction explicit: Korean suppliers and products connect to overseas creators in Malaysia, Vietnam, Taiwan, and the United States.
- Added seven navigation destinations: 홈, 추천 캠페인, 내 미션, 콘텐츠 제작, 성과, 수익·정산, 등급.
- Preserved profile access through the creator identity card and mobile header.

## Implemented

- Four live KPIs: eligible recommendation count, deadlines today, expected earnings in creator-local currency, and cumulative orders from published content.
- Local reward parsing for RM/MYR, VND, TWD, USD, and KRW.
- Five-stage mission board: 제품 수령 → 콘텐츠 제작 → 검수 → 게시 → 정산.
- New campaign performance page with views, likes, comments, orders, revenue, and campaign rows.
- New grade page using STARTER (0), RISING (1–2), and PRO (3+) completed-campaign rules.
- Refined content production and local-currency settlement pages.
- Added critical Korean, Malay, Vietnamese, Traditional Chinese, and English translation labels; Malay remains the first overseas locale after Korean.
- Added responsive two-column KPI layout, mobile mission timeline, scroll-contained seven-item bottom navigation, tables, grade cards, and production layouts.

## TDD evidence

1. Added `tests/creator-activity-revenue-center.test.mjs` first.
2. RED: 5/5 tests failed because the seven-item nav, KPI labels, domain helper, routes, and translations were absent.
3. GREEN: implemented the minimum domain/UI/routes and reran the same test; 5/5 passed.

## Review fix round

All six Important findings were reproduced with failing tests before the fixes:

1. Recommendation eligibility now requires both the creator market and channel when a campaign explicitly targets them. Empty target arrays remain intentionally global.
2. Expected earnings now include only accepted, active work (`matched` through `settlement`), exclude paid/terminal/unaccepted work, and sum only rewards already denominated in the creator's local currency. Foreign-only rewards show `—`; no implicit conversion or foreign fallback is performed.
3. The database has cumulative campaign performance but no per-order event timestamp. The misleading “monthly orders” calculation based on `campaign_performance.updated_at` was removed. The KPI is now explicitly “누적 주문 / Total orders” and sums the current cumulative performance snapshot.
4. `invited`, `applied`, and `matched` are represented as pre-shipping states and do not falsely highlight “제품 수령”. `cancelled` and `completed` are excluded from active-mission selection, while the approved five operational stages remain unchanged.
5. Critical KPI descriptions, next-step fallback, grade thresholds, mission labels/details, and production guidance were completed for Malay, Vietnamese, Traditional Chinese, and English.
6. The stale creator campaign pages contract was updated to the current activity-center data flow. Behavior tests now directly execute recommendation filtering, reward/status/currency calculation, cumulative order calculation, stage mapping, and active mission selection.

## Review follow-up — market aliases and complete home actions

- Campaign market matching now canonicalizes production conventions for Malaysia (`Malaysia`, `말레이시아`, `MY`, `MYS`, `ms-MY`), Vietnam (`Vietnam`, `베트남`, `VN`, `VNM`, `vi-VN`), Taiwan (`Taiwan`, `대만`, `TW`, `TWN`, `zh-TW`), the United States (`United States`, `USA`, `US`, `미국`, `en-US`), and South Korea (`South Korea`, `대한민국`, `한국`, `KR`, `KOR`, `ko-KR`).
- `글로벌`, `Global`, `worldwide`, `all`, and an empty target list are explicit market wildcards.
- The reserved administrator-preview identity convention (`market = South Korea`, `platform = K-MODU`) can inspect overseas recruiting campaigns. A behavior test imports the real demo campaign definitions and confirms the operator sees both the Malaysia and Vietnam recruiting demos.
- Added complete Malay, Vietnamese, Traditional Chinese, and English runtime dictionary entries for the creator-home description, view/detail actions, reward and deadline fallbacks, all three pre-shipping states, and recommendation/mission empty states.
- The pre-shipping helper outputs (`초대 확인 전`, `지원 검토 중`, `배송 준비 중`) are asserted against the exact runtime dictionary keys so dynamically rendered badges are translated.

## Final whole-branch review fixes

1. Demo campaign access is now provenance-gated. `[DEMO]` and `demo-beauty-*` campaigns are excluded from recommendations and application for normal creators, including identities that spoof the preview market/platform. Only the administrator-owned preview creator can access them.
2. Demo reset now validates ownership of the campaign and every related participation instead of requiring an exact seed payload. Legitimate runtime changes to statuses, submissions, events, and performance remain resettable, while foreign creator/campaign graph collisions are rejected before deletion. Reset deletes only the administrator-owned demo campaign graph.
3. Settlement totals now come from creator participation `expected_reward` values. Product gross sales in `campaign_performance.revenue` remain available only to the performance view and are never substituted for creator compensation. The completed demo reward settles as `RM 420`.
4. Administrator preview earnings are explicitly presented as a currency-by-currency demo reward breakdown, for example `RM 420 · VND 2,500,000`, without pretending to convert into a South Korean local currency.
5. Supplier/market, date/deadline, completed campaign count, and campaigns-remaining strings are rendered as composable translatable nodes. Their Korean, Malay, Vietnamese, Traditional Chinese, and English labels are present in the runtime dictionary.

## Final invitation, locale, and reward validation fixes

1. Administrator invitation creation now invokes the same demo-campaign access guard as creator applications. A real Malaysia/Vietnam creator cannot be invited to a demo campaign; only the administrator-owned South Korea/K-MODU preview identity is accepted.
2. Creator deadlines now use locale-aware `<time data-i18n-date>` rendering instead of a hardcoded Korean formatter. Performance table labels and grade copy/count fragments are translated in Korean, Malay, Vietnamese, Traditional Chinese, and English.
3. Campaign create and update validate rewards before database persistence. Accepted values use a supported currency code followed by a whole-number amount (`RM`, `MYR`, `VND`, `USD`, `TWD`, `KRW`); reversed, symbolic, decimal, and unstructured values return a clear `invalid_reward` API response.

## Final UI and test-harness completion

- Completed Malay, Vietnamese, Traditional Chinese, and English entries for performance and grade descriptions, aggregate/table labels, empty states, `전체 성과`, and `크리에이터 등급 안내`.
- The administrator campaign form now shows canonical reward examples and displays the server's `invalid_reward` guidance while retaining the existing generic fallback for all other failures.
- Corrected the locked transaction runner's default user role to administrator; its explicit non-admin mutation test remains and passes.

## Verification

- Focused and regression tests:
  - Command: `node --import tsx --experimental-test-module-mocks --test tests/creator-activity-revenue-center.test.mjs tests/creator-campaign-domain.test.ts tests/creator-campaign-pages-contract.test.mjs tests/creator-beauty-demo-domain.test.mjs tests/creator-beauty-demo-transaction-runner.mjs tests/creator-beauty-demo-controls.test.mjs tests/creator-mission-contract.test.mjs tests/creator-performance-contract.test.mjs tests/admin-creator-preview-contract.test.mjs`
  - Result: 39/39 passed.
- Final focused rerun: 17/17 passed.
- Follow-up focused suite: 21/21 passed, including campaign behavior, creator-home translations, campaign page contract, and administrator preview contract.
- TypeScript: `cmd /c npx.cmd tsc --noEmit --incremental false` passed.
- Final whole-branch creator suite: 57/57 passed across authentication, demo provenance/reset, recommendation/apply eligibility, activity/revenue calculations, mission flow, performance, settlement, translations, navigation, schema, and designer-studio isolation.
- Final targeted review suite: 33/33 passed.
- Final invitation/locale/reward targeted suite: 39/39 passed, followed by a passing non-incremental TypeScript check.
- Final exact transaction runner: 10/10 passed. Relevant i18n/UI suite: 22/22 passed. Non-incremental TypeScript check passed.
- Production build: `cmd /c npm.cmd run build` passed and compiled the new `/dashboard/creator/performance` and `/dashboard/creator/grade` routes.
- Build emitted only the existing multi-lockfile/workspace-root tracing warnings.
- The production build was not rerun for this review-fix commit because disk space was near zero and the previous Task 3 build had already passed. Focused behavior tests, the broader regression suite, and a fresh non-incremental TypeScript check were used instead.
- Per controller request, no full build was run for the final review commit; the controller will run it separately.
- No deployment or production mutation was performed.
- Local server started at `http://localhost:8012`, but visual dashboard inspection was redirected to `/login?error=creator_required` because the in-app browser did not have a localhost creator session. No production mutation or deployment was performed in this task.

## Files changed

- `src/lib/creator-center.ts`
- `src/lib/creator-campaigns.ts`
- `src/components/CreatorNav.tsx`
- `src/app/dashboard/creator/page.tsx`
- `src/app/dashboard/creator/performance/page.tsx`
- `src/app/dashboard/creator/grade/page.tsx`
- `src/app/dashboard/creator/settlement/page.tsx`
- `src/app/dashboard/creator/submissions/page.tsx`
- `src/app/dashboard/creator/creator.css`
- `site-i18n.js`
- `tests/creator-activity-revenue-center.test.mjs`
- `tests/creator-campaign-domain.test.ts`
- `tests/creator-campaign-pages-contract.test.mjs`
