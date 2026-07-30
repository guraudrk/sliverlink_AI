"use client";

import { useEffect, useState } from "react";

type Log = {
  id: string;
  period_start: string | null;
  period_end:   string | null;
  recipient_email: string;
  elder_count: number;
  status: "sent" | "failed" | "retried";
  error_message: string | null;
  sent_at: string;
};

type Props = { orgId: string };

export function SendLogsSection({ orgId }: Props) {
  const [logs,    setLogs]    = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [msg,     setMsg]     = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/org/send-logs?orgId=${orgId}`)
      .then((r) => r.json())
      .then((d) => setLogs(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [orgId]);

  const retry = async (logId: string) => {
    setRetrying(logId);
    setMsg(null);
    const res = await fetch("/api/org/send-logs/retry", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ logId }),
    });
    setRetrying(null);
    if (res.ok) {
      setMsg("재전송 요청됐어요. (ENABLE_REAL_EMAIL=true 환경에서만 실제 발송됩니다)");
      setLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, status: "retried" } : l))
      );
    } else {
      setMsg("재전송 실패. 잠시 후 다시 시도해 주세요.");
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const statusChip = (s: Log["status"]) => {
    if (s === "sent")    return <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">발송</span>;
    if (s === "retried") return <span className="rounded bg-teal-50 px-1.5 py-0.5 text-xs font-semibold text-teal-700">재전송</span>;
    return                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-700">실패</span>;
  };

  if (loading) return <p className="text-sm text-slate-400">이력 불러오는 중…</p>;
  if (logs.length === 0) return <p className="text-sm text-slate-400">발송 이력이 없어요.</p>;

  return (
    <div className="space-y-2">
      {msg && <p className="text-sm text-slate-500">{msg}</p>}
      <ul className="divide-y divide-slate-100">
        {logs.map((l) => (
          <li key={l.id} className="flex items-start justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-700">{l.recipient_email}</p>
              <p className="text-xs text-slate-400">
                {l.period_start && l.period_end
                  ? `${l.period_start} ~ ${l.period_end}`
                  : "기간 정보 없음"}
                {" · "}어르신 {l.elder_count}명
                {" · "}{new Date(l.sent_at).toLocaleDateString("ko-KR")}
              </p>
              {l.error_message && (
                <p className="mt-0.5 text-xs text-rose-500">{l.error_message}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {statusChip(l.status)}
              {l.status === "failed" && (
                <button
                  onClick={() => retry(l.id)}
                  disabled={retrying === l.id}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
                >
                  {retrying === l.id ? "…" : "재전송"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
