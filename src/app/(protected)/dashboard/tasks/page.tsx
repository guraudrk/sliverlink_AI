"use client";

import { useEffect, useState } from "react";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { NotificationQueueRow } from "@/lib/supabase/notification-queue-repo";

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

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function DashboardTasksPage() {
  const [careTasks, setCareTasks] = useState<CareTaskSummary[]>([]);
  const [queueByCareTaskId, setQueueByCareTaskId] = useState<Map<string, NotificationQueueRow[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/care-tasks").then((res) => res.json()),
      fetch("/api/notification-queue").then((res) => res.json()),
    ])
      .then(([tasksData, queueData]) => {
        if (!active) return;
        if (tasksData.ok) setCareTasks(tasksData.careTasks as CareTaskSummary[]);
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
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
        <p className="text-slate-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">오늘의 일정</h1>
          <p className="mt-2 text-slate-500">등록된 모든 일정과 발송 상태를 한눈에 확인해요.</p>
        </div>

        {careTasks.length === 0 ? (
          <p className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            아직 등록된 일정이 없어요.
          </p>
        ) : (
          <ul className="space-y-3">
            {careTasks.map((task) => {
              const queueEntries = queueByCareTaskId.get(task.id) ?? [];
              return (
                <li key={task.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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

                  <p className="mt-3 text-xs text-slate-400">{formatDate(task.created_at)}</p>

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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
