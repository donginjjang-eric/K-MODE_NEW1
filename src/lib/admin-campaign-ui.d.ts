import type { AdminCampaignStatus } from "./types";

export function isAdminCampaignEditable(status: AdminCampaignStatus): boolean;
export function safeHttpsUrl(value: unknown): string | null;
export function adminCampaignOperationMessage(input?: { status?: number; code?: string; error?: unknown }): string;
