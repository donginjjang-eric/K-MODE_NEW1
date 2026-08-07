import type { AdminParticipationAction, CampaignParticipation } from "./types";

type ParticipationDependencies = {
  adminId: string;
  transitionParticipationAsAdmin: (
    adminId: string,
    participationId: string,
    action: AdminParticipationAction,
    note?: string,
  ) => Promise<CampaignParticipation>;
  revalidatePath: (path: string) => void;
};

export function participationMutationError(error: unknown): Response;
export function handleAdminParticipationMutation(request: Request, participationId: string, dependencies: ParticipationDependencies): Promise<Response>;
