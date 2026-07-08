"use client";

import { useState } from "react";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";
import type { NotificationQueueRow } from "@/lib/supabase/notification-queue-repo";
import { CareTaskDetailModal } from "@/components/tasks/care-task-detail-modal";
import { MessageLogDetailModal } from "@/components/responses/message-log-detail-modal";
import { CarePlanPanel } from "@/components/app/care-plan-panel";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "예정",
  completed: "완료",
  help_requested: "도움 요청",
  snoozed: "나중에 다시",
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

type Props = {
  parentId: string;
  elderName: string;
  careTasks: CareTaskSummary[];
  responses: MessageLogSummary[];
  queueByCareTaskId: Record<string, NotificationQueueRow[]>;
  messageLogByCareTaskId: Record<string, MessageLogSummary>;
};

export function ElderDetailClient({
  parentId,
  elderName,
  careTasks,
  responses,
  queueByCareTaskId,
  messageLogByCareTaskId,
}: Props) {
  const [selectedTask, setSelectedTask] = useState<CareTaskSummary | null>(null);
  const [selectedLog, setSelectedLog] = useState<MessageLogSummary | null>(null);
  const [showCarePlan, setShowCarePlan] = useState(false);

  return (
    <>
      {/* AI 케어 플랜 패널 */}
      {showCarePlan && (
        <CarePlanPanel
          parentId={parentId}
          elderName={elderName}
          onClose={() => setShowCarePlan(false)}
        />
      )}

      {/* AI 케어 플랜 생성 버튼 */}
      <button
        type="button"
        onClick={() => setShowCarePlan(true)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-5 py-4 text-left shadow-md shadow-teal-100 transition-opacity hover:opacity-90 active:opacity-80 animate-rag-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-100">AI 자동 생성</p>
          <p className="mt-0.5 font-bold text-white">다음 주 케어 플랜 초안 만들기</p>
        </div>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 shrink-0 text-white/80" aria-hidden="true">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      </button>

      {/* 일정 */}
      <section className="animate-rag-fade-in-up" style={{ animationDelay: "160ms" }}>
        <h2 className="mb-3 text-lg font-bold text-slate-700">일정</h2>
        {careTasks.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
            등록된 일정이 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {careTasks.map((task, i) => (
              <li key={task.id} className="animate-rag-fade-in-up" style={{ animationDelay: `${200 + i * 40}ms` }}>
                <button
                  type="button"
                  onClick={() => setSelectedTask(task)}
                  className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-700">{task.original_request}</p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {STATUS_LABELS[task.status] ?? task.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(task.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 응답 기록 */}
      <section className="animate-rag-fade-in-up" style={{ animationDelay: "240ms" }}>
        <h2 className="mb-3 text-lg font-bold text-slate-700">응답 기록</h2>
        {responses.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
            아직 받은 응답이 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {responses.map((log, i) => (
              <li key={log.id} className="animate-rag-fade-in-up" style={{ animationDelay: `${280 + i * 40}ms` }}>
                <button
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
                >
                  <p className="text-sm text-slate-700">{log.raw_message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(log.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 모달 */}
      {selectedTask ? (
        <CareTaskDetailModal
          task={selectedTask}
          queueEntries={queueByCareTaskId[selectedTask.id] ?? []}
          messageLog={messageLogByCareTaskId[selectedTask.id] ?? null}
          onClose={() => setSelectedTask(null)}
        />
      ) : null}
      {selectedLog ? (
        <MessageLogDetailModal
          log={selectedLog}
          relatedTask={
            selectedLog.care_task_id
              ? careTasks.find((t) => t.id === selectedLog.care_task_id) ?? null
              : null
          }
          onClose={() => setSelectedLog(null)}
        />
      ) : null}
    </>
  );
}
