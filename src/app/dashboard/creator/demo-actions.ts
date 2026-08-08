"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAdminCreatorAccount } from "@/lib/db";
import { resetCreatorBeautyDemo, seedCreatorBeautyDemo } from "@/lib/creator-demo";

async function getAdminCreatorForDemoAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("관리자 권한이 필요합니다.");
  }

  const creator = await getOrCreateAdminCreatorAccount(user.id, user.email);
  if (!creator) {
    throw new Error("관리자 크리에이터 프로필을 준비할 수 없습니다.");
  }

  return { user, creator };
}

function revalidateCreatorCenter() {
  revalidatePath("/dashboard/creator");
  revalidatePath("/dashboard/creator/campaigns");
  revalidatePath("/dashboard/creator/my-campaigns");
  revalidatePath("/dashboard/creator/submissions");
  revalidatePath("/dashboard/creator/settlement");
}

export async function seedDemoAction(): Promise<void> {
  const { user, creator } = await getAdminCreatorForDemoAction();
  await seedCreatorBeautyDemo(user.id, creator.id);
  revalidateCreatorCenter();
}

export async function resetDemoAction(): Promise<void> {
  const { user, creator } = await getAdminCreatorForDemoAction();
  await resetCreatorBeautyDemo(user.id, creator.id);
  revalidateCreatorCenter();
}
