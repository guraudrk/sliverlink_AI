"use client";

import { useState } from "react";

const RETENTION_OPTIONS: { label: string; value: number | null }[] = [
  { label: "분석 후 즉시 파기 (기본, 권장)", value: null },
  { label: "30일 보관 후 파기",               value: 30  },
  { label: "90일 보관 후 파기",               value: 90  },
  { label: "180일 보관 후 파기",              value: 180 },
];

type Props = {
  orgId: string;
  initialRetentionDays: number | null;
};

export function PrivacySettingsEditor({ orgId, initialRetentionDays }: Props) {
  const [days,   setDays]   = useState<number | null>(initialRetentionDays);
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/org/privacy-settings", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ orgId, recording_retention_days: days }),
    });
    setSaving(false);
    setMsg(res.ok ? "저장됐어요." : "저장 실패. 다시 시도해 주세요.");
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 leading-relaxed">
        통화 녹음은 AI 분석에만 사용되며, 기본값은 <strong>분석 완료 즉시 파기</strong>입니다.
        기관 내부 기준에 따라 보관 기간을 설정할 수 있습니다.
      </p>
      <div className="space-y-2">
        {RETENTION_OPTIONS.map((opt) => (
          <label key={String(opt.value)} className="flex cursor-pointer items-center gap-2.5">
            <input
              type="radio"
              name="retention"
              checked={days === opt.value}
              onChange={() => setDays(opt.value)}
              className="h-4 w-4 accent-indigo-600"
            />
            <span className={`text-sm ${days === opt.value ? "font-semibold text-slate-800" : "text-slate-600"}`}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-1">
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
