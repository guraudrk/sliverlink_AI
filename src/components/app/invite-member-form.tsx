"use client";

import { useState } from "react";

const ROLE_OPTIONS = [
  { value: "social_worker", label: "전담사회복지사" },
  { value: "field_worker",  label: "생활지원사"   },
  { value: "admin",         label: "센터장(관리자)" },
];

type Props = { orgId: string };

export function InviteMemberForm({ orgId }: Props) {
  const [email,    setEmail]    = useState("");
  const [role,     setRole]     = useState("social_worker");
  const [sending,  setSending]  = useState(false);
  const [joinUrl,  setJoinUrl]  = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const submit = async () => {
    if (!email.includes("@")) { setError("올바른 이메일을 입력하세요."); return; }
    setSending(true);
    setError(null);
    setJoinUrl(null);

    const res = await fetch("/api/org/invite", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId, email, role }),
    });

    setSending(false);
    if (!res.ok) { setError("초대 생성 실패. 다시 시도해 주세요."); return; }

    const data = await res.json() as { joinUrl?: string; reused?: boolean };
    setJoinUrl(data.joinUrl ?? null);
    setEmail("");
  };

  const copy = () => {
    if (joinUrl) navigator.clipboard.writeText(joinUrl).catch(() => {});
  };

  return (
    <div className="space-y-3">
      <input
        type="email"
        placeholder="초대할 이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <div className="flex gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={submit}
          disabled={sending}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? "처리 중…" : "생성"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-500">{error}</p>}

      {joinUrl && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <p className="mb-1 text-xs font-semibold text-indigo-700">초대 링크 (7일 유효)</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 break-all text-xs text-slate-600">{joinUrl}</p>
            <button
              onClick={copy}
              className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:border-indigo-400"
            >
              복사
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            이 링크를 초대할 분께 전달하세요.
            {process.env.NODE_ENV !== "production" ? "" : " ENABLE_REAL_EMAIL=true 설정 시 이메일도 자동 발송됩니다."}
          </p>
        </div>
      )}
    </div>
  );
}
