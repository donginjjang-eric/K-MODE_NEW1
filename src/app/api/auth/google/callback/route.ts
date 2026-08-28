// 구글 로그인 콜백: state 검증 → 토큰 교환 → 사용자 조회/자동 등록 → 세션 발급
import { cookies } from "next/headers";
import { createSessionToken, sessionCookieName, sessionMaxAgeSeconds } from "@/lib/auth";
import { findOrCreateGoogleUser, getCreatorAccountByEmail, linkCreatorAccountToUser } from "@/lib/db";
import { activateAgencyInvitationsForLogin } from "@/lib/creator-management";
import { creatorOnboardingDestination } from "@/lib/creator-onboarding";
import { brandPartnerCenterPath } from "@/lib/brand-partner-center";
import { backfillUserWorkspaceMemberships, listUserWorkspaces } from "@/lib/workspace-access";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  getRedirectUri,
  getRequestOrigin,
  oauthNextCookieName,
  oauthStateCookieName,
} from "@/lib/google-oauth";

export async function GET(request: Request) {
  const origin = getRequestOrigin(request);
  const url = new URL(request.url);
  const cookieStore = await cookies();

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = cookieStore.get(oauthStateCookieName)?.value;
  cookieStore.delete(oauthStateCookieName);
  const nextPath = cookieStore.get(oauthNextCookieName)?.value || "";
  cookieStore.delete(oauthNextCookieName);

  if (!code || !state || !expectedState || state !== expectedState) {
    console.error("[google-login] state check failed:", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasCookie: Boolean(expectedState),
    });
    return Response.redirect(`${origin}/login?error=google_failed`, 302);
  }

  try {
    const tokens = await exchangeGoogleCode(code, getRedirectUri(request));
    if (!tokens.access_token) {
      return Response.redirect(`${origin}/login?error=google_failed`, 302);
    }

    const profile = await fetchGoogleProfile(tokens.access_token);
    const email = String(profile.email || "").trim().toLowerCase();
    if (!email || profile.email_verified === false) {
      return Response.redirect(`${origin}/login?error=google_failed`, 302);
    }

    const { user, designer } = await findOrCreateGoogleUser(email);
    let sessionUser = user;
    let approvedCreator = false;
    let activeAgency = false;
    let creator: Awaited<ReturnType<typeof getCreatorAccountByEmail>> = null;

    // 계정 우선순위: 기존 관리자 → 승인 크리에이터 귀속 → 활성 대행사 초대 → 디자이너 기본 흐름.
    if (user.role === "admin") {
      sessionUser = user;
    } else {
      creator = await getCreatorAccountByEmail(email);
      if (creator?.approval_status === "approved") {
        const linkedCreator = await linkCreatorAccountToUser(creator.id, user.id, email);
        if (linkedCreator) {
          sessionUser = linkedCreator.user;
          approvedCreator = linkedCreator.user.role === "creator";
        }
      }

      if (!approvedCreator && sessionUser.role !== "admin" && sessionUser.role !== "creator") {
        const agencyActivation = await activateAgencyInvitationsForLogin(user.id, email);
        if (agencyActivation.hasActiveGroup && agencyActivation.role === "agency") {
          sessionUser = { ...sessionUser, role: "agency" };
          activeAgency = true;
        }
      }
    }

    cookieStore.set(sessionCookieName, createSessionToken({
      ...sessionUser,
      name: profile.name?.trim() || undefined,
      avatar: profile.picture?.trim() || undefined,
    }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAgeSeconds,
    });

    // 로그인은 원래 보던 곳으로 돌아가는 게 기본. 입구(/admin, /studio, /apply)로 들어온 경우만 그 목적지로 보낸다.
    const dest = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "";
    // 로그인 성공 피드백(토스트)용 플래그
    const withWelcome = (path: string) => `${origin}${path}${path.includes("?") ? "&" : "?"}welcome=1`;
    let userWorkspaces = await listUserWorkspaces(sessionUser.id);
    if (userWorkspaces.length === 0) {
      await backfillUserWorkspaceMemberships(sessionUser.id);
      userWorkspaces = await listUserWorkspaces(sessionUser.id);
    }
    const activeWorkspaces = userWorkspaces.filter((workspace) => workspace.status === "active");
    const workspaceDestination = !dest && activeWorkspaces.length > 1 ? "/dashboard/workspaces" : "";

    if (approvedCreator) {
      const creatorDestination = dest || "/dashboard/creator";
      return Response.redirect(withWelcome(workspaceDestination || creatorDestination), 302);
    }
    if (sessionUser.role === "admin") {
      return Response.redirect(withWelcome(dest || "/"), 302);
    }
    if (activeAgency) {
      const agencyDestination = dest || "/dashboard/agency";
      return Response.redirect(withWelcome(workspaceDestination || agencyDestination), 302);
    }
    if (designer && designer.approval_status !== "disabled" && designer.approval_status !== "rejected") {
      return Response.redirect(withWelcome(dest || workspaceDestination || brandPartnerCenterPath(designer.brand_category)), 302);
    }
    if (creator) return Response.redirect(`${origin}${creatorOnboardingDestination(creator)}`, 302);
    // 신청 내역이 없는 신규 계정은 크리에이터/디자이너 유형을 먼저 선택한다.
    return Response.redirect(dest ? withWelcome(dest) : `${origin}${creatorOnboardingDestination(null)}`, 302);
  } catch (error) {
    console.error("[google-login] callback failed:", error);
    return Response.redirect(`${origin}/login?error=google_failed`, 302);
  }
}
