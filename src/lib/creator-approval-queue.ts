type ApprovalQueuedCreator = {
  approval_status: "pending" | "approved" | "disabled";
};

const approvalPriority = { pending: 0, approved: 1, disabled: 2 } as const;

export function prioritizePendingCreators<T extends ApprovalQueuedCreator>(creators: T[]): T[] {
  return [...creators].sort((left, right) => approvalPriority[left.approval_status] - approvalPriority[right.approval_status]);
}
