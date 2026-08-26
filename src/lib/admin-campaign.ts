import type { AdminCampaignStatus, CampaignStatus, ParticipationStatus, SettlementStatus, SubmissionStatus } from "@/lib/types";

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "초안",
  recruiting: "모집 중",
  active: "진행 중",
  closed: "마감",
};

const PARTICIPATION_STATUS_LABELS: Record<ParticipationStatus, string> = {
  applied: "신청 접수",
  invited: "초대 발송",
  matched: "매칭 완료",
  shipping: "배송 진행",
  creating: "콘텐츠 제작",
  review: "콘텐츠 검수",
  published: "게시 완료",
  settlement: "정산 진행",
  completed: "완료",
  cancelled: "취소",
};

const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  none: "정산 전",
  pending: "정산 대기",
  confirmed: "정산 확인",
  paid: "지급 완료",
};

const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: "제출됨",
  revision_requested: "수정 요청",
  approved: "승인됨",
  published: "게시됨",
};

const CAMPAIGN_STATUS_ACTION_LABELS: Record<Exclude<AdminCampaignStatus, "draft">, string> = {
  recruiting: "모집 시작",
  active: "캠페인 시작",
  closed: "캠페인 마감",
};

const PARTICIPATION_NEXT_ACTION_LABELS: Record<string, string> = {
  "Await campaign response": "캠페인 응답 대기",
  "Campaign matched": "캠페인 매칭 완료",
  "Review campaign invitation": "캠페인 초대 검토",
  "Invitation declined": "초대 거절",
};

const CAMPAIGN_EVENT_MESSAGE_LABELS: Record<string, string> = {
  "Application accepted an existing invitation.": "기존 초대에 대한 신청이 승인되었습니다.",
  "Application submitted.": "캠페인 신청이 접수되었습니다.",
  "Campaign invitation created.": "캠페인 초대가 발송되었습니다.",
  "Invitation accepted.": "캠페인 초대가 수락되었습니다.",
  "Invitation declined.": "캠페인 초대가 거절되었습니다.",
};

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function isValidLocalDatetime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return date.getFullYear() === Number(year)
    && date.getMonth() === Number(month) - 1
    && date.getDate() === Number(day)
    && date.getHours() === Number(hour)
    && date.getMinutes() === Number(minute);
}

function formatLocalDatetime(date: Date) {
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}T${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

export function normalizeCampaignDeadlineForDatetimeLocal(value: unknown): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : formatLocalDatetime(value);
  if (typeof value !== "string") return "";

  const localDatetime = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)?.[0] ?? "";
  return isValidLocalDatetime(localDatetime) ? localDatetime : "";
}

export function campaignStatusLabel(status: CampaignStatus) {
  return CAMPAIGN_STATUS_LABELS[status];
}

export function campaignStatusActionLabel(status: Exclude<AdminCampaignStatus, "draft">) {
  return CAMPAIGN_STATUS_ACTION_LABELS[status];
}

export function participationStatusLabel(status: ParticipationStatus) {
  return PARTICIPATION_STATUS_LABELS[status];
}

export function settlementStatusLabel(status: SettlementStatus) {
  return SETTLEMENT_STATUS_LABELS[status];
}

export function submissionStatusLabel(status: SubmissionStatus) {
  return SUBMISSION_STATUS_LABELS[status];
}

export function participationSourceLabel(source: "application" | "invitation") {
  return source === "application" ? "신청" : "초대";
}

export function participationNextActionLabel(action: string) {
  return PARTICIPATION_NEXT_ACTION_LABELS[action] ?? action;
}

export function campaignEventMessageLabel(message: string) {
  const status = /^Status changed to (.+)\.$/.exec(message)?.[1] as ParticipationStatus | undefined;
  if (status && status in PARTICIPATION_STATUS_LABELS) return `상태가 ${participationStatusLabel(status)}로 변경되었습니다.`;
  return CAMPAIGN_EVENT_MESSAGE_LABELS[message] ?? message;
}

export function formatCampaignDeadline(value: unknown) {
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "미설정";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
