import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8").catch(() => "");
}

test("admin creator management exposes every searchable, filterable, selectable bulk control", async () => {
  const [page, table] = await Promise.all([
    source("../src/app/dashboard/admin/creators/page.tsx"),
    source("../src/components/AdminCreatorManagementTable.tsx"),
  ]);

  assert.match(page, /getCreatorAccountsForAdmin/);
  assert.match(page, /listManagedCreators/);
  assert.match(page, /hasDatabase/);
  assert.match(page, /creator_key/);
  assert.match(table, /이름 · 핸들 검색/);
  assert.match(table, /국가/);
  assert.match(table, /플랫폼/);
  assert.match(table, /관리 그룹/);
  assert.match(table, /가입 경로/);
  assert.match(table, /귀속 상태/);
  assert.match(table, /승인 상태/);
  assert.match(table, /aria-label="전체 크리에이터 선택"/);
  assert.match(table, /aria-label={`\$\{creator\.display_name\} 선택`}/);
  assert.match(table, /새 관리 그룹 만들기/);
  assert.match(table, /선택 크리에이터 그룹 지정/);
  assert.match(table, /그룹 이동/);
  assert.match(table, /그룹에서 제거/);
  assert.match(table, /회원 레코드 없음/);
});

test("creator detail and group administration pages expose the approved management facts and actions", async () => {
  const [detailPage, detailManager, groupsPage, groupPage, groupManager, nav] = await Promise.all([
    source("../src/app/dashboard/admin/creators/[creatorKey]/page.tsx"),
    source("../src/components/AdminCreatorDetailManager.tsx"),
    source("../src/app/dashboard/admin/creator-groups/page.tsx"),
    source("../src/app/dashboard/admin/creator-groups/[groupId]/page.tsx"),
    source("../src/components/AdminCreatorGroupManager.tsx"),
    source("../src/components/AdminNav.tsx"),
  ]);

  assert.match(detailPage, /getManagedCreatorDetail/);
  assert.match(detailManager, /공개 프로필/);
  assert.match(detailManager, /SNS 및 팔로워/);
  assert.match(detailManager, /확인 시각/);
  assert.match(detailManager, /가입 경로/);
  assert.match(detailManager, /계정 상태/);
  assert.match(detailManager, /캠페인 이력/);
  assert.match(detailManager, /정산 요약/);
  assert.match(groupsPage, /listCreatorManagementGroups/);
  assert.match(groupsPage, /group\.campaignCount/);
  assert.match(groupsPage, /group\.dealCount/);
  assert.match(groupsPage, /group\.settledCount/);
  assert.match(groupsPage, /group\.pendingSettlementCount/);
  assert.match(groupsPage, /group\.rewardTextCount/);
  assert.match(groupPage, /getCreatorManagementGroup/);
  assert.match(groupManager, /그룹 정보 수정/);
  assert.match(groupManager, /비활성화/);
  assert.match(groupManager, /구성원 배정/);
  assert.match(groupManager, /그룹 이동/);
  assert.match(groupManager, /구성원 제거/);
  assert.match(groupManager, /대행사 이메일 초대/);
  assert.match(groupManager, /대행사 연결 해제/);
  assert.match(groupManager, /감사 이력/);
  assert.match(groupManager, /memberMessage/);
  assert.match(groupManager, /agencyMessage/);
  assert.match(detailManager, /creatorGroupMessage/);
  assert.match(nav, /크리에이터 관리/);
  assert.match(nav, /관리 그룹/);
});

test("creator operations preserve verification truth, reconcile partial removals, and prevent empty group creation", async () => {
  const [table, detailManager] = await Promise.all([
    source("../src/components/AdminCreatorManagementTable.tsx"),
    source("../src/components/AdminCreatorDetailManager.tsx"),
  ]);

  assert.match(detailManager, /followersChanged/);
  assert.match(detailManager, /if \(followersChanged\)/);
  assert.doesNotMatch(detailManager, /followersVerifiedAt:\s*new Date\(\)\.toISOString\(\),/);
  assert.match(table, /Promise\.allSettled/);
  assert.match(table, /router\.refresh\(\)/);
  assert.match(table, /일부/);
  assert.match(table, /선택한 크리에이터로 새 관리 그룹을 만듭니다/);
  assert.match(table, /disabled=\{busy \|\| !selected\.size\}/);
});

test("creator management styling keeps bulk tools inline and table scrolling contained on mobile", async () => {
  const css = await source("../src/app/dashboard/admin/admin.css");

  assert.match(css, /admin-creator-management-table-wrap[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /admin-creator-bulk-tools/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*admin-creator-filters[\s\S]*grid-template-columns:\s*1fr/);
  assert.doesNotMatch(css, /admin-creator-bulk-tools[\s\S]{0,300}position:\s*fixed/);
  assert.match(css, /body:has\(\.admin-studio\)[\s\S]*quick-link-stack[\s\S]*display:\s*none/);
});
