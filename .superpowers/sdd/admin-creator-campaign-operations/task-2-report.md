# Task 2 Report: Admin Campaign APIs and List/Form Screens

## Status

Implemented and committed. Browser visual verification was blocked before the local route rendered; automated verification and source-level accessibility/mobile review completed.

## RED evidence

`node --test tests/admin-campaign-pages-contract.test.mjs` failed as expected with two failures because the required campaign route and list component files did not exist:

- `ENOENT ... src/app/api/admin/campaigns/route.ts`
- `ENOENT ... src/components/AdminCampaignList.tsx`

## GREEN evidence

- `node --test tests/admin-campaign-pages-contract.test.mjs`: 2 passed, 0 failed.
- `npm.cmd run build`: completed successfully and includes the three admin campaign API routes plus list, new, and edit pages.
- `git diff --check`: no whitespace errors.

## Changed files

- `src/app/api/admin/campaigns/route.ts`
- `src/app/api/admin/campaigns/[id]/route.ts`
- `src/app/api/admin/campaigns/[id]/status/route.ts`
- `src/app/dashboard/admin/campaigns/page.tsx`
- `src/app/dashboard/admin/campaigns/new/page.tsx`
- `src/app/dashboard/admin/campaigns/[id]/edit/page.tsx`
- `src/components/AdminCampaignForm.tsx`
- `src/components/AdminCampaignList.tsx`
- `src/components/AdminNav.tsx`
- `src/app/dashboard/admin/admin.css`
- `tests/admin-campaign-pages-contract.test.mjs`

## Commit

`d786d629221977709eac1bcb16a8d09e9fe9e6d5` — `feat: add admin campaign list and editor`

## Self-review

- All mutation routes use the existing `requireUser("admin")` guard, validate malformed input, map invalid/not-found/state-conflict errors to 400/404/409, and revalidate campaign paths.
- The form uses visible labels, grouped checkbox controls, a polite live region for actionable Korean errors, and a disabled submit state.
- Mobile CSS collapses form columns; the table is safely horizontally scrollable. All added selectors are scoped under `.admin-studio`.
- No designer studio screen or API files were changed; there is no delete route.

## Review fixes

- `listAdminCampaigns` now returns `application_count` and `matched_count` from a grouped participation join; the list renders these values instead of hard-coded zeroes.
- Added the minimal `/dashboard/admin/campaigns/[id]` page so the post-create redirect resolves now; Task 3 can add its operations without changing the redirect.
- POST and PATCH now parse an allowlisted JSON shape before passing values to the domain layer. Malformed fields return a shared 400 response rather than reaching a 500 fallback.
- Added RED/GREEN regression coverage: four focused tests pass, including the count rendering and malformed-input 400 behavior.

## Concerns

- Local browser verification could not render `http://127.0.0.1:8010/dashboard/admin/campaigns`: both available browser surfaces returned `ERR_BLOCKED_BY_CLIENT` before loading. The production build emits existing Turbopack workspace-root/NFT tracing warnings, but exited successfully.
