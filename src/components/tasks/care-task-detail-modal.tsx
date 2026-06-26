"use client";

import { useEffect } from "react";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";
import type { NotificationQueueRow } from "@/lib/supabase/notification-queue-repo";
import { TASK_TYPE_LABELS, type TaskType } from "@/lib/silverlink/care-tasks/task-type";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "예정",
  completed: "완료",
  help_requested: "도움 요청",
  snoozed: "나중에 다시",
};

const CHANNEL_LABELS: Record<string, string> = {
  link: "링크 응답",
  sms: "SMS",
  kakao_alimtalk: "카카오 알림톡",
  voice_call: "AI 안부전화",
  web_push: "웹 푸시",
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

// task_type은 classifyTaskType이 항상 6개 옵션 중 하나로 저장하지만, 과거에(이 컬럼이 생기기 전) 만들어진
// 일정은 null일 수 있어 그 경우를 위한 표시용 라벨을 따로 둔다.
function taskTypeLabel(taskType: string | null): string {
  if (!taskType) return "미분류";
  return TASK_TYPE_LABELS[taskType as TaskType] ?? taskType;
}

export function CareTaskDetailModal({
  task,
  queueEntries,
  messageLog,
  onClose,
}: {
  task: CareTaskSummary;
  queueEntries: NotificationQueueRow[];
  messageLog: MessageLogSummary | null;
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
        aria-labelledby="care-task-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="animate-rag-pop-in max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            {taskTypeLabel(task.task_type)}
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

        <h2 id="care-task-modal-title" className="mt-3 text-xl font-bold text-slate-900">
          {task.target_person ?? "대상자 미지정"}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {STATUS_LABELS[task.status] ?? task.status}
          </span>
          {task.priority ? <span className="text-xs text-slate-400">우선순위: {task.priority}</span> : null}
        </div>

        <div className="mt-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">전하실 말씀</p>
          <p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
            {task.original_request || "(내용 없음)"}
          </p>
        </div>

        {messageLog ? (
          <div className="mt-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">보내는 분</p>
            <p className="text-sm text-slate-700">{messageLog.sender ?? "-"}</p>
          </div>
        ) : null}

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">등록일</dt>
            <dd className="mt-0.5 text-slate-700">{formatDateTime(task.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">완료일</dt>
            <dd className="mt-0.5 text-slate-700">{formatDateTime(task.completed_at)}</dd>
          </div>
        </dl>

        {task.status === "help_requested" ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700 ring-1 ring-amber-100">
            어르신이 도움이 필요하다고 응답했어요. 직접 연락해 확인해 주세요.
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">발송/통화 기록</p>
          {queueEntries.length > 0 ? (
            <ul className="space-y-2">
              {queueEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-600 ring-1 ring-slate-100"
                >
                  <span>{CHANNEL_LABELS[entry.channel] ?? entry.channel}</span>
                  <span className="text-xs text-slate-400">{entry.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">아직 발송/통화 기록이 없어요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
