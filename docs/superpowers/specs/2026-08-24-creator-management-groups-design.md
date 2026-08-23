# Creator Membership and Management Groups Design

Date: 2026-08-24
Status: Approved in chat, pending written-spec review

## Objective

Convert the 24 creators added from the August Malaysia meeting into durable, administrator-onboarded creator members. Administrators must be able to manage each creator individually or assign many creators to a management group. A management agency can later receive read-only access to its assigned creators' campaigns, confirmed deals, and settlements.

The public presentation treats an approved administrator-onboarded creator as a normal service creator. Internally, the system retains an honest audit trail that distinguishes administrator onboarding from a creator-claimed login account.

## Verified Baseline

- The 24 newly added creators contribute 5,031,738 followers.
- The public creator board contains 97 creators and totals 56,620,886 followers.
- The current browser-rendered KPI includes the 24 creators correctly.
- The current administrator account page parses only creator cards present directly in `creators.html`; it does not discover the 24 creators inserted by `data/malaysia-meeting-creators.js`.
- `creator_accounts.user_id` is nullable, so an approved creator profile can exist before the creator claims a login account.
- Campaign participation, performance, and settlement records already reference `creator_accounts`, which is the correct boundary for agency read access.

## Selected Approach

Use durable creator membership records plus independent management groups.

This approach is preferred over placing a single `group_id` on each creator because it supports audit history, multiple agency staff members, and later ownership changes without rewriting creator identity. A generic organization/RBAC system is intentionally excluded because it exceeds the current requirement.

## Data Model

### Creator accounts

Extend `creator_accounts` so it is the durable identity and profile record for an onboarded creator. Add fields for:

- onboarding source: self registration or administrator onboarding;
- claim state: unclaimed or claimed;
- administrator who created the profile;
- profile image and public biography/specialty;
- Instagram and TikTok handles and profile URLs;
- per-platform follower counts and last verification time.

The 24 Malaysia meeting creators are inserted as approved, administrator-onboarded, unclaimed accounts. Their `user_id` remains null until identity claiming succeeds.

Public pages do not expose onboarding source or claim state. Administrator pages show both fields. A later creator login claims the existing account rather than creating a duplicate, and all campaign and settlement history remains attached to the existing creator account ID.

### Management groups

Create `creator_management_groups` with:

- ID;
- internal group name;
- optional agency name;
- optional administrator notes;
- active or inactive status;
- creating administrator;
- creation and update timestamps.

A group can exist before an agency or agency user is known.

### Group membership

Create `creator_management_group_members` with:

- group ID;
- creator account ID;
- assigning administrator;
- assignment timestamp.

A unique constraint on creator account ID makes this table represent current membership and permits only one group per creator in the first release. Moving a creator is a transactional reassignment; removing a creator deletes the current membership row. Historical changes are preserved in the audit log.

### Agency users

Extend the application role model with `agency`. Create `creator_management_group_users` with group ID, normalized invited email, nullable user ID, invitation status, inviting administrator, and timestamps. This maps one or more agency users to a group. An invited email is stored before its Google-authenticated user record exists; after verified login, the assignment links to that user.

Agency users are read-only. They cannot edit creator profiles, change group membership, accept campaign invitations, submit content, change performance, or alter settlement state.

### Audit log

Create `creator_management_audit_logs` containing actor, action, target group, target creator or agency user, before/after metadata, and timestamp. Record group creation, edits, assignments, moves, removals, agency-user invitations, deactivation, and creator-account claims.

## Creator Import and Synchronization

Add an idempotent server-side import for the 24 Malaysia meeting creators. The importer uses the stable creator slug/key and can run repeatedly without duplicate rows. It updates verified public profile fields and follower counts but does not overwrite a claimed user's login linkage.

The public board and administrator list must consume a shared canonical creator representation. Legacy static cards can remain during migration, but the 24 imported creators must be joined to their `creator_accounts` records and must not exist as a separate administrator-invisible catalogue.

Follower totals are derived from numeric per-platform follower fields. The aggregate must equal the sum of all rendered creator records, and the 24 imported records must contribute exactly 5,031,738 to the verified baseline until their follower data is deliberately refreshed.

