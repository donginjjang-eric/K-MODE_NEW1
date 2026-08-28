"use client";

import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

type WorkspaceAccountCardProps = {
  centerLabel: string;
  title: string;
  detail?: string;
  avatarUrl?: string;
  initial?: string;
  publicHref?: string;
  publicLabel?: string;
  tone: "admin" | "creator" | "fashion" | "beauty";
};

export default function WorkspaceAccountCard({
  centerLabel,
  title,
  detail,
  avatarUrl,
  initial,
  publicHref,
  publicLabel = "공개 페이지",
  tone,
}: WorkspaceAccountCardProps) {
  return (
    <section className={`workspace-account-card is-${tone}`} aria-label={`${centerLabel} 로그인 계정`}>
      <div className="workspace-account-heading">
        <span className="workspace-account-avatar" aria-hidden="true">
          {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : (initial || title.charAt(0).toUpperCase())}
        </span>
        <span className="workspace-account-center">{centerLabel}</span>
      </div>
      <strong className="workspace-account-title">{title}</strong>
      {detail ? <small className="workspace-account-detail">{detail}</small> : null}
      <div className="workspace-account-actions">
        {publicHref ? <Link href={publicHref}>{publicLabel}</Link> : null}
        <LogoutButton />
      </div>
    </section>
  );
}
