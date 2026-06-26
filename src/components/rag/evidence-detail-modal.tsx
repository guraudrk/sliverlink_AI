"use client";

import { useEffect } from "react";
import type { RagEvidence } from "@/lib/silverlink/rag/types";
import { IMPORTANCE_BADGE_CLASS, SOURCE_TYPE_META, formatEvidenceDate, safetyFlagLabel } from "./rag-ui-meta";

export function EvidenceDetailModal({ evidence, onClose }: { evidence: RagEvidence; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const meta = SOURCE_TYPE_META[evidence.sourceType] ?? { label: evidence.sourceType, dot: "bg-slate-400" };

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="animate-rag-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="animate-rag-pop-in max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{meta.label}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <h2 id="evidence-modal-title" className="mt-3 text-xl font-bold text-slate-900">
          {evidence.title}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${IMPORTANCE_BADGE_CLASS[evidence.importance]}`}>
            중요도 {evidence.importance}
          </span>
          <span className="text-xs text-slate-400">{formatEvidenceDate(evidence.createdAt)}</span>
        </div>

        {evidence.safetyFlags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {evidence.safetyFlags.map((flag) => (
              <span key={flag} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                {safetyFlagLabel(flag)}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">요약</p>
          <p className="text-sm text-slate-700">{evidence.summary}</p>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">본문</p>
          <p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
            {evidence.rawText || "(원문 내용이 없어요)"}
          </p>
        </div>
      </div>
    </div>
  );
}
