export type CreatorApprovalStatus = "pending" | "approved" | "disabled";

export function creatorApprovalPresentation(status: CreatorApprovalStatus) {
  if (status === "approved") {
    return {
      icon: "✓",
      title: "승인 완료",
      description: "크리에이터 승인이 정상적으로 완료되었습니다.",
      actionLabel: "✓ 승인 완료",
      tone: "approved" as const,
    };
  }

  if (status === "disabled") {
    return {
      icon: "—",
      title: "승인 보류",
      description: "현재 크리에이터 승인이 보류된 상태입니다.",
      actionLabel: "승인하기",
      tone: "disabled" as const,
    };
  }

  return {
    icon: "!",
    title: "승인 대기",
    description: "SNS와 프로필을 확인한 뒤 승인해 주세요.",
    actionLabel: "승인하기",
    tone: "pending" as const,
  };
}
