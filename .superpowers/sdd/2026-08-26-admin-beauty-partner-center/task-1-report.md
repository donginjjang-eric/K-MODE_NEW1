# Task 1 Report — Admin Campaign Operations

## Summary

- Fixed the admin campaign edit crash by normalizing `Date`, string, nullable, and invalid deadline values before they reach `datetime-local` inputs.
- Added shared Korean labels for campaign lifecycle state, participant state/source, settlement state, submission state, known next actions, and known system event messages.
- Updated the campaign list, detail, status action, and participant/invitation controls to use Korean labels without changing existing API endpoints or lifecycle transitions.

## Files changed

- `src/lib/admin-campaign.ts` (new): deadline normalization, safe date display, and Korean presentation labels.
- `src/components/AdminCampaignForm.tsx`: consumes safe deadline normalization instead of calling `.slice()` directly.
- `src/components/AdminCampaignList.tsx`: Korean filters, headings, status labels, and safe deadline display.
- `src/components/AdminCampaignStatusAction.tsx`: Korean current-status and transition controls.
- `src/components/AdminCampaignOperations.tsx`: Korean participant, invitation, controls, empty states, and stored system messages.
- `src/app/dashboard/admin/campaigns/[id]/page.tsx`: Korean summary labels and safe date formatting.
- `tests/admin-campaign-domain.test.ts`: coverage for `Date`, ISO string, null/undefined, invalid values, timezone-bearing strings, and stored operation-message localization.

## Test-first evidence

1. Added the deadline-normalization test before `src/lib/admin-campaign.ts` existed.
   - Command: `node --import tsx --test tests/admin-campaign-domain.test.ts`
   - Expected failure observed: `ERR_MODULE_NOT_FOUND` for `src/lib/admin-campaign`.
2. Added the operation-message localization test before its helpers were exported.
   - Command: `node --import tsx --test tests/admin-campaign-domain.test.ts`
   - Expected failure observed: missing `campaignEventMessageLabel` export.
3. Implemented only the required helpers and component integrations, then re-ran verification.

## Verification

| Command | Result |
| --- | --- |
| `node --import tsx --test tests/admin-campaign-domain.test.ts` | Pass: 19 tests, 0 failures. |
| `node --experimental-test-module-mocks node_modules/tsx/dist/cli.mjs --test tests/admin-campaign-ui.test.ts` | Pass: 1 test, 0 failures. |
| `npm run build` | Pass: optimized production build and TypeScript completed successfully. |

The production build emitted existing workspace-root/lockfile and NFT tracing warnings from `next.config.mjs` and `src/app/assets/[...path]/route.ts`; it still exited with code 0.

## Self-review

- Date normalization preserves the explicit `YYYY-MM-DDTHH:mm` portion of timezone-bearing strings instead of unintentionally converting the form value to a different local time.
- Runtime `Date` values use local calendar parts and invalid/nullish values produce an empty input value, preventing the `.slice()` crash.
- The form continues to send the same deadline fields and uses the existing create/edit endpoints; lifecycle transition payloads and API routes are unchanged.
- Admin-entered operation notes remain unchanged; only known system-generated English strings are localized for display.
- No `/dashboard/designer/*` files were changed.

## Concerns

- Direct visual inspection of the protected admin campaign page could not be completed: the local preview redirects to `/login?notice=admin_login`. The preview server itself started successfully and the login page had content, no framework error overlay, and no captured console errors.
- An older broad regression command (`tests/admin-campaign-regression.test.mjs`) has a pre-existing line-ending-sensitive regex failure in its unchanged `creator-campaigns.ts` assertion. It is outside the focused Task 1 test set; the focused domain/UI tests above pass.

## Fix round 1 — canonical deadline suffix validation

### Covering test

- Extended `normalizes campaign deadlines for datetime-local inputs without changing explicit local time` in `tests/admin-campaign-domain.test.ts`.
- It now rejects `2026-09-01T09:30invalid` and `2026-09-01T09:30:45Zinvalid`, while preserving the existing ISO UTC (`...45.123Z`) and timezone-offset (`...45+09:00`) coverage.

### Test-first evidence

- Command: `node --import tsx --test tests/admin-campaign-domain.test.ts`
- Before the fix: expected empty string but received `2026-09-01T09:30` for the non-canonical suffix, confirming that the prefix-only regular expression was the cause.

### Verification

| Command | Output |
| --- | --- |
| `node --import tsx --test tests/admin-campaign-domain.test.ts` | Pass: 19 tests, 0 failures. |
| `node --experimental-test-module-mocks node_modules/tsx/dist/cli.mjs --test tests/admin-campaign-ui.test.ts` | Pass: 1 test, 0 failures. |
| `npm run build` | Pass: optimized production build and TypeScript completed successfully. |

The build retained the previously reported workspace-root/lockfile and NFT tracing warnings, but exited with code 0.

### Visual verification status

- No authenticated desktop or mobile visual verification was fabricated or claimed in this round.
- The protected admin campaign page remains an explicit Task 5 check, where an authenticated session must validate the desktop and mobile layouts.

## Fix round 2 — high-precision fractional seconds

### Covering test

- Extended `normalizes campaign deadlines for datetime-local inputs without changing explicit local time` in `tests/admin-campaign-domain.test.ts`.
- It now accepts `2026-09-01T09:30:45.123456Z` and `2026-09-01T09:30:45.123456+09:00`, both normalized to `2026-09-01T09:30`.
- The round 1 malformed-suffix cases remain in the same test, so the final end-of-string check continues to reject trailing garbage.

### Test-first evidence

- Command: `node --import tsx --test tests/admin-campaign-domain.test.ts`
- Before the fix: the 6-digit UTC fractional timestamp returned an empty string instead of `2026-09-01T09:30`, confirming that the former `{1,3}` fractional-second limit was the cause.

### Verification

| Command | Output |
| --- | --- |
| `node --import tsx --test tests/admin-campaign-domain.test.ts` | Pass: 19 tests, 0 failures. |
| `node --experimental-test-module-mocks node_modules/tsx/dist/cli.mjs --test tests/admin-campaign-ui.test.ts` | Pass: 1 test, 0 failures. |
| `npm run build` | Pass: optimized production build and TypeScript completed successfully. |

The build retained the previously reported workspace-root/lockfile and NFT tracing warnings, but exited with code 0.
