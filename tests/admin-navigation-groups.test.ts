import assert from "node:assert/strict";
import test from "node:test";

import { ADMIN_MOBILE_NAV, ADMIN_NAV_GROUPS } from "../src/lib/admin-navigation";

test("admin navigation separates operations by task", () => {
  assert.deepEqual(ADMIN_NAV_GROUPS.map((group) => group.label), [
    "운영 현황",
    "회원·파트너",
    "캠페인·거래",
    "콘텐츠 검수",
  ]);
  assert.deepEqual(ADMIN_NAV_GROUPS[1].items.map((item) => item.label), [
    "회원·승인 관리",
    "크리에이터 관리",
    "브랜드 파트너 관리",
    "관리 그룹·대행사",
  ]);
});

test("mobile navigation exposes the primary destinations before the full menu", () => {
  assert.deepEqual(ADMIN_MOBILE_NAV.map((item) => item.short), ["홈", "승인", "크리에이터", "캠페인", "상품"]);
});
