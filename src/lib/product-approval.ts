import type { ApprovalStatus } from "./types";

export function initialProductApprovalStatus(autoApproveSetting = process.env.AUTO_APPROVE_PRODUCTS): ApprovalStatus {
  return autoApproveSetting === "false" ? "pending" : "approved";
}
