export const MAX_PRODUCT_DETAIL_IMAGES = 15;

export function normalizeProductDetailImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(cleaned)].slice(0, MAX_PRODUCT_DETAIL_IMAGES);
}
