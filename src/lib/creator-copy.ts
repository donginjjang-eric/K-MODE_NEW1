const STATUS_LABELS: Record<string, string> = {
  recruiting: "모집 중",
  applied: "지원 완료",
  invited: "초대됨",
  matched: "매칭 완료",
  shipping: "배송 중",
  creating: "제작 중",
  review: "검수 중",
  published: "게시 완료",
  settlement: "정산 중",
  completed: "완료",
  cancelled: "취소됨",
  rejected: "참여 종료",
  pending: "확인 중",
  approved: "승인됨",
};

const MATCH_REASON_LABELS: Record<string, string> = {
  market: "활동 국가 적합",
  platform: "활동 채널 적합",
  category: "관심 분야 적합",
  deadline: "현재 모집 중",
};

const FIELD_LABELS: Record<string, string> = {
  views: "조회수",
  likes: "좋아요",
  comments: "댓글",
  orders: "주문",
  revenue: "매출",
  currency: "통화",
};

export function creatorStatusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

export function creatorMatchReasonLabel(reason: string) {
  return MATCH_REASON_LABELS[reason] || reason;
}

export function creatorFieldLabel(field: string) {
  return FIELD_LABELS[field] || field;
}
