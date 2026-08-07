# Malay Locale Design

## Goal

Keep Korean as the default language and add Bahasa Melayu as the first translated option in the global language selector.

## Locale order

The selector order is `한국어 → Bahasa Melayu → Tiếng Việt → 繁體中文 → English`.

## Scope

- Add the `ms-MY` locale and Malaysian flag metadata to the shared locale switcher.
- Translate shared navigation, actions, homepage, beauty market, designers, creators, login, and public modal copy already covered by `site-i18n.js`.
- Translate dynamic count phrases used by creator and designer listings.
- Preserve brand names, creator names, handles, product names, and user-entered catalogue data.
- Preserve Korean as the fallback whenever a Malay translation is unavailable.
- Persist the selected locale with the existing `kmodu.locale` storage key.

## Compatibility

No routes, authentication logic, APIs, or existing Korean/Vietnamese/Traditional Chinese/English translations change. Desktop and mobile use the same locale data and menu ordering.

## Verification

- Contract test verifies `ms-MY`, selector ordering, and representative Malay translations.
- Existing translation tests and production build must pass.
- Visually verify the deployed homepage and at least one listing page at desktop and mobile widths.
