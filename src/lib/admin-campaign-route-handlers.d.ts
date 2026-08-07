import type { AdminCampaignInput, Campaign } from "./types";

type CreateDependencies = {
  adminId: string;
  createAdminCampaign: (adminId: string, input: AdminCampaignInput) => Promise<Campaign>;
  revalidatePath: (path: string) => void;
};

type UpdateDependencies = {
  adminId: string;
  updateAdminCampaign: (adminId: string, campaignId: string, input: Partial<AdminCampaignInput>) => Promise<Campaign>;
  revalidatePath: (path: string) => void;
};

export function campaignMutationError(error: unknown): Response;
export function handleAdminCampaignCreate(request: Request, dependencies: CreateDependencies): Promise<Response>;
export function handleAdminCampaignUpdate(request: Request, campaignId: string, dependencies: UpdateDependencies): Promise<Response>;
