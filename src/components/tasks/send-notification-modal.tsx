"use client";

import { useEffect, useState } from "react";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";

type Channel = "sms" | "kakao_alimtalk";

const CHANNEL_LABELS: Record<Channel, string> = {
  sms: "SMS",
  kakao_alimtalk: "카카오 알림톡",
};

// Slice 13.0 — 대시보드의 "미발송 알림" 목록에서 항목을 클릭했을 때 뜨는 채널 선택 + 발송 팝업.
// 백엔드는 새로 만들지 않고 기존 POST /api/delivery/preview(Mock 발송)를 그대로 재사용한다.
export function SendNotificationModal({
  task,
  onClose,
  onSent,
}: {
  task: CareTaskSummary;
  onClose: () => void;
  onSent: (careTaskId: string) => void;
}) {
  const [channel, setChannel] = useState<Channel>("sms");
  const [messageText, setMessageText] = useState(task.original_request ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/delivery/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          care_task_id: task.id,
          channel,
          message_text: messageText.trim().length > 0 ? messageText : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("발송에 실패했어요. 다시 시도해 주세요.");
        return;
      }
      onSent(task.id);
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="animate-rag-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-notification-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="animate-rag-pop-in max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="send-notification-modal-title" className="text-xl font-bold text-slate-900">
            지금 알릴까요?
          </h2>
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

        <p className="mt-1 text-sm text-slate-500">{task.target_person ?? "대상자 미지정"}</p>
        <p className="mt-0.5 text-xs text-slate-400">Mock 발송이에요 — 실제로 외부에 전송되지 않아요.</p>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">채널 선택</p>
          <div className="flex gap-2">
            {(Object.keys(CHANNEL_LABELS) as Channel[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setChannel(option)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  channel === option ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {CHANNEL_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label htmlFor="send_message_text" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            보낼 내용
          </label>
          <textarea
            id="send_message_text"
            rows={3}
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 shadow-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-100">{error}</div>
        ) : null}

        <button
          type="button"
          disabled={sending}
          onClick={handleSend}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-300"
        >
          {sending ? "보내는 중..." : `${CHANNEL_LABELS[channel]}로 보내기`}
        </button>
      </div>
    </div>
  );
}
