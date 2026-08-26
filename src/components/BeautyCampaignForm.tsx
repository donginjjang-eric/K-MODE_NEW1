"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeCampaignDeadlineForDatetimeLocal } from "@/lib/admin-campaign";
import type { Campaign, Product } from "@/lib/types";

const MARKET_OPTIONS = ["한국", "말레이시아", "베트남", "대만", "글로벌"];
const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube"];

export type BeautyCampaignFormValue = Pick<Campaign,
  "id" | "product_id" | "title" | "category" | "markets" | "platforms" | "brief" |
  "reward_text" | "slots" | "application_deadline" | "content_deadline" | "image_urls"
>;

type Props = {
  products: Array<Pick<Product, "id" | "name" | "category">>;
  campaign?: BeautyCampaignFormValue;
};

export default function BeautyCampaignForm({ products, campaign }: Props) {
  const router = useRouter();
  const initial = useMemo(() => ({
    product_id: campaign?.product_id ?? products[0]?.id ?? "",
    title: campaign?.title ?? "",
    category: campaign?.category ?? products[0]?.category ?? "뷰티",
    markets: campaign?.markets ?? ["한국"],
    platforms: campaign?.platforms ?? ["Instagram"],
    brief: campaign?.brief ?? "",
    reward_text: campaign?.reward_text ?? "",
    slots: String(campaign?.slots ?? 1),
    application_deadline: normalizeCampaignDeadlineForDatetimeLocal(campaign?.application_deadline),
    content_deadline: normalizeCampaignDeadlineForDatetimeLocal(campaign?.content_deadline),
    image_url: campaign?.image_urls[0] ?? "",
  }), [campaign, products]);
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(field: "markets" | "platforms", value: string) {
    setValues((current) => ({ ...current, [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value] }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!values.product_id) {
      setError("캠페인에 연결할 상품을 선택해 주세요.");
      return;
    }
    const applicationDeadline = new Date(values.application_deadline).getTime();
    const contentDeadline = new Date(values.content_deadline).getTime();
    if (!Number.isFinite(applicationDeadline) || !Number.isFinite(contentDeadline) || applicationDeadline >= contentDeadline) {
      setError("신청 마감은 콘텐츠 마감보다 빠르게 입력해 주세요.");
      return;
    }
    setBusy(true);
    const response = await fetch(campaign ? `/api/beauty/campaigns/${campaign.id}` : "/api/beauty/campaigns", {
      method: campaign ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: values.product_id,
        title: values.title,
        category: values.category,
        markets: values.markets,
        platforms: values.platforms,
        brief: values.brief,
        reward_text: values.reward_text,
        slots: Number(values.slots),
        application_deadline: values.application_deadline,
        content_deadline: values.content_deadline,
        image_urls: values.image_url.trim() ? [values.image_url.trim()] : [],
      }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    setBusy(false);
    if (!response?.ok) {
      setError(typeof result.error === "string" ? result.error : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (!campaign) setValues(initial);
    router.refresh();
  }

  return <form className="beauty-campaign-form" onSubmit={submit}>
    <div className="beauty-form-grid">
      <label>연결 상품<select name="product_id" value={values.product_id} onChange={(event) => {
        const product = products.find((item) => item.id === event.target.value);
        setValues({ ...values, product_id: event.target.value, category: values.category || product?.category || "뷰티" });
      }} required>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <label>캠페인 제목<input name="title" value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} required /></label>
      <label>카테고리<input name="category" value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })} required /></label>
      <label>모집 인원<input name="slots" min="1" type="number" value={values.slots} onChange={(event) => setValues({ ...values, slots: event.target.value })} required /></label>
      <label>신청 마감<input name="application_deadline" type="datetime-local" max={values.content_deadline || undefined} value={values.application_deadline} onChange={(event) => setValues({ ...values, application_deadline: event.target.value })} required /></label>
      <label>콘텐츠 마감<input name="content_deadline" type="datetime-local" min={values.application_deadline || undefined} value={values.content_deadline} onChange={(event) => setValues({ ...values, content_deadline: event.target.value })} required /></label>
    </div>
    <fieldset><legend>타깃 시장</legend><div className="beauty-choice-row">{MARKET_OPTIONS.map((market) => <label key={market}><input checked={values.markets.includes(market)} onChange={() => toggle("markets", market)} type="checkbox" />{market}</label>)}</div></fieldset>
    <fieldset><legend>콘텐츠 플랫폼</legend><div className="beauty-choice-row">{PLATFORM_OPTIONS.map((platform) => <label key={platform}><input checked={values.platforms.includes(platform)} onChange={() => toggle("platforms", platform)} type="checkbox" />{platform}</label>)}</div></fieldset>
    <label>캠페인 브리프<textarea name="brief" value={values.brief} onChange={(event) => setValues({ ...values, brief: event.target.value })} required /></label>
    <div className="beauty-form-grid">
      <label>크리에이터 리워드<input name="reward_text" placeholder="KRW 300,000" value={values.reward_text} onChange={(event) => setValues({ ...values, reward_text: event.target.value })} required /><small>지원 통화 코드와 정수 금액으로 입력하세요.</small></label>
      <label>대표 이미지 URL (선택)<input name="image_url" placeholder="https://" type="url" value={values.image_url} onChange={(event) => setValues({ ...values, image_url: event.target.value })} /></label>
    </div>
    {error ? <p className="beauty-form-error" role="alert">{error}</p> : null}
    <button className="beauty-action primary" disabled={busy} type="submit">{busy ? "저장 중…" : campaign ? "수정 저장" : "초안 만들기"}</button>
  </form>;
}
