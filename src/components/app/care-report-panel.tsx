"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MarkdownContent } from "@/components/app/markdown-content";

const CHARS_PER_TICK = 12; // 타이핑 속도: 약 750자/초
const TICK_MS = 16;

type Props = {
  parentId: string;
  elderName: string;
  onClose: () => void;
  initialText?: string;
  onGenerated?: (text: string) => void;
};

export function CareReportPanel({ parentId, elderName, onClose, initialText, onGenerated }: Props) {
  const [displayText, setDisplayText] = useState(initialText ?? "");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(!initialText);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // API에서 받은 전체 텍스트를 버퍼로 보관 (setState 없이 ref)
  const bufferRef = useRef(initialText ?? "");
  const displayIdxRef = useRef(initialText?.length ?? 0);
  const textRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 타이핑 인터벌 — 컴포넌트 수명 동안 계속 실행
  // bufferRef에 내용이 생기면 12자씩 displayText를 전진시킨다
  useEffect(() => {
    const id = setInterval(() => {
      const buf = bufferRef.current;
      const cur = displayIdxRef.current;
      if (cur >= buf.length) {
        setIsTyping(false);
        return;
      }
      const next = Math.min(cur + CHARS_PER_TICK, buf.length);
      displayIdxRef.current = next;
      setIsTyping(next < buf.length);
      setDisplayText(buf.slice(0, next));
      if (textRef.current) {
        textRef.current.scrollTop = textRef.current.scrollHeight;
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []); // 마운트 시 한 번만

  const generate = useCallback(async () => {
    bufferRef.current = "";
    displayIdxRef.current = 0;
    setDisplayText("");
    setError(null);
    setLoading(true);
    setIsTyping(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/care-report", {
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

      // 수신된 텍스트는 bufferRef에만 저장 — 화면 표시는 인터벌이 담당
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bufferRef.current += decoder.decode(value, { stream: true });
      }

      onGenerated?.(bufferRef.current);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("생성 중 오류가 발생했어요.");
      }
    } finally {
      setLoading(false);
    }
  }, [parentId, onGenerated]);

  useEffect(() => {
    if (initialText) {
      bufferRef.current = initialText;
      displayIdxRef.current = initialText.length;
      return;
    }
    generate();
    return () => {
      abortRef.current?.abort();
    };
  }, [generate, initialText]);

  const fullText = bufferRef.current;

  async function handleCopy() {
    if (!fullText) return;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${elderName} 주간 케어 보고서</title>
      <style>body{font-family:sans-serif;padding:2rem;line-height:1.7;white-space:pre-wrap;font-size:14px}</style>
      </head><body>${fullText}</body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="AI 주간 케어 보고서"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 flex w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:mx-4 sm:my-4"
        style={{ height: "88dvh", maxHeight: "88dvh" }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">AI 자동 생성</p>
            <h2 className="font-bold text-slate-800">{elderName} — 주간 케어 보고서</h2>
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
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 text-sm leading-relaxed text-slate-700 sm:px-6"
        >
          {loading && (
            <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" />
              <p className="text-sm">보고서 생성 중…</p>
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-200">
              {error}
              <button
                onClick={generate}
                className="ml-3 font-semibold underline hover:no-underline"
              >
                다시 시도
              </button>
            </div>
          )}
          {displayText && (
            isTyping
              ? /* 타이핑 중: plain text + 커서 */
                <div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {displayText}
                    <span
                      className="inline-block h-[1em] w-0.5 translate-y-0.5 bg-teal-500 animate-cursor-blink ml-[1px] align-middle"
                      aria-hidden="true"
                    />
                  </p>
                </div>
              : /* 완료: 마크다운 렌더링 */
                <MarkdownContent text={displayText} />
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">※ AI 초안입니다. 반드시 검토 후 사용하세요.</p>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={!displayText || loading || isTyping}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              인쇄
            </button>
            <button
              onClick={handleCopy}
              disabled={!displayText || loading || isTyping}
              className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40 transition-colors"
            >
              {copied ? "복사됨 ✓" : "복사"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
