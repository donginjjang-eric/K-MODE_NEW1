type ApprovalStatus = "pending" | "approved" | "disabled" | "rejected" | null;

export type AdminUserMembership = {
  role: string;
  creator_id: string | null;
  creator_key: string | null;
  creator_name: string | null;
  creator_approval_status: ApprovalStatus;
  designer_id: string | null;
  brand_name: string | null;
  designer_approval_status: ApprovalStatus;
};

export type AdminUserSegment = "creator_approved" | "creator_pending" | "designer_approved" | "designer_pending" | "not_applied" | "admin" | "disabled";

export type AdminUserQuickApproval = {
  kind: "creator" | "designer";
  approveUrl: string;
  approveMethod: "PATCH" | "POST";
  approveBody?: { approvalStatus: "approved" };
};

function approvalLabel(status: ApprovalStatus) {
  if (status === "approved") return "승인 완료";
  if (status === "disabled") return "비활성";
  if (status === "rejected") return "반려";
  return "승인 대기";
}

export function formatAdminJoinDate(value: string) {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return "-";
  const korea = new Date(instant.getTime() + 9 * 60 * 60 * 1000);
  return `${korea.getUTCFullYear()}.${String(korea.getUTCMonth() + 1).padStart(2, "0")}.${String(korea.getUTCDate()).padStart(2, "0")}`;
}

export function adminUserPresentation(user: AdminUserMembership) {
  if (user.role === "admin") return { roleLabel: "관리자", segment: "admin" as const, profileLabel: "-", status: null, statusLabel: "관리자", href: null };
  if (user.creator_id && user.creator_key) {
    const status = user.creator_approval_status ?? "pending";
    const segment: AdminUserSegment = status === "approved" ? "creator_approved" : status === "pending" ? "creator_pending" : "disabled";
    return { roleLabel: "크리에이터", segment, profileLabel: user.creator_name || "활동명 미입력", status, statusLabel: approvalLabel(status), href: `/dashboard/admin/creators/${encodeURIComponent(user.creator_key)}` };
  }
  if (user.designer_id) {
    const status = user.designer_approval_status ?? "pending";
    const segment: AdminUserSegment = status === "approved" ? "designer_approved" : status === "pending" ? "designer_pending" : "disabled";
    return { roleLabel: "브랜드 파트너", segment, profileLabel: user.brand_name || "브랜드명 미입력", status, statusLabel: approvalLabel(status), href: `/dashboard/admin/designers/${user.designer_id}` };
  }
  return { roleLabel: "미선택", segment: "not_applied" as const, profileLabel: "계정만 가입", status: "pending" as const, statusLabel: "계정만 가입", href: null };
}

export function adminUserQuickApproval(user: AdminUserMembership): AdminUserQuickApproval | null {
  if (user.creator_id && user.creator_key && (user.creator_approval_status ?? "pending") === "pending") {
    const url = `/api/admin/creators/${encodeURIComponent(user.creator_key)}`;
    return {
      kind: "creator",
      approveUrl: url,
      approveMethod: "PATCH",
      approveBody: { approvalStatus: "approved" },
    };
  }
  if (user.designer_id && (user.designer_approval_status ?? "pending") === "pending") {
    return {
      kind: "designer",
      approveUrl: `/api/admin/designers/${user.designer_id}/approve`,
      approveMethod: "POST",
    };
  }
  return null;
}
