export type CreatorSocialErrors = { form?: string; instagramUrl?: string; tiktokUrl?: string };

function validSocialUrl(value: string, host: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && (url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}

export function validateCreatorSocialUrls(instagramValue: string, tiktokValue: string): CreatorSocialErrors {
  const instagramUrl = instagramValue.trim();
  const tiktokUrl = tiktokValue.trim();
  if (!instagramUrl && !tiktokUrl) return { form: "Instagram 또는 TikTok 주소를 하나 이상 입력해 주세요." };
  const errors: CreatorSocialErrors = {};
  if (instagramUrl && !validSocialUrl(instagramUrl, "instagram.com")) errors.instagramUrl = "Instagram 프로필 주소를 확인해 주세요. 예: https://www.instagram.com/아이디";
  if (tiktokUrl && !validSocialUrl(tiktokUrl, "tiktok.com")) errors.tiktokUrl = "TikTok 프로필 주소를 확인해 주세요. 예: https://www.tiktok.com/@아이디";
  return errors;
}
