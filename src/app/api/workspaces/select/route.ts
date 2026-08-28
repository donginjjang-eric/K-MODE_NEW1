import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { listUserWorkspaces, resolveUserWorkspace } from "@/lib/workspace-access";
import { safeWorkspaceNext, workspaceCookieName } from "@/lib/workspace-selection";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());
  const membershipId = String(body.membershipId || "");
  const candidate = (await listUserWorkspaces(user.id)).find((item) => item.id === membershipId);
  if (!candidate) return Response.json({ ok: false, error: "선택할 수 없는 작업공간입니다." }, { status: 403 });

  const workspace = await resolveUserWorkspace({
    userId: user.id,
    workspaceType: candidate.workspace_type,
    membershipId,
    requireActive: true,
  });
  if (!workspace) return Response.json({ ok: false, error: "승인된 작업공간만 이용할 수 있습니다." }, { status: 403 });

  const redirectTo = safeWorkspaceNext(body.next, workspace.workspace_type);
  const cookieStore = await cookies();
  cookieStore.set(workspaceCookieName, workspace.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  if (!contentType.includes("application/json")) return Response.redirect(new URL(redirectTo, request.url), 303);
  return Response.json({ ok: true, redirectTo });
}

