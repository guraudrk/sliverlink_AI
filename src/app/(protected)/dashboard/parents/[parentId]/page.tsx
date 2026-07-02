"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";
import type { NotificationQueueRow } from "@/lib/supabase/notification-queue-repo";
import { CareTaskDetailModal } from "@/components/tasks/care-task-detail-modal";
import { MessageLogDetailModal } from "@/components/responses/message-log-detail-modal";

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

export default function ParentDashboardPage() {
  const params = useParams<{ parentId: string }>();
  const parentId = params.parentId;

  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [careTasks, setCareTasks] = useState<CareTaskSummary[]>([]);
  const [responses, setResponses] = useState<MessageLogSummary[]>([]);
  const [queueByCareTaskId, setQueueByCareTaskId] = useState<Map<string, NotificationQueueRow[]>>(new Map());
  const [messageLogByCareTaskId, setMessageLogByCareTaskId] = useState<Map<string, MessageLogSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<CareTaskSummary | null>(null);
  const [selectedLog, setSelectedLog] = useState<MessageLogSummary | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/parents").then((res) => res.json()),
      fetch("/api/care-tasks").then((res) => res.json()),
      fetch("/api/message-logs").then((res) => res.json()),
      fetch("/api/notification-queue").then((res) => res.json()),
    ])
      .then(([parentsData, tasksData, logsData, queueData]) => {
        if (!active) return;
        if (parentsData.ok) {
          const found = (parentsData.profiles as ParentProfile[]).find((p) => p.id === parentId);
          setProfile(found ?? null);
        }
        if (tasksData.ok) {
          setCareTasks((tasksData.careTasks as CareTaskSummary[]).filter((task) => task.parent_id === parentId));
        }
        if (logsData.ok) {
          const allLogs = logsData.messageLogs as MessageLogSummary[];
          setResponses(allLogs.filter((log) => log.parent_id === parentId && log.direction === "parent_response"));

          // CareTaskDetailModal의 "보내는 분"은 일정마다 0~1건인 message_log 중 첫 건을 쓴다(tasks 페이지와 동일 규칙).
          const map = new Map<string, MessageLogSummary>();
          for (const log of allLogs) {
            if (log.care_task_id && !map.has(log.care_task_id)) map.set(log.care_task_id, log);
          }
          setMessageLogByCareTaskId(map);
        }
        if (queueData.ok) {
          const map = new Map<string, NotificationQueueRow[]>();
          for (const entry of queueData.notificationQueue as NotificationQueueRow[]) {
            const list = map.get(entry.care_task_id) ?? [];
            list.push(entry);
            map.set(entry.care_task_id, list);
          }
          setQueueByCareTaskId(map);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [parentId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
        <p className="text-slate-400">불러오는 중...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
        <p className="text-slate-500">등록된 부모님을 찾을 수 없어요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center animate-rag-fade-in-up">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {profile.display_name}
            {profile.relationship ? ` (${profile.relationship})` : ""}
          </h1>
        </div>

        <section className="animate-rag-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h2 className="mb-3 text-lg font-bold text-slate-700">일정</h2>
          {careTasks.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              등록된 일정이 없어요.
            </p>
          ) : (
            <ul className="space-y-2">
              {careTasks.map((task, i) => (
                <li key={task.id} className="animate-rag-fade-in-up" style={{ animationDelay: `${100 + i * 50}ms` }}>
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

        <section className="animate-rag-fade-in-up" style={{ animationDelay: "100ms" }}>
          <h2 className="mb-3 text-lg font-bold text-slate-700">응답 기록</h2>
          {responses.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              아직 받은 응답이 없어요.
            </p>
          ) : (
            <ul className="space-y-2">
              {responses.map((log, i) => (
                <li key={log.id} className="animate-rag-fade-in-up" style={{ animationDelay: `${140 + i * 50}ms` }}>
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
      </div>

      {selectedTask ? (
        <CareTaskDetailModal
          task={selectedTask}
          queueEntries={queueByCareTaskId.get(selectedTask.id) ?? []}
          messageLog={messageLogByCareTaskId.get(selectedTask.id) ?? null}
          onClose={() => setSelectedTask(null)}
        />
      ) : null}

      {selectedLog ? (
        <MessageLogDetailModal
          log={selectedLog}
          relatedTask={selectedLog.care_task_id ? careTasks.find((task) => task.id === selectedLog.care_task_id) ?? null : null}
          onClose={() => setSelectedLog(null)}
        />
      ) : null}
    </div>
  );
}
