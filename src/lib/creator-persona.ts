export type CreatorPersona = "malaysia" | "vietnam";
export const CREATOR_PERSONAS = {
  malaysia: { label: "말레이시아", market: "Malaysia", currency: "MYR", code: "MY" },
  vietnam: { label: "베트남", market: "Vietnam", currency: "VND", code: "VN" },
} as const;

export function creatorPersona(value?: string | string[]): CreatorPersona { return value === "vietnam" ? "vietnam" : "malaysia"; }
function normalizeMarket(value: string) {
  const compact = value.trim().toLowerCase().replace(/[\s._-]+/g, "");
  return ({ malaysia: "malaysia", malaysian: "malaysia", "말레이시아": "malaysia", my: "malaysia", vietnam: "vietnam", vietnamese: "vietnam", "베트남": "vietnam", vn: "vietnam", global: "global", worldwide: "global", all: "global", "전체": "global" } as Record<string,string>)[compact] || compact;
}
export function campaignMatchesPersona(markets: string[], persona: CreatorPersona) {
  const target = normalizeMarket(CREATOR_PERSONAS[persona].market);
  return markets.length === 0 || markets.some((market) => ["global", target].includes(normalizeMarket(market)));
}
export function currencyMatchesPersona(currency: string, persona: CreatorPersona) { return currency.toUpperCase() === CREATOR_PERSONAS[persona].currency; }
export function missionMatchesPersona(mission: { campaign_markets?: string[]; expected_reward?: string }, persona: CreatorPersona) {
  if (mission.campaign_markets?.length) return campaignMatchesPersona(mission.campaign_markets, persona);
  return (mission.expected_reward || "").toUpperCase().includes(CREATOR_PERSONAS[persona].currency);
}
export function creatorNextActionLabel(status: string) {
  return ({ invited: "초대 내용을 확인하고 참여 여부를 선택해 주세요.", applied: "공급자의 매칭 결과를 기다리고 있습니다.", matched: "한국 공급자가 제품 발송을 준비하고 있습니다.", shipping: "배송 정보와 예상 도착일을 확인해 주세요.", creating: "콘텐츠를 제작하고 검수 링크를 제출해 주세요.", review: "검수 의견을 확인하고 필요한 내용을 수정해 주세요.", published: "게시 성과를 확인하고 판매 데이터를 연결해 주세요.", settlement: "정산 정보와 지급 일정을 확인해 주세요.", completed: "협업이 완료되었습니다.", rejected: "이번 캠페인은 종료되었습니다." } as Record<string,string>)[status] || "다음 단계 안내를 확인해 주세요.";
}
