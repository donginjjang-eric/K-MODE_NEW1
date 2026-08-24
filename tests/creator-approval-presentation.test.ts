import test from "node:test";
import assert from "node:assert/strict";
import { creatorApprovalPresentation } from "../src/lib/creator-approval-presentation";

test("approved creator is shown as an unmistakable completed approval", () => {
  assert.deepEqual(creatorApprovalPresentation("approved"), {
    icon: "✓",
    title: "승인 완료",
    description: "크리에이터 승인이 정상적으로 완료되었습니다.",
    actionLabel: "✓ 승인 완료",
    tone: "approved",
  });
});

test("pending creator still prompts the administrator to approve", () => {
  assert.deepEqual(creatorApprovalPresentation("pending"), {
    icon: "!",
    title: "승인 대기",
    description: "SNS와 프로필을 확인한 뒤 승인해 주세요.",
    actionLabel: "승인하기",
    tone: "pending",
  });
});
