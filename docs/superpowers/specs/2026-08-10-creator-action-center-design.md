# Creator Action Center Design

## Goal

Make the K-MODU creator center practical on both mobile and desktop by showing the creator's next required action before secondary information.

## Experience principles

- One primary action per mission state.
- Mobile is optimized for completing work; desktop adds context without changing the flow.
- Use five creator-facing stages: delivery, production, review, publishing, settlement.
- Keep the selected language consistent; remove mixed Korean and English copy.
- Hide administrative controls and long history behind secondary disclosure.

## Screens

### Home

Lead with a personalized “today's action” card. Follow with deadlines, active missions, and expected earnings. Recommended campaigns and aggregate metrics remain secondary.

### My missions

Group missions into “needs attention”, “in progress”, and “completed”. Each mission card shows its current stage, deadline, reward, and exactly one primary action.

### Mission detail

Show a compact five-stage tracker, a sticky next-action panel, deadline and reward. Put campaign instructions, submission history, performance, settlement, and activity history into clearly separated sections. Long operational history is collapsed by default.

### Navigation

Desktop keeps the side rail. Mobile uses five bottom destinations: Home, Missions, Create, Settlement, More. More exposes campaigns, performance, grade, and profile.

## Responsive behavior

- Mobile: single column, sticky bottom action, compact stage tracker, minimum 44px controls.
- Desktop: main work column plus a supporting context column for deadlines, reward, and help.
- No horizontal scrolling at creator breakpoints.

## Data and behavior

Existing participation, submission, performance, and settlement records remain the source of truth. A shared presentation helper maps each participation status to its five-stage position, urgency group, label, action label, and action URL. No database migration is required.

## Error and empty states

Every empty state provides one useful next destination. Missing dates or rewards use clear Korean fallback copy. Unsupported or completed states link to the mission detail rather than presenting an invalid action.

## Verification

Run the production build, inspect the creator home, mission list, and mission detail at desktop and mobile sizes, and confirm there are no console errors, horizontal overflows, mixed-language primary UI, or dead primary actions.
