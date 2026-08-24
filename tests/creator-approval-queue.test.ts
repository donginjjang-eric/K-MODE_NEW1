import test from "node:test";
import assert from "node:assert/strict";
import { prioritizePendingCreators } from "../src/lib/creator-approval-queue";

test("pending creator applications are placed before approved catalogue entries", () => {
  const creators = [
    { creator_key: "approved", approval_status: "approved" as const },
    { creator_key: "pending", approval_status: "pending" as const },
    { creator_key: "disabled", approval_status: "disabled" as const },
  ];

  assert.deepEqual(prioritizePendingCreators(creators).map((creator) => creator.creator_key), [
    "pending",
    "approved",
    "disabled",
  ]);
  assert.deepEqual(creators.map((creator) => creator.creator_key), ["approved", "pending", "disabled"]);
});
