"use client";

import { useCallback, useEffect, useState } from "react";

type Workspace = {
  id: string;
  workspace_type: "admin" | "creator" | "fashion_partner" | "beauty_partner" | "agency";
  status: "pending" | "active" | "disabled" | "rejected";
  is_default: boolean;
  resource_name: string | null;
};

const labels: Record<Workspace["workspace_type"], string> = {
  admin: "관리자",
  creator: "크리에이터",
  fashion_partner: "패션 브랜드",
  beauty_partner: "뷰티 브랜드",
  agency: "관리 대행사",
};

const statusLabels: Record<Workspace["status"], string> = {
  pending: "승인 대기",
  active: "승인 완료",
  disabled: "비활성",
  rejected: "반려",
};

export default function AdminUserWorkspaceManager({ userId, email, onChanged }: {
  userId: string;
  email: string;
  onChanged?: (message: string) => void;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [brandName, setBrandName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/workspaces`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "작업공간을 불러오지 못했습니다.");
      setWorkspaces(body.workspaces || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "작업공간을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const mutate = async (payload: Record<string, string>, method: "POST" | "PATCH" = "PATCH") => {
    const key = payload.membershipId || payload.action;
    setBusyId(key);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/workspaces`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "처리하지 못했습니다.");
      await load();
      setShowCreate(false);
      setBrandName("");
      onChanged?.("작업공간 권한이 반영되었습니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "처리하지 못했습니다.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="auw-manager" aria-labelledby="auw-title">
      <header><div><span>ACCOUNT WORKSPACES</span><h3 id="auw-title">작업공간 권한</h3></div><button type="button" onClick={() => setShowCreate((value) => !value)}>+ 뷰티 브랜드 추가</button></header>
      {showCreate ? (
        <form className="auw-create" onSubmit={(event) => { event.preventDefault(); void mutate({ action: "create_beauty_partner", brandName, contactEmail: email }, "POST"); }}>
          <label>뷰티 브랜드명<input value={brandName} onChange={(event) => setBrandName(event.target.value)} required /></label>
          <button type="submit" disabled={busyId === "create_beauty_partner"}>{busyId ? "생성 중…" : "승인 대기 작업공간 생성"}</button>
        </form>
      ) : null}
      {loading ? <p className="auw-state">불러오는 중…</p> : workspaces.length ? (
        <div className="auw-list">
          {workspaces.map((workspace) => (
            <article key={workspace.id} className={`auw-row is-${workspace.status}`}>
              <div><strong>{labels[workspace.workspace_type]}</strong><small>{workspace.resource_name || "연결 리소스 없음"}</small></div>
              <span>{statusLabels[workspace.status]}{workspace.is_default ? " · 기본 작업공간" : ""}</span>
              <div className="auw-actions">
                {workspace.status !== "active" ? <button type="button" disabled={Boolean(busyId)} onClick={() => void mutate({ action: "approve", membershipId: workspace.id })}>승인</button> : null}
                {workspace.status !== "disabled" ? <button type="button" disabled={Boolean(busyId)} onClick={() => void mutate({ action: "disable", membershipId: workspace.id })}>비활성화</button> : null}
                {!workspace.is_default && workspace.status === "active" ? <button type="button" disabled={Boolean(busyId)} onClick={() => void mutate({ action: "set_default", membershipId: workspace.id })}>기본 작업공간 설정</button> : null}
              </div>
            </article>
          ))}
        </div>
      ) : <p className="auw-state">등록된 작업공간이 없습니다.</p>}
      {error ? <p className="aum-review-error" role="alert">{error}</p> : null}
    </section>
  );
}
