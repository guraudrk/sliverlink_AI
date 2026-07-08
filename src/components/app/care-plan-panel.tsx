"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Props = {
  parentId: string;
  elderName: string;
  onClose: () => void;
};

export function CarePlanPanel({ parentId, elderName, onClose }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    setText("");
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/care-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "생성에 실패했어요.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setText((prev) => prev + chunk);
        if (textRef.current) {
          textRef.current.scrollTop = textRef.current.scrollHeight;
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("생성 중 오류가 발생했어요.");
      }
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    generate();
    return () => { abortRef.current?.abort(); };
  }, [generate]);

  async function handleCopy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    const nextWeek = (() => {
      const d = new Date();
      const diff = d.getDay() === 0 ? 1 : 8 - d.getDay();
      d.setDate(d.getDate() + diff);
      return d.toLocaleDateString("ko-KR");
    })();
    win.document.write(`
      <html><head><title>${elderName} 케어 플랜 (${nextWeek}~)</title>
      <style>body{font-family:sans-serif;padding:2rem;line-height:1.7;white-space:pre-wrap;font-size:14px}</style>
      </head><body>${text}</body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="AI 케어 플랜"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 flex w-full max-w-xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl sm:mx-4 sm:my-4"
        style={{ maxHeight: "90dvh" }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">AI 자동 생성</p>
            <h2 className="font-bold text-slate-800">{elderName} — 다음 주 케어 플랜</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="닫기"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div
          ref={textRef}
          className="flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-slate-700"
          style={{ minHeight: "12rem" }}
        >
          {loading && !text && (
            <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
              <p className="text-sm">케어 플랜 생성 중…</p>
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-200">
              {error}
              <button onClick={generate} className="ml-3 font-semibold underline hover:no-underline">
                다시 시도
              </button>
            </div>
          )}
          {text && <pre className="whitespace-pre-wrap font-sans">{text}</pre>}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">※ AI 초안입니다. 반드시 검토 후 사용하세요.</p>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={!text || loading}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              인쇄
            </button>
            <button
              onClick={handleCopy}
              disabled={!text || loading}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              {copied ? "복사됨 ✓" : "복사"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
