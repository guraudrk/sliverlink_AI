"use client";

import { useState } from "react";

type Props = {
  orgId: string;
  initialEnabled: boolean;
  initialEmails: string[];
};

export function ScheduleEditor({ orgId, initialEnabled, initialEmails }: Props) {
  const [enabled,  setEnabled]  = useState(initialEnabled);
  const [emailsRaw, setEmailsRaw] = useState(initialEmails.join(", "));
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const emails = emailsRaw
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    const res = await fetch("/api/org/schedule", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId, enabled, recipient_emails: emails }),
    });
    setSaving(false);
    setMsg(res.ok ? "저장됐어요." : "저장 실패. 다시 시도해 주세요.");
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* 발송 활성 토글 */}
      <label className="flex cursor-pointer items-center gap-3">
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${
            enabled ? "bg-indigo-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5.5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm text-slate-700">
          {enabled ? "매주 월요일 08:00 발송 활성" : "자동 발송 비활성"}
        </span>
      </label>

      {/* 수신 이메일 */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          수신 이메일 (쉼표 또는 줄바꿈으로 구분)
        </label>
        <textarea
          rows={3}
          value={emailsRaw}
          onChange={(e) => setEmailsRaw(e.target.value)}
          placeholder="caseworker@example.com, director@example.com"
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>
    </div>
  );
}
