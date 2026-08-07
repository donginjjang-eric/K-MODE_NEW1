import type { AdminCampaignInput } from "./types";

export function parseAdminCampaignCreateInput(value: unknown): AdminCampaignInput | null;
export function parseAdminCampaignPatchInput(value: unknown): Partial<AdminCampaignInput> | null;
export function invalidCampaignInputResponse(): Response;
