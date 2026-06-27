"use client";

import { useEffect } from "react";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";

const CHANNEL_LABELS: Record<string, string> = {
  web: "웹 입력",
  link: "링크 응답",
  sms: "SMS",
  kakao_alimtalk: "카카오 알림톡",
  voice_call: "AI 안부전화",
  web_push: "웹 푸시",
};

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export function MessageLogDetailModal({
  log,
  relatedTask,
  onClose,
}: {
  log: MessageLogSummary;
  relatedTask: CareTaskSummary | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="animate-rag-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-log-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="animate-rag-pop-in max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            {CHANNEL_LABELS[log.source_channel ?? ""] ?? log.source_channel ?? "채널 미확인"}
          </span>
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

        <h2 id="message-log-modal-title" className="mt-3 text-xl font-bold text-slate-900">
          {log.sender ?? "어르신"}
        </h2>

        <div className="mt-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">전달된 내용</p>
          <p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
            {log.raw_message || "(내용 없음)"}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">받는 분</dt>
            <dd className="mt-0.5 text-slate-700">{log.receiver ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">받은 시각</dt>
            <dd className="mt-0.5 text-slate-700">{formatDateTime(log.created_at)}</dd>
          </div>
        </dl>

        {relatedTask ? (
          <div className="mt-5 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">관련 일정</p>
            <p className="whitespace-pre-line rounded-xl bg-blue-50 p-4 text-sm leading-relaxed text-blue-800 ring-1 ring-blue-100">
              {relatedTask.original_request || "(내용 없음)"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
