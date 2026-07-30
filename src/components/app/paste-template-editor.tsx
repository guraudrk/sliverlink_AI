"use client";

import { useState } from "react";

const VARIABLE_HINTS = [
  { key: "{{period}}", desc: "기간 (예: 2026-07-27 ~ 2026-08-02)" },
  { key: "{{name}}", desc: "어르신 이름" },
  { key: "{{total_calls}}", desc: "총 통화 횟수" },
  { key: "{{answered_calls}}", desc: "응답 횟수" },
  { key: "{{response_rate}}", desc: "응답률 (예: 80%)" },
  { key: "{{attention}}", desc: "특이사항 (AI 생성)" },
  { key: "{{score_state}}", desc: "상태 점수 추이 (AI 생성)" },
  { key: "{{recommendation}}", desc: "권장 조치 (AI 생성)" },
];

type Props = {
  orgId: string;
  initialTemplate: string;
};

export function PasteTemplateEditor({ orgId, initialTemplate }: Props) {
  const [template, setTemplate]   = useState(initialTemplate);
  const [saving, setSaving]       = useState(false);
  const [savedMsg, setSavedMsg]   = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/org/paste-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, template }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        setSavedMsg(`오류: ${error}`);
      } else {
        setSavedMsg("저장됐습니다.");
        setTimeout(() => setSavedMsg(null), 3000);
      }
    } catch {
      setSavedMsg("네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 leading-relaxed">
        아래 변수를 사용해 기록 복사 형식을 자유롭게 편집하세요.
        AI가 생성한 특이사항·상태·권장 조치는 변수로 삽입됩니다.
      </p>

      {/* 변수 힌트 */}
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1 ring-1 ring-slate-200">
        {VARIABLE_HINTS.map((v) => (
          <div key={v.key} className="flex gap-2">
            <span className="font-mono text-indigo-600 w-36 shrink-0">{v.key}</span>
            <span>{v.desc}</span>
          </div>
        ))}
      </div>

      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        rows={6}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        spellCheck={false}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        {savedMsg && (
          <span className="text-sm text-slate-500">{savedMsg}</span>
        )}
      </div>
    </div>
  );
}
