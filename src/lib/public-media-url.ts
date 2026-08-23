export function publicMediaUrl(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (/^(?:https?:)?\/\//i.test(normalized) || normalized.startsWith("/") || normalized.startsWith("data:")) {
    return normalized;
  }
  return `/${normalized.replace(/^\.\//, "")}`;
}
