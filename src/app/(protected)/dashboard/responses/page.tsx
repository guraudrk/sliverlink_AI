"use client";

import { useEffect, useState } from "react";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function DashboardResponsesPage() {
  const [responses, setResponses] = useState<MessageLogSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/message-logs")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.ok) {
          const parentResponses = (data.messageLogs as MessageLogSummary[]).filter(
            (log) => log.direction === "parent_response"
          );
          setResponses(parentResponses);
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
          <h1 className="mt-2 text-3xl font-bold text-slate-900">어르신 응답 기록</h1>
          <p className="mt-2 text-slate-500">링크로 받은 응답을 최근순으로 모아봤어요.</p>
        </div>

        {responses.length === 0 ? (
          <p className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            아직 받은 응답이 없어요.
          </p>
        ) : (
          <ul className="space-y-3">
            {responses.map((log) => (
              <li key={log.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="font-semibold text-slate-800">{log.sender ?? "어르신"}</p>
                <p className="mt-1 text-slate-600">{log.raw_message}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(log.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