## Administrator Experience

### Creator list

Upgrade `/dashboard/admin/creators` to support:

- search by creator name or social handle;
- filters for market, platform, management group, onboarding source, claim state, and approval state;
- individual creator rows with profile thumbnail, follower totals, account state, and group;
- multi-select checkboxes;
- bulk create-and-assign group;
- bulk assign to an existing group;
- bulk move or remove from a group.

### Creator detail

Provide an administrator detail surface for public profile fields, social accounts, follower verification data, onboarding/claim state, current management group, campaign history, and settlement summary.

### Group management

Provide group list and detail surfaces with group metadata, creator count, aggregate followers, assigned creators, agency users, campaign/deal summary, and settlement summary. Administrators can create, rename, deactivate, and assign creators or agency users.

Bulk operations must be transactional and return specific validation errors for missing creators, conflicting active membership, inactive groups, or duplicate agency emails.

## Agency Experience

Add a dedicated agency area guarded by the `agency` role. An agency user sees only groups explicitly assigned to that user.

For each group, the agency can read:

- assigned creator profiles;
- campaign invitations and current workflow stages;
- matched/accepted participations as confirmed deals;
- expected reward amount and currency;
- performance visibility already available for the creator campaign;
- settlement stage and settlement ledger information.

All authorization is enforced in server-side data access. Directly requesting another group's URL or API returns not found or forbidden without leaking group existence.

## Authentication and Claiming

Administrator-onboarded creators are real approved creator records but remain unclaimed until identity verification. Claiming requires a verified email associated with the creator record or a later administrator-approved verification workflow. Claiming links the existing `creator_accounts` row to the authenticated creator user and updates the user role to `creator` atomically.

Agency access uses verified Google login. An administrator invites an email to a group; a matching authenticated user receives the `agency` role and read-only group access. Removing the last active assignment removes agency-area access but does not delete the user.

## Authorization Rules

- Administrators can create and manage creators, groups, memberships, and agency-user assignments.
- Creator users can access only their own creator account and existing creator workflows.
- Agency users can read only assigned groups and the creator/campaign/deal/settlement data reachable through those groups.
- Agency users have no mutation endpoints in the first release.
- Public users can read approved public profile fields only.
- Internal onboarding source, claim state, administrator notes, agency emails, and audit records are never exposed publicly.

## Error Handling and Integrity

- Use database constraints to prevent duplicate creator keys and duplicate active group membership.
- Use transactions for bulk assignment, group moves, creator claiming, and agency-user activation.
- Preserve campaign, performance, and settlement history when a creator is claimed or moved between groups.
- Reject assignment to inactive groups.
- Reject duplicate agency invitation emails within the same group.
- Return stable Korean administrator errors without exposing database details.
- Treat missing or unauthorized agency resources as inaccessible at the server boundary.

## Testing and Verification

Automated coverage must include:

- idempotent import of all 24 creator accounts;
- exact 5,031,738 imported follower contribution and 56,620,886 verified board baseline;
- no duplicate creator created by repeated import;
- claimed account linkage preserved during synchronization;
- administrator search and filters;
- bulk group creation, assignment, move, and removal;
- one-active-group constraint;
- agency invitation and verified-login linkage;
- agency access to assigned campaigns, confirmed deals, rewards, and settlement data;
- denial of cross-group reads and all agency mutations;
- preservation of campaign and settlement history after creator claim;
- desktop and mobile visual verification for administrator and agency pages;
- production build, GitHub push, Railway deployment, health check, and direct operational URL verification.

## Delivery Sequence

1. Schema and domain model, including creator import and follower invariants.
2. Administrator creator and management-group operations.
3. Agency authentication and read-only data access.
4. Agency portal UI and end-to-end authorization verification.
5. Production migration, deployment, and operational verification.

## Explicit Non-Goals

- Agency profile editing.
- Agency campaign acceptance or content submission.
- Agency settlement mutations.
- Multiple simultaneous active management groups per creator.
- General-purpose organization/RBAC support.
- Automated social-platform follower refresh; the design stores verification timestamps and permits a later refresh service.
