import { cookies } from "next/headers";
import { createSessionToken, loginUser, passwordLoginDestination, sessionCookieName, sessionMaxAgeSeconds } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return Response.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }

  const user = await loginUser(email, password);
  if (!user) {
    return Response.json({ ok: false, error: "Invalid login." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });

  // 명시적인 안전한 복귀 경로가 없으면 역할별 대시보드로 이동한다.
  const dest = passwordLoginDestination(user, body.next);

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    // welcome=1: 도착 페이지에서 로그인 성공 토스트 표시
    redirectTo: `${dest}${dest.includes("?") ? "&" : "?"}welcome=1`,
  });
}
