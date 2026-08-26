"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCampaignOperationMessage } from "@/lib/admin-campaign-ui";
import { normalizeCampaignDeadlineForDatetimeLocal } from "@/lib/admin-campaign";
import type { Campaign } from "@/lib/types";

const MARKET_OPTIONS = ["한국", "일본", "미국", "글로벌"];
const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "X"];

type AdminCampaignFormProps = {
  campaign?: Campaign;
  endpoint: string;
  method: "POST" | "PATCH";
  redirectTo?: string;
  onSuccess?: (campaign: Campaign) => void;
};

export default function AdminCampaignForm({ campaign, endpoint, method, redirectTo, onSuccess }: AdminCampaignFormProps) {
  const router = useRouter();
  const initial = useMemo(() => ({
    title: campaign?.title ?? "",
    category: campaign?.category ?? "",
    markets: campaign?.markets ?? [],
    platforms: campaign?.platforms ?? [],
    brief: campaign?.brief ?? "",
    reward_text: campaign?.reward_text ?? "",
    slots: String(campaign?.slots ?? 1),
    application_deadline: normalizeCampaignDeadlineForDatetimeLocal(campaign?.application_deadline),
    content_deadline: normalizeCampaignDeadlineForDatetimeLocal(campaign?.content_deadline),
    image_url: campaign?.image_urls[0] ?? "",
  }), [campaign]);
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(field: "markets" | "platforms", value: string) {
    setValues((current) => ({
      ...current,
      [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const applicationDeadline = new Date(values.application_deadline).getTime();
    const contentDeadline = new Date(values.content_deadline).getTime();
    if (!Number.isFinite(applicationDeadline) || !Number.isFinite(contentDeadline) || applicationDeadline >= contentDeadline) {
      setError("신청 마감은 콘텐츠 마감보다 빠른 날짜와 시간으로 입력해 주세요.");
      return;
    }
    setBusy(true);
    const imageUrl = values.image_url.trim();
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        category: values.category,
        markets: values.markets,
        platforms: values.platforms,
        brief: values.brief,
        reward_text: values.reward_text,
        slots: Number(values.slots),
        application_deadline: values.application_deadline,
        content_deadline: values.content_deadline,
        image_urls: imageUrl ? [imageUrl] : [],
      }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    setBusy(false);
    if (!response?.ok) {
      const code = typeof result.code === "string" ? result.code : response ? "" : "network_error";
      const apiError = typeof result.error === "string" ? result.error : "";
      setError(code === "invalid_reward" && apiError
        ? apiError
        : adminCampaignOperationMessage({ status: response?.status ?? 0, code }));
      return;
    }
    const saved = result.campaign as Campaign;
    if (onSuccess) onSuccess(saved);
    else if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <form className="admin-campaign-form st-card" onSubmit={submit}>
      <div className="admin-campaign-form-grid">
        <label>캠페인 제목<input name="title" value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} required /></label>
        <label>카테고리<input name="category" value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })} required /></label>
      </div>
      <fieldset><legend>진행 시장</legend><div className="admin-campaign-checks">{MARKET_OPTIONS.map((market) => <label key={market}><input type="checkbox" checked={values.markets.includes(market)} onChange={() => toggle("markets", market)} />{market}</label>)}</div></fieldset>
      <fieldset><legend>콘텐츠 플랫폼</legend><div className="admin-campaign-checks">{PLATFORM_OPTIONS.map((platform) => <label key={platform}><input type="checkbox" checked={values.platforms.includes(platform)} onChange={() => toggle("platforms", platform)} />{platform}</label>)}</div></fieldset>
      <label>캠페인 브리프<textarea name="brief" value={values.brief} onChange={(event) => setValues({ ...values, brief: event.target.value })} required /></label>
      <div className="admin-campaign-form-grid">
        <label>리워드<input name="reward" placeholder="RM 420 · VND 2,500,000 · USD 250" aria-describedby="campaign-reward-help" value={values.reward_text} onChange={(event) => setValues({ ...values, reward_text: event.target.value })} required /><small id="campaign-reward-help">통화 코드를 먼저 쓰고 정수 금액을 입력하세요. 예: RM 420, KRW 300,000</small></label>
        <label>모집 인원<input name="slots" type="number" min="1" value={values.slots} onChange={(event) => setValues({ ...values, slots: event.target.value })} required /></label>
        <label>신청 마감<input name="application_deadline" type="datetime-local" max={values.content_deadline || undefined} value={values.application_deadline} onChange={(event) => setValues({ ...values, application_deadline: event.target.value })} required /></label>
        <label>콘텐츠 마감<input name="content_deadline" type="datetime-local" min={values.application_deadline || undefined} value={values.content_deadline} onChange={(event) => setValues({ ...values, content_deadline: event.target.value })} required /></label>
      </div>
      <label>대표 이미지 URL (선택, HTTPS)<input name="image" type="url" inputMode="url" placeholder="https://" value={values.image_url} onChange={(event) => setValues({ ...values, image_url: event.target.value })} /></label>
      {error ? <p className="admin-campaign-error" role="alert" aria-live="polite">{error}</p> : null}
      <div className="admin-campaign-form-actions"><button className="st-btn primary" disabled={busy} type="submit">{busy ? "저장 중…" : "캠페인 저장"}</button></div>
    </form>
  );
}
