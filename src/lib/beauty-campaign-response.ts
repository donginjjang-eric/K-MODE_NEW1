export function beautyCampaignMutationError(error: unknown) {
  const message = error instanceof Error ? error.message : "Beauty campaign operation failed.";
  if (/owned product was not found|campaign was not found|participation was not found/i.test(message)) {
    return Response.json({ code: "not_found", error: "이 브랜드가 관리할 수 있는 상품 또는 캠페인 정보를 찾을 수 없습니다." }, { status: 404 });
  }
  if (/capacity|cannot transition|only draft or recruiting/i.test(message)) {
    return Response.json({ code: "invalid_state", error: "현재 상태에서는 이 작업을 진행할 수 없습니다. 최신 상태를 확인해 주세요." }, { status: 409 });
  }
  if (/revision note|required|invalid|positive|at least|before|https|supported currency/i.test(message)) {
    return Response.json({ code: "invalid_request", error: "필수 항목, 리워드, 마감일과 검수 메모를 확인해 주세요." }, { status: 400 });
  }
  if (/beauty partner access/i.test(message)) {
    return Response.json({ code: "forbidden", error: "이 브랜드의 데이터를 변경할 권한이 없습니다." }, { status: 403 });
  }
  console.error("[beauty-campaign] mutation failed:", error);
  return Response.json({ code: "server_error", error: "요청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
}
