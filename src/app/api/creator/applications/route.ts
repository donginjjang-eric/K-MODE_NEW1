import { getCurrentUser } from "@/lib/auth";
import { createCreatorApplication, getCreatorAccountForUser } from "@/lib/db";
import { handleCreatorApplication } from "@/lib/creator-onboarding";

export async function POST(request: Request) {
  return handleCreatorApplication(request, { getCurrentUser, getCreatorAccountForUser, createCreatorApplication });
}
