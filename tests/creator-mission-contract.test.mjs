import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("creator mission data keeps foreign participations private and creates versioned submissions in one transaction", async () => {
  const db = await source("../src/lib/db.ts");

  assert.match(db, /export async function getParticipationForCreator\(creatorId: string, participationId: string\)/);
  assert.match(db, /WHERE p\.id = \$2 AND p\.creator_account_id = \$1/);
  assert.match(db, /export async function createContentSubmission\(creatorId: string, participationId: string, input:/);
  assert.match(db, /withDatabaseTransaction\(async \(client\)/);
  assert.match(db, /campaign_participations WHERE id = \$1 AND creator_account_id = \$2 FOR UPDATE/);
  assert.match(db, /COALESCE\(MAX\(version\), 0\) \+ 1/);
  assert.match(db, /INSERT INTO content_submissions/);
  assert.match(db, /INSERT INTO campaign_events/);
  assert.match(db, /status = 'review'/);
});

test("invitation and submission APIs guard ownership, state, and HTTPS content", async () => {
  const [invitationRoute, submissionRoute] = await Promise.all([
    source("../src/app/api/creator/participations/[id]/invitation/route.ts"),
    source("../src/app/api/creator/participations/[id]/submissions/route.ts"),
  ]);

  assert.match(invitationRoute, /getApprovedCreatorForApi\(\)/);
  assert.match(invitationRoute, /respondToInvitation\(auth\.creator\.id, participationId, accept\)/);
  assert.match(invitationRoute, /status: 404/);
  assert.match(invitationRoute, /status: 409/);
  assert.match(submissionRoute, /getApprovedCreatorForApi\(\)/);
  assert.match(submissionRoute, /new URL\(/);
  assert.match(submissionRoute, /url\.protocol !== "https:"/);
  assert.match(submissionRoute, /createContentSubmission\(auth\.creator\.id, participationId/);
  assert.match(submissionRoute, /status: 404/);
  assert.match(submissionRoute, /status: 409/);
});

test("creator mission pages expose timeline, brief, history, review and publishing requirements", async () => {
  const [list, detail, submissions, form, invitationActions] = await Promise.all([
    source("../src/app/dashboard/creator/my-campaigns/page.tsx"),
    source("../src/app/dashboard/creator/my-campaigns/[id]/page.tsx"),
    source("../src/app/dashboard/creator/submissions/page.tsx"),
    source("../src/components/CreatorSubmissionForm.tsx"),
    source("../src/components/CreatorInvitationActions.tsx"),
  ]);

  assert.match(list, /requireApprovedCreator\(\)/);
  assert.match(list, /getCreatorMissionParticipations\(creator\.id\)/);
  assert.match(detail, /getParticipationForCreator\(creator\.id, participationId\)/);
  assert.match(detail, /notFound\(\)/);
  assert.match(detail, /timeline/i);
  assert.match(detail, /shipping_note/);
  assert.match(detail, /content_deadline/);
  assert.match(detail, /review_note/);
  assert.match(detail, /published_url/);
  assert.match(submissions, /CreatorSubmissionForm/);
  assert.match(form, /fetch\(`\/api\/creator\/participations\/\$\{participationId\}\/submissions`/);
  assert.match(form, /setContentUrl\(""\)/);
  assert.match(form, /if \(!response\.ok\)/);
  assert.ok(form.indexOf("if (!response.ok)") < form.indexOf('setContentUrl("")'), "network errors must preserve entered submission fields");
  assert.match(invitationActions, /fetch\(`\/api\/creator\/participations\/\$\{participationId\}\/invitation`/);
  assert.match(invitationActions, /accept/);
  assert.match(invitationActions, /respond\(false\)/);
});

test("invited mission cards retain a route to the brief beside invitation actions", async () => {
  const list = await source("../src/app/dashboard/creator/my-campaigns/page.tsx");

  assert.match(
    list,
    /participation\.status === "invited" \? <><CreatorInvitationActions participationId=\{participation\.id\} \/><Link href=\{`\/dashboard\/creator\/my-campaigns\/\$\{participation\.id\}`\}>View mission<\/Link><\/>/,
  );
});

test("mission timeline includes application and cancellation states as visible current states", async () => {
  const detail = await source("../src/app/dashboard/creator/my-campaigns/[id]/page.tsx");

  assert.match(detail, /const timeline = \["applied", "invited", "matched", "shipping", "creating", "review", "published", "settlement", "completed", "cancelled"\]/);
  assert.match(detail, /participation\.status === status \? "is-current" : ""/);
});
