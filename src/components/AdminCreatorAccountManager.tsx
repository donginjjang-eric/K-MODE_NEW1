"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminCreatorAccount } from "@/lib/db";

type CreatorRowProps = {
  creator: AdminCreatorAccount;
};

function statusLabel(status: AdminCreatorAccount["approval_status"]) {
  if (status === "approved") return "승인됨";
  if (status === "disabled") return "비활성화됨";
  return "연결 대기";
}

function CreatorRow({ creator }: CreatorRowProps) {
  const router = useRouter();
  const [email, setEmail] = useState(creator.google_email);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(status: "approved" | "disabled") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/creators/${encodeURIComponent(creator.creator_key)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "계정 상태를 변경하지 못했습니다.");
        return;
      }
      setMessage(status === "approved" ? "계정을 연결하고 승인했습니다." : "계정을 비활성화했습니다.");
      router.refresh();
    } catch {
      setMessage("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="admin-creator-account-row">
      <div className="admin-creator-summary">
        <div>
          <h2>{creator.display_name}</h2>
          <p>{creator.categories.join(" · ") || "분류 정보 없음"}</p>
        </div>
        <em className={`status-badge ${creator.approval_status === "approved" ? "approved" : creator.approval_status === "disabled" ? "disabled" : "pending"}`}>
          {statusLabel(creator.approval_status)}
        </em>
      </div>
      <dl className="admin-creator-meta">
        <div><dt>플랫폼</dt><dd>{creator.platform || "-"}</dd></div>
        <div><dt>마켓</dt><dd>{creator.market || "-"}</dd></div>
        <div><dt>현재 이메일</dt><dd>{creator.google_email || "연결되지 않음"}</dd></div>
        <div><dt>계정 상태</dt><dd>{creator.is_linked ? statusLabel(creator.approval_status) : "연결되지 않음"}</dd></div>
      </dl>
      <div className="admin-creator-action">
        <label>
          <span>Google 이메일</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="creator@gmail.com"
            disabled={busy}
            autoComplete="email"
          />
        </label>
        <div className="admin-creator-buttons">
          <button type="button" className="st-btn dark" onClick={() => save("approved")} disabled={busy}>연결 및 승인</button>
          <button type="button" className="st-btn light" onClick={() => save("disabled")} disabled={busy || !email.trim()}>비활성화</button>
        </div>
        {message ? <p className="admin-creator-message" role="status">{message}</p> : null}
      </div>
    </article>
  );
}

export default function AdminCreatorAccountManager({ creators }: { creators: AdminCreatorAccount[] }) {
  if (!creators.length) {
    return <div className="st-empty"><div className="ic">C</div><p>연결할 공개 크리에이터가 없습니다.</p></div>;
  }

  return <section className="admin-creator-account-list">{creators.map((creator) => <CreatorRow key={creator.creator_key} creator={creator} />)}</section>;
}
