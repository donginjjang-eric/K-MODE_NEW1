const EDITABLE_CAMPAIGN_STATUSES = new Set(["draft", "recruiting"]);

export function isAdminCampaignEditable(status) {
  return EDITABLE_CAMPAIGN_STATUSES.has(status);
}

export function safeHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function adminCampaignOperationMessage({ status = 0, code = "" } = {}) {
  if (!status || code === "network_error") return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
  if (code === "capacity_full") return "모집 인원이 모두 확정되었습니다. 확정 인원과 모집 인원을 확인해 주세요.";
  if (code === "already_participating") return "이미 이 캠페인에 참여 중인 크리에이터입니다.";
  if (code === "invalid_reward") return "리워드는 RM 420, VND 2,500,000처럼 통화 코드와 정수 금액 순서로 입력해 주세요.";
  if (code === "not_found" || status === 404) return "대상을 찾을 수 없습니다. 화면을 새로고침해 주세요.";
  if (code === "invalid_state" || status === 409) return "현재 상태에서는 이 작업을 할 수 없습니다. 화면을 새로고침해 최신 상태를 확인해 주세요.";
  if (code === "invalid_request" || status === 400) return "입력 내용과 선택한 작업을 확인해 주세요.";
  if (status === 401 || status === 403) return "관리자 로그인 상태와 권한을 확인해 주세요.";
  return "작업을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
