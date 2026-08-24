import { cookies } from "next/headers";
import { sessionCookieName } from "@/lib/auth";
import { oauthNextCookieName, oauthStateCookieName } from "@/lib/google-oauth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  cookieStore.delete(oauthStateCookieName);
  cookieStore.delete(oauthNextCookieName);
  return Response.redirect(new URL("/api/auth/google", request.url), 303);
}
