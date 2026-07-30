"use client";

import { useState } from "react";

type State = "idle" | "loading" | "copied" | "no_report" | "error";

export function CopyRecordButton({ parentId }: { parentId: string }) {
  const [state, setState] = useState<State>("idle");

  async function handleCopy() {
    if (state === "loading") return;
    setState("loading");
    try {
      const res  = await fetch(`/api/reports/latest?parentId=${parentId}`);
      const json = await res.json() as { pasteText: string | null; error?: string };
      if (!res.ok || json.error) { setState("error"); return; }
      if (!json.pasteText) { setState("no_report"); setTimeout(() => setState("idle"), 2500); return; }
      await navigator.clipboard.writeText(json.pasteText);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  const label =
    state === "loading"  ? "…"
    : state === "copied"   ? "완료"
    : state === "no_report" ? "없음"
    : state === "error"    ? "오류"
    : "복사";

  const colorClass =
    state === "copied"    ? "text-emerald-600 hover:bg-emerald-50"
    : state === "no_report" ? "text-slate-400 hover:bg-slate-50"
    : state === "error"   ? "text-rose-500 hover:bg-rose-50"
    : "text-indigo-500 hover:bg-indigo-50";

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="최신 기록을 클립보드에 복사"
      className={`flex w-12 shrink-0 flex-col items-center justify-center gap-1 px-2 transition-colors ${colorClass}`}
    >
      {/* 클립보드 아이콘 */}
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
      </svg>
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}
