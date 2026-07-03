"use client";

import { useState } from "react";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { CareCallAttempt } from "@/lib/supabase/care-call-attempts-repo";

const RESPONSE_BUTTONS = [
  { action: "completed", label: "완료했어요" },
  { action: "help_requested", label: "도움이 필요해요" },
  { action: "no_answer", label: "무응답" },
] as const;

const RISK_BADGE_CLASS: Record<string, string> = {
  none: "bg-emerald-100 text-emerald-700",
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-amber-200 text-amber-900",
};

const STATUS_LABEL: Record<string, string> = {
  prepared: "준비됨",
  answered: "전화 중",
  completed: "완료",
  help_requested: "도움 요청",
  no_answer: "무응답",
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export function CareCallPanel({
  careTasks,
  initialAttempts,
}: {
  careTasks: CareTaskSummary[];
  initialAttempts: CareCallAttempt[];
}) {
  const [careTaskId, setCareTaskId] = useState(careTasks[0]?.id ?? "");
  const [attempt, setAttempt] = useState<CareCallAttempt | null>(null);
  const [pastAttempts, setPastAttempts] = useState<CareCallAttempt[]>(initialAttempts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function refreshHistory(updated: CareCallAttempt) {
    setPastAttempts((prev) => [updated, ...prev.filter((item) => item.id !== updated.id)]);
  }

  async function handlePreview() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/care-calls/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ care_task_id: careTaskId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("미리보기 생성에 실패했어요.");
        return;
      }
      setAttempt(data.attempt as CareCallAttempt);
      refreshHistory(data.attempt);
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!attempt) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/care-calls/${attempt.id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("Mock 전화 실행에 실패했어요.");
        return;
      }
      setAttempt(data.attempt as CareCallAttempt);
      refreshHistory(data.attempt);
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRespond(action: string) {
    if (!attempt) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/care-calls/${attempt.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("응답 처리에 실패했어요.");
        return;
      }
      setAttempt(data.attempt as CareCallAttempt);
      refreshHistory(data.attempt);
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">안부전화 Mock</h2>
          <p className="text-slate-500">실제로 전화가 걸리지 않아요 — 전체 흐름만 미리 검증해요.</p>
        </div>

        {!attempt ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="care_task_id" className="block text-base font-semibold text-slate-700">
                대상 일정
              </label>
              <select
                id="care_task_id"
                value={careTaskId}
                onChange={(event) => setCareTaskId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {careTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.target_person ?? "대상자 미지정"} — {task.original_request?.slice(0, 24)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={busy || !careTaskId}
              onClick={handlePreview}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              안부전화 미리보기 생성
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-slate-700">{attempt.call_script}</div>

            {attempt.status === "prepared" ? (
              <button
                type="button"
                disabled={busy}
                onClick={handleStart}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Mock 전화 실행
              </button>
            ) : null}

            {attempt.status === "answered" ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-600">어르신 응답 시뮬레이션</p>
                {RESPONSE_BUTTONS.map(({ action, label }) => (
                  <button
                    key={action}
                    type="button"
                    disabled={busy}
                    onClick={() => handleRespond(action)}
                    className="w-full rounded-xl border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {["completed", "help_requested", "no_answer"].includes(attempt.status) ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-700">
                {attempt.parent_response}로 마무리됐어요.
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setAttempt(null)}
              className="text-sm font-semibold text-slate-400 hover:text-blue-500"
            >
              새로 만들기
            </button>
          </div>
        )}

        {error ? (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        ) : null}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-700">지난 안부전화 기록</h2>
        {pastAttempts.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
            아직 기록이 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {pastAttempts.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <li key={item.id} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full p-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-slate-600 line-clamp-2">{item.call_script}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${RISK_BADGE_CLASS[item.risk_level] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                        <span className="text-slate-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)}</p>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3 animate-rag-fade-in-up">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">전화 스크립트</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.call_script}</p>
                      </div>

                      {item.parent_response ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">어르신 응답</p>
                          <p className="text-sm text-slate-700">{item.parent_response}</p>
                        </div>
                      ) : null}

                      {item.summary ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">요약</p>
                          <p className="text-sm text-slate-700">{item.summary}</p>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>위험도: <span className={`font-semibold ${RISK_BADGE_CLASS[item.risk_level] ?? ""} rounded px-1.5 py-0.5`}>{item.risk_level}</span></span>
                        {item.started_at ? <span>시작: {formatDate(item.started_at)}</span> : null}
                        {item.ended_at ? <span>종료: {formatDate(item.ended_at)}</span> : null}
                      </div>

                      {item.status === "help_requested" ? (
                        <p className="text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                          도움 요청이 있었어요. 직접 연락해 확인해 주세요.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
