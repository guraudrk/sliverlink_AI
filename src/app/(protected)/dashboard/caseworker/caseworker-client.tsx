"use client";

import { useState, useMemo, useCallback } from "react";
import type { ElderSummary } from "@/lib/supabase/caseworker-queries";
import type { RiskFlag } from "@/lib/caseworker/risk-flags";
import { CaseworkerKpiHeader } from "@/components/app/caseworker-kpi-header";
import { CaseworkerElderCard } from "@/components/app/caseworker-elder-card";
import { CareReportPanel } from "@/components/app/care-report-panel";
import { getRiskWeight } from "@/lib/caseworker/risk-flags";

type ElderWithFlags = ElderSummary & { flags: RiskFlag[] };

type FilterType = "all" | "urgent" | "worsening" | "normal";

const FILTER_LABELS: Record<FilterType, string> = {
  all: "전체",
  urgent: "위험",
  worsening: "주의",
  normal: "정상",
};

type OrgRole = "admin" | "social_worker" | "field_worker" | null;

type Props = {
  elders: ElderWithFlags[];
  currentUserId: string | null;
  orgRole: OrgRole;
  orgId: string | null;
};

export function CaseworkerClient({ elders, currentUserId, orgRole, orgId }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [batchStatus, setBatchStatus] = useState<"idle" | "running" | "done" | "error">("idle");

  const runBatchReport = useCallback(async () => {
    if (!orgId) return;
    setBatchStatus("running");
    const now = new Date();
    const periodEnd = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodStart = weekAgo.toISOString().slice(0, 10);
    try {
      const res = await fetch("/api/reports/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, periodStart, periodEnd }),
      });
      setBatchStatus(res.ok ? "done" : "error");
    } catch {
      setBatchStatus("error");
    }
  }, [orgId]);

  // admin·social_worker만 "내 담당만" 필터를 볼 수 있다
  const canFilterByAssignee =
    orgRole === "admin" || orgRole === "social_worker";

  const filtered = useMemo(() => {
    return elders
      .filter((e) => {
        const matchSearch =
          search === "" ||
          e.display_name.toLowerCase().includes(search.toLowerCase());

        const matchFilter =
          filter === "all" ||
          (filter === "urgent" && e.flags.some((f) => f.type === "urgent")) ||
          (filter === "worsening" &&
            (e.flags.some((f) => f.type === "worsening") ||
              e.flags.some((f) => f.type === "unacked_alerts"))) ||
          (filter === "normal" &&
            e.flags.length === 0 &&
            (e.latestScore === null || e.latestScore >= 40));

        const matchAssignee =
          !mineOnly || e.assigned_user_id === currentUserId;

        return matchSearch && matchFilter && matchAssignee;
      })
      .sort(
        (a, b) =>
          getRiskWeight(a.flags, a.latestScore) -
          getRiskWeight(b.flags, b.latestScore)
      );
  }, [elders, search, filter, mineOnly, currentUserId]);

  return (
    <>
    {reportTarget && (
      <CareReportPanel
        parentId={reportTarget.id}
        elderName={reportTarget.name}
        onClose={() => setReportTarget(null)}
      />
    )}
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
          {canFilterByAssignee && (
            <button
              onClick={() => setMineOnly((v) => !v)}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                mineOnly
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-teal-300"
              }`}
            >
              내 담당
            </button>
          )}
        </div>
      </div>

      {/* 결과 수 + 배치 리포트 생성 + CSV 다운로드 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {filtered.length === elders.length
            ? `${elders.length}명 전체`
            : `${filtered.length}명 / ${elders.length}명`}
        </p>
        {orgId && (
          <div className="flex items-center gap-2">
            <button
              onClick={runBatchReport}
              disabled={batchStatus === "running"}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM6.5 5.5a.75.75 0 011.5 0v3.44l1.22-1.22a.75.75 0 111.06 1.06l-2.5 2.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 111.06-1.06L6.5 8.94V5.5z"/>
              </svg>
              {batchStatus === "running"
                ? "생성 중…"
                : batchStatus === "done"
                ? "생성 완료 ✓"
                : batchStatus === "error"
                ? "오류 재시도"
                : "전체 리포트 생성"}
            </button>
            <a
              href={`/api/reports/csv?orgId=${orgId}`}
              download
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-teal-300 hover:text-teal-700 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M8 1a.75.75 0 01.75.75v5.69l1.97-1.97a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 6.53a.75.75 0 011.06-1.06L7.25 7.44V1.75A.75.75 0 018 1zM1.5 10.75a.75.75 0 011.5 0v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-1.5a.75.75 0 011.5 0v1.5A2 2 0 0113 14.5H3A2 2 0 011 12.25v-1.5z"/>
              </svg>
              CSV 다운로드
            </a>
          </div>
        )}
      </div>

      {/* 어르신 카드 목록 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white px-8 py-12 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-400">해당 조건의 어르신이 없어요.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((elder, i) => (
            <li key={elder.id}>
              <CaseworkerElderCard
                elder={elder}
                index={i}
                onGenerateReport={(id, name) => setReportTarget({ id, name })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  </>
  );
}
