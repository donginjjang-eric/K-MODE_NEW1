"use client";

// 파트너 로그인: 구글 로그인 단일 방식. 로그인된 상태면 상태 카드(누구로 로그인됨 + 다음 행동)를 보여준다.
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { validateCreatorSocialUrls, type CreatorSocialErrors } from "@/lib/creator-social-validation";
import { brandPartnerCenterPath } from "@/lib/brand-partner-center";

const PARAM_MESSAGES: Record<string, string> = {
  approval_required: "승인된 브랜드 파트너 계정만 사용할 수 있어요. 승인 완료 후 다시 로그인해주세요.",
  approval_pending: "브랜드 파트너 신청이 접수되어 있어요. 관리자 승인이 끝나면 같은 구글 계정으로 바로 이용할 수 있어요.",
  apply_required: "이 구글 계정으로 접수된 브랜드 파트너 신청이 없어요. 파트너 등록 신청을 먼저 완료해주세요.",
  choose_role: "로그인이 완료됐어요. 시작할 활동 유형을 선택해 주세요.",
  creator_approval_pending: "크리에이터 신청이 접수되어 있어요. 관리자 승인 후 크리에이터 센터를 이용할 수 있어요.",
  creator_disabled: "현재 크리에이터 계정이 비활성 상태예요. K-MODU 운영팀에 문의해 주세요.",
  login_required: "브랜드 파트너 등록 신청은 구글 로그인 후 진행돼요. 로그인하면 신청 페이지로 바로 이동해요.",
  designer_required: "브랜드 파트너 계정으로 로그인해야 이용할 수 있는 페이지예요.",
  admin_login: "관리자 콘솔은 로그인 후 이용할 수 있어요. 관리자 권한이 있는 구글 계정으로 로그인해주세요.",
  designer_login: "브랜드 파트너 스튜디오는 로그인 후 이용할 수 있어요. 구글 계정으로 로그인해주세요.",
  studio_profile_required: "이 계정에는 아직 브랜드 파트너 프로필이 없어요. 파트너 등록 신청을 완료하면 스튜디오가 열려요.",
  google_failed: "구글 로그인에 실패했어요. 잠시 후 다시 시도해주세요.",
  google_not_configured: "구글 로그인이 아직 설정되지 않았어요. 관리자에게 문의해주세요.",
};

type Me = {
  user: { id: string; email: string; role: string } | null;
  designer: { id: string; brandName: string; brandCategory?: string; approvalStatus: string } | null;
  creator: { id: string; displayName: string; approvalStatus: string } | null;
};

declare global {
  interface Window {
    __kmoduLoginAuthMeRequest?: Promise<Me | null>;
  }
}

const safeNextPathFromLocation = () => {
  const next = new URLSearchParams(window.location.search).get("next") || "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "";
};

