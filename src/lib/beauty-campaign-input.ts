import { parseAdminCampaignCreateInput, parseAdminCampaignPatchInput } from "./admin-campaign-input.js";
import type { AdminCampaignInput, BeautyCampaignInput } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function splitProduct(value: Record<string, unknown>) {
  const { product_id, ...campaign } = value;
  return { productId: typeof product_id === "string" ? product_id.trim() : null, campaign };
}

export function parseBeautyCampaignCreateInput(value: unknown): BeautyCampaignInput | null {
  if (!isRecord(value)) return null;
  const { productId, campaign } = splitProduct(value);
  if (!productId) return null;
  const parsed = parseAdminCampaignCreateInput(campaign) as AdminCampaignInput | null;
  return parsed ? { ...parsed, product_id: productId } : null;
}

export function parseBeautyCampaignPatchInput(value: unknown): Partial<BeautyCampaignInput> | null {
  if (!isRecord(value)) return null;
  const { productId, campaign } = splitProduct(value);
  if ("product_id" in value && !productId) return null;
  if (!Object.keys(campaign).length) return productId ? { product_id: productId } : null;
  const parsed = parseAdminCampaignPatchInput(campaign) as Partial<AdminCampaignInput> | null;
  return parsed ? { ...parsed, ...(productId ? { product_id: productId } : {}) } : null;
}
