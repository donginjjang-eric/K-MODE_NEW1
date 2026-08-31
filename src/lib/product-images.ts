// 공개 상품 갤러리: 대표 썸네일 1장 + 추가 상품 이미지 4장.
export const MAX_PRODUCT_IMAGES = 5;

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