const googleLoginHref = (nextPath: string) =>
  `/api/auth/google${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

const loadLoginAuthState = () => {
  if (window.__kmoduLoginAuthMeRequest) return window.__kmoduLoginAuthMeRequest;

  const request: Promise<Me | null> = fetch("/api/auth/me", { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<Me>) : null))
    .catch(() => null);
  window.__kmoduLoginAuthMeRequest = request;
  return request;
};

export default function LoginForm({ googleEnabled = false, previewRoleSelection = false }: { googleEnabled?: boolean; previewRoleSelection?: boolean }) {
  const [message, setMessage] = useState("");
  const [me, setMe] = useState<Me>(previewRoleSelection
    ? { user: { id: "preview", email: "new.creator@example.com", role: "designer" }, designer: null, creator: null }
    : { user: null, designer: null, creator: null });
  const [onboardingType, setOnboardingType] = useState<"" | "creator" | "designer">("");
  const [creatorForm, setCreatorForm] = useState({ displayName: "", market: "", category: "", instagramUrl: "", tiktokUrl: "", bio: "" });
  const [creatorSocialErrors, setCreatorSocialErrors] = useState<CreatorSocialErrors>({});
  // 하이드레이션 직후 CTA를 열되, URL의 next 경로를 읽기 전 클릭되는 것은 막는다.
  const [loginReady, setLoginReady] = useState(false);
  // 로그인 후 복귀할 사이트 내 경로 (예: /apply에서 유도된 경우)
  const [nextPath, setNextPath] = useState("");
  // 관리자 페이지 접근이 차단되어 온 경우: 계정 전환 안내를 최우선으로 보여준다.
  const [adminRequired, setAdminRequired] = useState(false);
  const [accountSwitchFailed, setAccountSwitchFailed] = useState(false);
  // 카카오톡 등 인앱 브라우저: 구글이 OAuth를 차단하므로 외부 브라우저로 탈출시킨다.
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const googleLoginStarted = useRef(false);
  // 이메일/비밀번호 로그인 (테스트 계정·백업 관리자용). 기본은 접혀 있고 토글로 연다.
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isKakao = ua.includes("kakaotalk");
    // 구글이 OAuth를 막는 주요 인앱 웹뷰. K-MODU 타깃(틱톡 크리에이터·말레이시아)을 고려해
    // 틱톡(musical_ly/bytedance/trill)·위챗(micromessenger)·스레드(barcelona)까지 포함.
    const isOtherInApp = /instagram|fbav|fban|fb_iab|micromessenger|line\/|naver\(inapp|daumapps|everytimeapp|musical_ly|bytedancewebview|tiktok|trill|threads|barcelona|snapchat|kakaostory/.test(ua);
    if (isKakao) {
      setInAppBrowser(true);
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
    } else if (isOtherInApp) {
      setInAppBrowser(true);
      // Android는 크롬으로 강제 전환 시도. iOS는 강제 전환 수단이 없어 안내 화면(수동 복사)으로 처리.
      if (ua.includes("android")) {
        window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`;
      }
    }
  }, []);

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("링크를 복사했어요. Safari·Chrome 등 기본 브라우저에 붙여넣어 열어주세요.");
    } catch {
      setMessage("링크 복사가 안 됐어요. 주소창의 URL을 길게 눌러 복사한 뒤 기본 브라우저에서 열어주세요.");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("notice") || params.get("error") || "";
    if (PARAM_MESSAGES[key]) setMessage(PARAM_MESSAGES[key]);
    if (params.get("error") === "google_failed") setAccountSwitchFailed(true);
    if (params.get("error") === "admin_required") setAdminRequired(true);
    const next = safeNextPathFromLocation();
    if (next) setNextPath(next);
    setLoginReady(true);

    if (previewRoleSelection) return;
    loadLoginAuthState()
      .then((data) => {
        if (data && data.user) setMe({ user: data.user, designer: data.designer || null, creator: data.creator || null });
      })
      .catch(() => {});
  }, [previewRoleSelection]);

  const startGoogleLogin = (event: MouseEvent<HTMLAnchorElement>) => {
    if (googleLoginStarted.current) {
      event.preventDefault();
      return;
    }

    googleLoginStarted.current = true;
    const target = googleLoginHref(safeNextPathFromLocation());
    if (event.currentTarget.getAttribute("href") !== target) {
      event.preventDefault();
      window.location.assign(target);
    }
  };

  const submitEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: nextPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setMessage("이메일 또는 비밀번호가 올바르지 않아요.");
        return;
      }
      // 서버가 안전한 next 또는 역할별 기본 대시보드를 단일 계약으로 결정한다.
      window.location.assign(String(data.redirectTo || "/"));
    } catch {
      setMessage("로그인 요청에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  const submitCreatorApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const socialErrors = validateCreatorSocialUrls(creatorForm.instagramUrl, creatorForm.tiktokUrl);
    setCreatorSocialErrors(socialErrors);
    if (Object.keys(socialErrors).length) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/creator/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(creatorForm),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "신청을 접수하지 못했습니다.");
      setMe((current) => ({ ...current, user: current.user ? { ...current.user, role: "creator" } : null, creator: { id: body.creator.id, displayName: creatorForm.displayName.trim(), approvalStatus: "approved" } }));
      setMessage("등록 완료! 크리에이터 센터를 바로 이용할 수 있어요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "신청을 접수하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (inAppBrowser) {
    return (
      <div className="generate-box login-form-card">
        <p className="login-status-email">외부 브라우저로 열어주세요</p>
        <p className="login-google-hint">
          카카오톡·인스타그램·틱톡 등 앱 안의 브라우저에서는 구글 정책상 로그인이 차단돼요.
          자동 전환되지 않으면 아래 버튼으로 링크를 복사해 Safari·Chrome 등 기본 브라우저에 붙여넣거나,
          우측 메뉴(⋮ 또는 공유 버튼)에서 &ldquo;다른 브라우저로 열기&rdquo;를 눌러주세요.
        </p>
        <button className="generate-button login-status-cta" type="button" onClick={copyCurrentUrl}>
          링크 복사하기
        </button>
        {message ? <p className="notice">{message}</p> : null}
      </div>
    );
  }

  if (!loginReady) {
    return (
      <div className="generate-box login-form-card">
        <p className="login-google-hint">로그인 상태를 확인하는 중…</p>
      </div>
    );
  }

  // 이미 로그인된 상태: 로그인 폼 대신 상태 카드
  if (me.user) {
    const isAdmin = me.user.role === "admin";
    const isAgency = me.user.role === "agency";
    const isCreator = me.user.role === "creator" && me.creator?.approvalStatus === "approved";
    const isCreatorPending = me.creator?.approvalStatus === "pending";
    const isApproved = me.designer?.approvalStatus === "approved";
    const isPending = !isApproved && Boolean(me.designer);
    const partnerCenterHref = brandPartnerCenterPath(me.designer?.brandCategory);
    return (
      <div className="generate-box login-form-card">
        <div className="login-status-head">
          <p className="login-status-badge">✓ 로그인됨</p>
          <p className="login-status-email">{me.user.email}</p>
        </div>

        {adminRequired && !isAdmin ? (
          <>
            <p className="login-google-hint">
              이 계정에는 관리자 권한이 없어요. 관리자 권한이 있는 계정으로 다시 로그인해주세요.
            </p>
            <button className="generate-button login-status-cta" type="button" onClick={logout}>
              로그아웃하고 다른 계정으로 로그인
            </button>
          </>
        ) : isAdmin ? (
          <>
            <p className="login-google-hint">관리자 계정으로 로그인되어 있어요.</p>
            <a className="generate-button login-status-cta" href="/dashboard/admin">관리자 콘솔 열기</a>
            {me.designer ? (
              <a className="generate-button login-status-cta" href={partnerCenterHref}>
                브랜드 파트너 스튜디오 열기 ({me.designer.brandName})
              </a>
            ) : (
              <a className="login-email-toggle" href="/apply">내 브랜드 등록하고 스튜디오 열기</a>
            )}
          </>
        ) : isAgency ? (
          <><p className="login-google-hint">관리 대행사 계정으로 로그인되어 있어요.</p><a className="generate-button login-status-cta" href="/dashboard/agency">대행사 조회 화면 열기</a></>
        ) : isCreator ? (
          <>
            <p className="login-google-hint">{me.creator?.displayName || "크리에이터"} 계정으로 로그인되어 있어요.</p>
            <a className="generate-button login-status-cta" href="/dashboard/creator">크리에이터 센터 열기</a>
            <a className="login-email-toggle" href="/apply">뷰티·패션 브랜드 작업공간 신청하기</a>
          </>
        ) : isCreatorPending ? (
          <div className="login-onboard"><p className="login-onboard-title">크리에이터 신청 검토 중</p><p className="login-google-hint"><b>{me.creator?.displayName}</b>님의 SNS와 프로필을 운영팀이 확인하고 있어요. 승인 후 같은 Google 계정으로 로그인하면 크리에이터 센터가 열립니다.</p><ol className="login-steps"><li className="is-done"><span>✓</span><div><b>크리에이터 신청</b><small>접수 완료</small></div></li><li className="is-active"><span>2</span><div><b>관리자 승인</b><small>프로필·SNS 확인 중</small></div></li><li><span>3</span><div><b>크리에이터 센터 오픈</b><small>캠페인·거래·정산 관리</small></div></li></ol></div>
        ) : isApproved ? (
          <>
            <p className="login-google-hint">{me.designer?.brandName || "브랜드 파트너"} 계정으로 로그인되어 있어요.</p>
            <a className="generate-button login-status-cta" href={partnerCenterHref}>브랜드 파트너 센터 열기</a>
          </>
        ) : isPending ? (
          <div className="login-onboard">
            <p className="login-onboard-title">신청이 접수됐어요 — 승인을 기다리는 중이에요</p>
            <p className="login-google-hint">
              <b>{me.designer?.brandName || "브랜드"}</b> 신청을 검토하고 있어요. 승인이 끝나면 이 화면에서 바로 스튜디오가 열려요. 같은 구글 계정으로 다시 들어오면 돼요.
            </p>
            <ol className="login-steps">
              <li className="is-done"><span>✓</span><div><b>브랜드 등록 신청</b><small>접수 완료</small></div></li>
              <li className="is-active"><span>2</span><div><b>관리자 승인</b><small>검토 중 · 승인되면 알려드려요</small></div></li>
              <li><span>3</span><div><b>스튜디오 오픈</b><small>룩북·상품 등록, 크리에이터 매칭</small></div></li>
            </ol>
          </div>
        ) : onboardingType === "creator" ? (
          <form className="login-onboard creator-application-form" onSubmit={submitCreatorApplication} noValidate>
            <div><button className="login-back-button" type="button" onClick={() => setOnboardingType("")}>← 유형 다시 선택</button><p className="login-onboard-title">크리에이터 등록</p><p className="login-google-hint">공개 프로필과 SNS를 입력하면 크리에이터 센터가 바로 열립니다.</p></div>
            <div className="creator-application-grid">
              <label className="login-field"><span>활동명 *</span><input required value={creatorForm.displayName} onChange={(e) => setCreatorForm({ ...creatorForm, displayName: e.target.value })} /></label>
              <label className="login-field"><span>활동 국가 *</span><input required placeholder="예: Malaysia" value={creatorForm.market} onChange={(e) => setCreatorForm({ ...creatorForm, market: e.target.value })} /></label>
              <label className="login-field"><span>주요 분야 *</span><input required placeholder="예: Beauty, Fashion" value={creatorForm.category} onChange={(e) => setCreatorForm({ ...creatorForm, category: e.target.value })} /></label>
              <label className="login-field"><span>Instagram URL</span><input type="url" inputMode="url" placeholder="https://instagram.com/..." value={creatorForm.instagramUrl} aria-invalid={Boolean(creatorSocialErrors.instagramUrl)} aria-describedby={creatorSocialErrors.instagramUrl ? "instagram-url-error" : undefined} onChange={(e) => { setCreatorForm({ ...creatorForm, instagramUrl: e.target.value }); setCreatorSocialErrors({}); }} />{creatorSocialErrors.instagramUrl ? <small className="creator-field-error" id="instagram-url-error">{creatorSocialErrors.instagramUrl}</small> : null}</label>
              <label className="login-field"><span>TikTok URL</span><input type="url" inputMode="url" placeholder="https://tiktok.com/@..." value={creatorForm.tiktokUrl} aria-invalid={Boolean(creatorSocialErrors.tiktokUrl)} aria-describedby={creatorSocialErrors.tiktokUrl ? "tiktok-url-error" : undefined} onChange={(e) => { setCreatorForm({ ...creatorForm, tiktokUrl: e.target.value }); setCreatorSocialErrors({}); }} />{creatorSocialErrors.tiktokUrl ? <small className="creator-field-error" id="tiktok-url-error">{creatorSocialErrors.tiktokUrl}</small> : null}</label>
              <label className="login-field is-wide"><span>소개</span><textarea value={creatorForm.bio} onChange={(e) => setCreatorForm({ ...creatorForm, bio: e.target.value })} /></label>
            </div>
            <p className="creator-social-requirement">Instagram 또는 TikTok 중 하나만 입력해도 신청할 수 있어요.</p>
            {creatorSocialErrors.form ? <p className="creator-social-requirement is-error" role="alert">{creatorSocialErrors.form}</p> : null}
            <button className="generate-button login-status-cta" type="submit" disabled={submitting}>{submitting ? "등록 중…" : "크리에이터로 시작하기"}</button>
          </form>
        ) : onboardingType === "designer" ? (
          <div className="login-onboard">
            <p className="login-onboard-title">환영해요! K&#8209;MODU 브랜드 파트너로 시작해볼까요?</p>
            <p className="login-google-hint">K-뷰티·K-패션 브랜드를 등록하고 상품과 캠페인을 글로벌 크리에이터와 연결해요.</p>
            <ol className="login-steps">
              <li className="is-active"><span>1</span><div><b>브랜드 등록 신청</b><small>브랜드명·소개만 입력 (1분)</small></div></li>
              <li><span>2</span><div><b>신청 즉시 스튜디오 오픈</b><small>상품·룩북 등록 · AI 룩 생성 · 크리에이터 매칭</small></div></li>
            </ol>
            <a className="generate-button login-status-cta" href="/apply">브랜드 파트너 등록 신청하기</a>
            <button className="login-email-toggle" type="button" onClick={() => setOnboardingType("")}>유형 다시 선택</button>
          </div>
        ) : (
          <div className="login-onboard">
            <p className="login-onboard-title">어떤 유형으로 K-MODU를 시작하시겠어요?</p>
            <p className="login-google-hint">가입 목적에 맞는 전용 화면과 관리 기능을 제공합니다.</p>
            <div className="login-role-options">
              <button type="button" onClick={() => setOnboardingType("creator")}><strong>크리에이터로 시작</strong><span>프로필·SNS 등록 후 캠페인과 거래를 관리해요.</span></button>
              <button type="button" onClick={() => setOnboardingType("designer")}><strong>브랜드 파트너로 시작</strong><span>K-뷰티·K-패션 상품을 등록하고 크리에이터와 협업해요.</span></button>
            </div>
          </div>
        )}

        {accountSwitchFailed ? <p className="login-account-switch-notice" role="alert">Google 계정 전환이 완료되지 않아 기존 K-MODU 로그인 계정을 유지하고 있습니다.</p> : null}
        {googleEnabled ? (
          <form action="/api/auth/google/switch" method="post" className="login-account-switch-form">
            <button className="generate-button login-status-cta" type="submit">다른 Google 계정으로 전환</button>
            <small>현재 K-MODU 세션을 종료하고 Google 계정을 다시 선택합니다.</small>
          </form>
        ) : null}

        <button className="login-email-toggle" type="button" onClick={logout}>로그아웃</button>
        {message ? <p className="notice">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="generate-box login-form-card">
      {googleEnabled ? (
        <>
          <a className="google-login-button" href={googleLoginHref(nextPath)} onClick={startGoogleLogin}>
            <span className="g-chip" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </span>
            Google로 시작하기
          </a>
          <p className="login-google-hint">
            처음이라면 로그인 후 크리에이터 또는 브랜드 파트너 유형을 선택할 수 있어요.
          </p>
        </>
      ) : (
        <p className="login-google-hint">구글 로그인이 아직 설정되지 않았어요. 관리자에게 문의해주세요.</p>
      )}
      {/* site-i18n.js가 텍스트 노드를 교체하므로 라벨만 바꾸면 화면에 안 남는다 → key로 버튼 자체를 갈아끼운다 */}
      {emailOpen ? (
        <button key="email-close" className="login-email-toggle" type="button" onClick={() => setEmailOpen(false)}>이메일 로그인 닫기</button>
      ) : (
        <button key="email-open" className="login-email-toggle" type="button" onClick={() => setEmailOpen(true)}>이메일로 로그인 (테스트·백업 계정)</button>
      )}
      {emailOpen ? (
        <form className="login-email-form" onSubmit={submitEmailLogin}>
          <label className="login-field">
            <span className="kicker">이메일</span>
            <input type="email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="login-field">
            <span className="kicker">비밀번호</span>
            <input type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="generate-button" type="submit" disabled={submitting}>
            {submitting ? <span key="busy">로그인 중…</span> : <span key="idle">로그인</span>}
          </button>
        </form>
      ) : null}
      {message ? <p className="notice">{message}</p> : null}
    </div>
  );
}
