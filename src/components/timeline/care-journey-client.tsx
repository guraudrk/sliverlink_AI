"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  call:      { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 ring-blue-200",       icon: "📞" },
  alert:     { dot: "bg-rose-500",   badge: "bg-rose-50 text-rose-700 ring-rose-200",       icon: "🚨" },
  brief:     { dot: "bg-indigo-400", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", icon: "📋" },
  recording: { dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 ring-violet-200", icon: "🎙️" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function formatDateOnly(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

const DOW = ["월", "화", "수", "목", "금", "토", "일"];

function MonthCalendar({
  eventDates,
  selectedDate,
  onSelect,
}: {
  eventDates: Set<string>;
  selectedDate: string | null;
  onSelect: (d: string | null) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dowFirst = first.getDay(); // 0=Sun
    const mondayOffset = dowFirst === 0 ? 6 : dowFirst - 1;
    const arr: (number | null)[] = Array(mondayOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {/* 月 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-slate-700">{year}년 {month + 1}월</span>
        <button
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          ›
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DOW.map((d) => (
          <div key={d} className="py-1 text-xs font-semibold text-slate-400">{d}</div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasEv = eventDates.has(dateStr);
          const isSel = selectedDate === dateStr;
          const isToday = dateStr === todayStr;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(isSel ? null : dateStr)}
              className={`relative flex flex-col items-center justify-center rounded-lg py-1 text-sm transition-colors ${
                isSel
                  ? "bg-blue-600 text-white"
                  : isToday
                  ? "bg-blue-50 font-bold text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {day}
              {hasEv && (
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSel ? "bg-white/80" : "bg-blue-400"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <button
          onClick={() => onSelect(null)}
          className="mt-3 w-full rounded-lg py-1 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        >
          선택 해제
        </button>
      )}
    </div>
  );
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

function EventItem({
  ev,
  expandedId,
  setExpandedId,
  parentName,
  isLast,
}: {
  ev: TimelineEvent;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  parentName?: string;
  isLast: boolean;
}) {
  const s = EVENT_STYLE[ev.type] ?? EVENT_STYLE.call;
  const isExpanded = expandedId === ev.id;
  return (
    <li className="flex gap-3 sm:gap-4">
      <div className="flex flex-col items-center">
        <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${s.dot} ring-2 ring-white`} />
        {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" />}
      </div>
      <button
        type="button"
        onClick={() => setExpandedId(isExpanded ? null : ev.id)}
        className={`mb-4 min-w-0 flex-1 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition-all active:scale-[0.99] ${
          isExpanded ? "ring-blue-300 shadow-md" : "ring-slate-200 hover:ring-blue-200"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-base leading-none">{s.icon}</span>
            <p className="font-semibold text-slate-800 text-sm leading-snug">{ev.title}</p>
            {parentName && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{parentName}</span>
            )}
          </div>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
        {ev.meta && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.entries(ev.meta).map(([k, v]) => (
              <span key={k} className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${s.badge}`}>{v}</span>
            ))}
          </div>
        )}
        <p className={`mt-1.5 text-sm text-slate-500 ${isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
          {ev.description}
        </p>
        <p className="mt-2 text-xs text-slate-400">{formatDate(ev.date)}</p>
      </button>
    </li>
  );
}

export function CareJourneyClient({ parents }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentParentId = searchParams.get("parentId") ?? parents[0]?.id ?? "";

  const [viewMode, setViewMode] = useState<"elder" | "date">("elder");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [trends, setTrends] = useState<WeeklyTrend[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 날짜별 뷰용: 모든 어르신 이벤트 병합
  const [allEvents, setAllEvents] = useState<(TimelineEvent & { parentId: string })[]>([]);
  const [allLoading, setAllLoading] = useState(false);

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

  const fetchAllParents = useCallback(async () => {
    setAllLoading(true);
    try {
      const results = await Promise.all(
        parents.map(async (p) => {
          const res = await fetch(`/api/timeline?parentId=${p.id}`);
          const data = await res.json();
          if (!data.ok) return [];
          return (data.events as TimelineEvent[]).map((ev) => ({ ...ev, parentId: p.id }));
        })
      );
      const merged = results.flat().sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAllEvents(merged);
    } finally {
      setAllLoading(false);
    }
  }, [parents]);

  useEffect(() => {
    if (viewMode === "elder") {
      fetchData(currentParentId);
    } else {
      fetchAllParents();
    }
  }, [viewMode, currentParentId, fetchData, fetchAllParents]);

  function selectParent(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("parentId", id);
    router.push(`/dashboard/timeline?${params.toString()}`);
  }

  const currentParent = parents.find((p) => p.id === currentParentId);

  // 날짜별 뷰: 달력 선택 날짜
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 이벤트가 존재하는 날짜 Set (달력 점 표시용)
  const eventDates = useMemo(() => {
    const s = new Set<string>();
    for (const ev of allEvents) s.add(ev.date.slice(0, 10));
    return s;
  }, [allEvents]);

  // 선택된 날짜의 이벤트 (없으면 전체)
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return allEvents.filter((ev) => ev.date.slice(0, 10) === selectedDate);
  }, [allEvents, selectedDate]);

  return (
    <div className="space-y-5">
      {/* 뷰 모드 토글 */}
      <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setViewMode("elder")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            viewMode === "elder" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          어르신별
        </button>
        <button
          onClick={() => setViewMode("date")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            viewMode === "date" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          날짜별
        </button>
      </div>

      {viewMode === "elder" ? (
        <>
          {/* 어르신 탭 */}
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
              {kpi && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KpiCard label="총 안부전화" value={String(kpi.total_calls)} color="ring-slate-200" />
                  <KpiCard label="응답률" value={kpi.answer_rate !== null ? `${kpi.answer_rate}%` : "—"} color="ring-blue-200" />
                  <KpiCard label="안전 알림" value={String(kpi.total_alerts)} color={kpi.total_alerts > 0 ? "ring-rose-200" : "ring-slate-200"} />
                  <KpiCard label="현재 연결 점수" value={kpi.current_score !== null ? `${kpi.current_score}점` : "—"} color="ring-emerald-200" />
                </div>
              )}
              <TrendChart trends={trends} />
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
                    {events.map((ev, i) => (
                      <EventItem
                        key={ev.id}
                        ev={ev}
                        expandedId={expandedId}
                        setExpandedId={setExpandedId}
                        isLast={i === events.length - 1}
                      />
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        /* 날짜별 뷰 — 달력 + 이벤트 목록 */
        allLoading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-slate-400 text-sm">불러오는 중…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
            {/* 달력 사이드바 */}
            <div className="shrink-0 lg:w-72">
              <MonthCalendar
                eventDates={eventDates}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />
            </div>

            {/* 이벤트 목록 */}
            <div className="min-w-0 flex-1">
              {!selectedDate ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl bg-white text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
                  <span className="text-2xl mb-2">📅</span>
                  달력에서 날짜를 선택하면 해당 날의 기록을 볼 수 있어요
                </div>
              ) : selectedDayEvents.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl bg-white text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
                  <span className="text-2xl mb-2">🗓️</span>
                  {formatDateOnly(selectedDate)}에는 기록이 없어요
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                      {formatDateOnly(selectedDate)}
                    </span>
                    <span className="text-xs text-slate-400">{selectedDayEvents.length}건</span>
                  </div>
                  <ol className="relative space-y-0">
                    {selectedDayEvents.map((ev, i) => {
                      const parentName = parents.find((p) => p.id === ev.parentId)?.display_name;
                      return (
                        <EventItem
                          key={ev.id}
                          ev={ev}
                          expandedId={expandedId}
                          setExpandedId={setExpandedId}
                          parentName={parentName}
                          isLast={i === selectedDayEvents.length - 1}
                        />
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
