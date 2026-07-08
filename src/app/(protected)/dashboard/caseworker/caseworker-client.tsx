"use client";

import { useState, useMemo } from "react";
import type { ElderSummary } from "@/lib/supabase/caseworker-queries";
import type { RiskFlag } from "@/lib/caseworker/risk-flags";
import { CaseworkerKpiHeader } from "@/components/app/caseworker-kpi-header";
import { CaseworkerElderCard } from "@/components/app/caseworker-elder-card";

type ElderWithFlags = ElderSummary & { flags: RiskFlag[] };

type FilterType = "all" | "urgent" | "worsening" | "normal";

const FILTER_LABELS: Record<FilterType, string> = {
  all: "전체",
  urgent: "위험",
  worsening: "주의",
  normal: "정상",
};

type Props = {
  elders: ElderWithFlags[];
};

export function CaseworkerClient({ elders }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    return elders.filter((e) => {
      const matchSearch =
        search === "" ||
        e.display_name.toLowerCase().includes(search.toLowerCase());

      const matchFilter =
        filter === "all" ||
        (filter === "urgent" &&
          (e.flags.some((f) => f.type === "urgent") ||
            (e.latestScore !== null && e.latestScore <= 39))) ||
        (filter === "worsening" &&
          (e.flags.some((f) => f.type === "worsening") ||
            e.flags.some((f) => f.type === "unacked_alerts"))) ||
        (filter === "normal" &&
          e.flags.length === 0 &&
          (e.latestScore === null || e.latestScore >= 40));

      return matchSearch && matchFilter;
    });
  }, [elders, search, filter]);

  return (
    <div className="space-y-5">
      {/* KPI 패널 */}
      <CaseworkerKpiHeader elders={elders} />

      {/* 검색 + 필터 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            placeholder="어르신 이름 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex gap-1.5">
          {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 수 */}
      <p className="text-sm text-slate-500">
        {filtered.length === elders.length
          ? `${elders.length}명 전체`
          : `${filtered.length}명 / ${elders.length}명`}
      </p>

      {/* 어르신 카드 목록 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white px-8 py-12 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-400">해당 조건의 어르신이 없어요.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((elder, i) => (
            <li key={elder.id}>
              <CaseworkerElderCard elder={elder} index={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
