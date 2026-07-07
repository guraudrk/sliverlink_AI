"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";
import type { TimelineEvent, WeeklyTrend } from "@/app/api/timeline/route";
import { TrendChart } from "./trend-chart";

type Kpi = {
  total_calls: number;
  answer_rate: number | null;
  total_alerts: number;
  current_score: number | null;
};

type Props = { parents: ParentProfile[] };

const EVENT_STYLE: Record<string, { dot: string; badge: string; icon: string }> = {
  call:  { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 ring-blue-200",   icon: "📞" },
  alert: { dot: "bg-rose-500",   badge: "bg-rose-50 text-rose-700 ring-rose-200",   icon: "🚨" },
  brief: { dot: "bg-indigo-400", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", icon: "📋" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${color} text-center`}>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function CareJourneyClient({ parents }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParentId = searchParams.get("parentId") ?? parents[0]?.id ?? "";

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [trends, setTrends] = useState<WeeklyTrend[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (parentId: string) => {
    if (!parentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/timeline?parentId=${parentId}`);
      const data = await res.json();
      if (data.ok) {
        setEvents(data.events);
        setTrends(data.trends);
        setKpi(data.kpi);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentParentId);
  }, [currentParentId, fetchData]);

  function selectParent(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("parentId", id);
    router.push(`/dashboard/timeline?${params.toString()}`);
  }

  const currentParent = parents.find((p) => p.id === currentParentId);

  return (
    <div className="space-y-5">
      {/* 부모님 탭 */}
      {parents.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {parents.map((p) => (
            <button
              key={p.id}
              onClick={() => selectParent(p.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                p.id === currentParentId
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300"
              }`}
            >
              {p.display_name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-slate-400 text-sm">불러오는 중…</p>
        </div>
      ) : (
        <>
          {/* KPI 카드 4개 */}
          {kpi && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard label="총 안부전화" value={String(kpi.total_calls)} color="ring-slate-200" />
              <KpiCard
                label="응답률"
                value={kpi.answer_rate !== null ? `${kpi.answer_rate}%` : "—"}
                color="ring-blue-200"
              />
              <KpiCard
                label="안전 알림"
                value={String(kpi.total_alerts)}
                color={kpi.total_alerts > 0 ? "ring-rose-200" : "ring-slate-200"}
              />
              <KpiCard
                label="현재 연결 점수"
                value={kpi.current_score !== null ? `${kpi.current_score}점` : "—"}
                color="ring-emerald-200"
              />
            </div>
          )}

          {/* 트렌드 차트 */}
          <TrendChart trends={trends} />

          {/* 타임라인 */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {currentParent?.display_name} 케어 여정
            </h2>

            {events.length === 0 ? (
              <div className="rounded-2xl bg-white px-6 py-10 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
                아직 기록된 이벤트가 없어요.
              </div>
            ) : (
              <ol className="relative space-y-0">
                {events.map((ev, i) => {
                  const s = EVENT_STYLE[ev.type];
                  const isLast = i === events.length - 1;
                  return (
                    <li key={ev.id} className="flex gap-4">
                      {/* 타임라인 선 + 점 */}
                      <div className="flex flex-col items-center">
                        <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${s.dot} ring-2 ring-white`} />
                        {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                      </div>

                      {/* 내용 */}
                      <div className={`mb-4 min-w-0 flex-1 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base">{s.icon}</span>
                          <p className="font-semibold text-slate-800 text-sm">{ev.title}</p>
                          {ev.meta && Object.entries(ev.meta).map(([k, v]) => (
                            <span
                              key={k}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${s.badge}`}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1.5 text-sm text-slate-500 line-clamp-2">{ev.description}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(ev.date)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </>
      )}
    </div>
  );
}
