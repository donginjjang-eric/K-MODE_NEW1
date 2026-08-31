export const MAX_PRODUCT_IMAGES = 8;

export function normalizeProductImages(imageUrls: unknown, fallback = ""): string[] {
  const candidates = Array.isArray(imageUrls) ? imageUrls : [];
  const normalized = candidates
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = [...new Set(normalized)].slice(0, MAX_PRODUCT_IMAGES);
  if (unique.length) return unique;
  const legacy = fallback.trim();
  return legacy ? [legacy] : [];
}
