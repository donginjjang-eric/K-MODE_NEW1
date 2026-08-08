"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CREATOR_PERSONAS, creatorPersona } from "@/lib/creator-persona";

export function CreatorPersonaSwitch() {
  const pathname = usePathname();
  const selected = creatorPersona(useSearchParams().get("persona") || undefined);
  return <div className="creator-persona-switch" aria-label="해외 크리에이터 미리보기 국가">
    <span>해외 크리에이터 화면</span>
    {(Object.keys(CREATOR_PERSONAS) as Array<keyof typeof CREATOR_PERSONAS>).map((key) => {
      const item = CREATOR_PERSONAS[key];
      return <Link key={key} href={`${pathname}?persona=${key}`} className={selected === key ? "is-active" : ""}><b>{item.code}</b>{item.label}<small>{item.currency}</small></Link>;
    })}
  </div>;
}
