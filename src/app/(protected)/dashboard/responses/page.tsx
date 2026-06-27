"use client";

import { useEffect, useState } from "react";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";
import { MessageLogDetailModal } from "@/components/responses/message-log-detail-modal";

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function DashboardResponsesPage() {
  const [responses, setResponses] = useState<MessageLogSummary[]>([]);
  const [parentProfiles, setParentProfiles] = useState<ParentProfile[]>([]);
  const [careTaskById, setCareTaskById] = useState<Map<string, CareTaskSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<MessageLogSummary | null>(null);
  const [parentId, setParentId] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/message-logs").then((res) => res.json()),
      fetch("/api/care-tasks").then((res) => res.json()),
      fetch("/api/parents").then((res) => res.json()),
    ])
      .then(([logsData, tasksData, parentsData]) => {
        if (!active) return;
        if (logsData.ok) {
          const parentResponses = (logsData.messageLogs as MessageLogSummary[]).filter(
            (log) => log.direction === "parent_response"
          );
          setResponses(parentResponses);
        }
        if (tasksData.ok) {
          const map = new Map<string, CareTaskSummary>();
          for (const task of tasksData.careTasks as CareTaskSummary[]) map.set(task.id, task);
          setCareTaskById(map);
        }
        if (parentsData.ok) setParentProfiles(parentsData.profiles as ParentProfile[]);
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

  const visibleResponses = parentId ? responses.filter((log) => log.parent_id === parentId) : responses;

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">어르신 응답 기록</h1>
          <p className="mt-2 text-slate-500">링크로 받은 응답을 최근순으로 모아봤어요.</p>
        </div>

        <div className="mb-5 space-y-1.5">
          <label htmlFor="response_parent_id" className="block text-xs font-semibold text-slate-500">
            부모님 선택
          </label>
          <select
            id="response_parent_id"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">통합 (등록된 모든 어르신)</option>
            {parentProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name}
              </option>
            ))}
          </select>
        </div>

        {visibleResponses.length === 0 ? (
          <p className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            아직 받은 응답이 없어요.
          </p>
        ) : (
          <ul className="space-y-3">
            {visibleResponses.map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="w-full rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
                >
                  <p className="font-semibold text-slate-800">{log.sender ?? "어르신"}</p>
                  <p className="mt-1 text-slate-600">{log.raw_message}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDate(log.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedLog ? (
        <MessageLogDetailModal
          log={selectedLog}
          relatedTask={selectedLog.care_task_id ? careTaskById.get(selectedLog.care_task_id) ?? null : null}
          onClose={() => setSelectedLog(null)}
        />
      ) : null}
    </div>
  );
}
