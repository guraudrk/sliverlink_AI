"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { selectUnsentCareTasks, type CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";
import type { NotificationQueueRow } from "@/lib/supabase/notification-queue-repo";
import { TASK_TYPE_LABELS, type TaskType } from "@/lib/silverlink/care-tasks/task-type";

const CareTaskDetailModal = dynamic(
  () => import("@/components/tasks/care-task-detail-modal").then((m) => ({ default: m.CareTaskDetailModal })),
  { ssr: false }
);
const SendNotificationModal = dynamic(
  () => import("@/components/tasks/send-notification-modal").then((m) => ({ default: m.SendNotificationModal })),
  { ssr: false }
);

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

function statusBadgeClass(status: string): string {
  if (status === "help_requested") return "bg-amber-100 text-amber-800";
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "snoozed") return "bg-slate-100 text-slate-500";
  return "bg-blue-100 text-blue-700";
}

function taskTypeLabel(taskType: string | null): string {
  if (!taskType) return "미분류";
  return TASK_TYPE_LABELS[taskType as TaskType] ?? taskType;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

interface Props {
  initialTasks: CareTaskSummary[];
  initialQueueByCareTaskId: Record<string, NotificationQueueRow[]>;
  initialMessageLogByCareTaskId: Record<string, MessageLogSummary>;
  initialUnsentOnly: boolean;
}

export function TasksClient({
  initialTasks,
  initialQueueByCareTaskId,
  initialMessageLogByCareTaskId,
  initialUnsentOnly,
}: Props) {
  const [careTasks, setCareTasks] = useState<CareTaskSummary[]>(initialTasks);
  const [unsentOnly, setUnsentOnly] = useState(initialUnsentOnly);
  const [selectedTask, setSelectedTask] = useState<CareTaskSummary | null>(null);
  const [sendTarget, setSendTarget] = useState<CareTaskSummary | null>(null);

  function handleSent(careTaskId: string) {
    setCareTasks((prev) =>
      prev.map((task) => (task.id === careTaskId ? { ...task, notification_status: "sent" } : task))
    );
    setSendTarget(null);
  }

  const visibleTasks = unsentOnly ? selectUnsentCareTasks(careTasks) : careTasks;

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center animate-rag-fade-in-up">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">오늘의 일정</h1>
          <p className="mt-2 text-slate-500">등록된 모든 일정과 발송 상태를 한눈에 확인해요.</p>
        </div>

        <div className="mb-5 flex justify-center animate-rag-fade-in-up" style={{ animationDelay: "60ms" }}>
          <button
            type="button"
            onClick={() => setUnsentOnly((prev) => !prev)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              unsentOnly
                ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {unsentOnly ? "미발송 알림만 보는 중" : "미발송 알림만 보기"}
          </button>
        </div>

        {visibleTasks.length === 0 ? (
          <p className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200 animate-rag-fade-in-up" style={{ animationDelay: "100ms" }}>
            {unsentOnly ? "미발송 알림이 없어요." : "아직 등록된 일정이 없어요."}
          </p>
        ) : (
          <ul className="space-y-3">
            {visibleTasks.map((task, i) => {
              const queueEntries = initialQueueByCareTaskId[task.id] ?? [];
              return (
                <li key={task.id} className="animate-rag-fade-in-up" style={{ animationDelay: `${100 + i * 55}ms` }}>
                  <button
                    type="button"
                    onClick={() => (unsentOnly ? setSendTarget(task) : setSelectedTask(task))}
                    className="w-full rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">{task.target_person ?? "대상자 미지정"}</p>
                        <p className="mt-1 text-sm text-slate-600">{task.original_request}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(task.status)}`}
                      >
                        {STATUS_LABELS[task.status] ?? task.status}
                      </span>
                    </div>

                    {task.status === "help_requested" ? (
                      <p className="mt-2 text-xs text-amber-700">
                        어르신이 도움이 필요하다고 응답했어요. 직접 연락해 확인해 주세요.
                      </p>
                    ) : null}

                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                      <span>{formatDate(task.created_at)}</span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700">
                        {taskTypeLabel(task.task_type)}
                      </span>
                    </div>

                    {queueEntries.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {queueEntries.map((entry) => (
                          <span
                            key={entry.id}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                          >
                            {CHANNEL_LABELS[entry.channel] ?? entry.channel} · {entry.status}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedTask ? (
        <CareTaskDetailModal
          task={selectedTask}
          queueEntries={initialQueueByCareTaskId[selectedTask.id] ?? []}
          messageLog={initialMessageLogByCareTaskId[selectedTask.id] ?? null}
          onClose={() => setSelectedTask(null)}
        />
      ) : null}

      {sendTarget ? (
        <SendNotificationModal task={sendTarget} onClose={() => setSendTarget(null)} onSent={handleSent} />
      ) : null}
    </div>
  );
}
