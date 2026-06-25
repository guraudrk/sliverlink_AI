"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/parents").then((res) => res.json()),
      fetch("/api/care-tasks").then((res) => res.json()),
      fetch("/api/message-logs").then((res) => res.json()),
    ])
      .then(([parentsData, tasksData, logsData]) => {
        if (!active) return;
        if (parentsData.ok) {
          const found = (parentsData.profiles as ParentProfile[]).find((p) => p.id === parentId);
          setProfile(found ?? null);
        }
        if (tasksData.ok) {
          setCareTasks((tasksData.careTasks as CareTaskSummary[]).filter((task) => task.parent_id === parentId));
        }
        if (logsData.ok) {
          setResponses(
            (logsData.messageLogs as MessageLogSummary[]).filter(
              (log) => log.parent_id === parentId && log.direction === "parent_response"
            )
          );
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
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {profile.display_name}
            {profile.relationship ? ` (${profile.relationship})` : ""}
          </h1>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-700">일정</h2>
          {careTasks.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              등록된 일정이 없어요.
            </p>
          ) : (
            <ul className="space-y-2">
              {careTasks.map((task) => (
                <li key={task.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-700">{task.original_request}</p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {STATUS_LABELS[task.status] ?? task.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(task.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-700">응답 기록</h2>
          {responses.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              아직 받은 응답이 없어요.
            </p>
          ) : (
            <ul className="space-y-2">
              {responses.map((log) => (
                <li key={log.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-700">{log.raw_message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(log.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
