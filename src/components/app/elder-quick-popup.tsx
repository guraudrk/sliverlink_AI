"use client";

import { useState, useEffect } from "react";
import { X, Phone, Bell, AlertTriangle, Sparkles, Calendar, MessageSquare, TrendingUp } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CareReportPanel } from "@/components/app/care-report-panel";

type Elder = {
  id: string;
  display_name?: string | null;
  relationship?: string | null;
};

type ElderData = {
  socialScore: number | null;
  latestCallAt: string | null;
  unackedAlerts: number;
  upcomingTasks: { id: string; original_request: string | null; status: string }[];
};

type Props = {
  elder: Elder;
  onClose: () => void;
  reportCache?: Record<string, string>;
  onReportGenerated?: (parentId: string, text: string) => void;
};

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "양호", color: "#10B981" };
  if (score >= 50) return { label: "보통", color: "#F59E0B" };
  return { label: "주의", color: "#EF4444" };
}

export function ElderQuickPopup({ elder, onClose, reportCache, onReportGenerated }: Props) {
  const [data, setData] = useState<ElderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  const name = elder.display_name ?? "이름 없음";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      try {
        const [scoreRes, callRes, alertRes, taskRes] = await Promise.all([
          supabase
            .from("social_scores")
            .select("score")
            .eq("parent_id", elder.id)
            .order("week_start", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("call_recordings")
            .select("recorded_at")
            .eq("parent_id", elder.id)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("safety_alerts")
            .select("*", { count: "exact", head: true })
            .eq("elder_id", elder.id)
            .is("acknowledged_at", null),
          supabase
            .from("care_tasks")
            .select("id, original_request, status")
            .eq("parent_id", elder.id)
            .neq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(3),
        ]);
        if (cancelled) return;
        setData({
          socialScore: (scoreRes.data as any)?.score ?? null,
          latestCallAt: (callRes.data as any)?.recorded_at ?? null,
          unackedAlerts: alertRes.count ?? 0,
          upcomingTasks: (taskRes.data ?? []) as ElderData["upcomingTasks"],
        });
      } catch {
        if (!cancelled) setData({ socialScore: null, latestCallAt: null, unackedAlerts: 0, upcomingTasks: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [elder.id]);

  if (showReport) {
    return (
      <CareReportPanel
        parentId={elder.id}
        elderName={name}
        onClose={() => setShowReport(false)}
        initialText={reportCache?.[elder.id]}
        onGenerated={(text) => onReportGenerated?.(elder.id, text)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} 요약`}
    >
      {/* 딤드 배경 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full rounded-t-3xl bg-white shadow-2xl sm:max-w-sm sm:rounded-3xl sm:mx-4 sm:my-4"
        style={{ maxHeight: "90dvh", overflowY: "auto" }}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-t-3xl border-b border-slate-100 bg-white px-5 py-4 sm:rounded-t-3xl">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold"
            style={{ backgroundColor: "#EEF2FF", color: "#6366F1" }}
          >
            {name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-base font-bold text-slate-800">{name}</p>
            {elder.relationship && (
              <p className="text-xs text-slate-500">{elder.relationship}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 */}
        <div className="divide-y divide-slate-50 px-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
            </div>
          ) : (
            <>
              {/* 사회연결점수 */}
              <div className="flex items-center gap-3 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#EEF2FF" }}>
                  <TrendingUp size={16} color="#6366F1" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700">사회연결점수</span>
                {data?.socialScore != null ? (
                  <span className="text-sm font-bold" style={{ color: scoreLabel(data.socialScore).color }}>
                    {data.socialScore}점 ({scoreLabel(data.socialScore).label})
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">데이터 없음</span>
                )}
              </div>

              {/* 최근통화 */}
              <div className="flex items-center gap-3 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#ECFDF3" }}>
                  <Phone size={16} color="#10B981" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700">최근통화</span>
                <span className="text-sm text-slate-600">
                  {data?.latestCallAt ? relativeTime(data.latestCallAt) : "기록 없음"}
                </span>
              </div>

              {/* 미확인 안전 알림 */}
              <div className="flex items-center gap-3 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#FEF2F2" }}>
                  <AlertTriangle size={16} color="#EF4444" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700">미확인 안전 알림</span>
                {(data?.unackedAlerts ?? 0) > 0 ? (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                    {data!.unackedAlerts}건
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">없음</span>
                )}
              </div>

              {/* AI 자동 생성 */}
              <div className="py-3.5">
                <button
                  onClick={() => setShowReport(true)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-teal-50 active:bg-teal-100"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#F0FDFA" }}>
                    <Sparkles size={16} color="#0D9488" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-slate-700">AI 케어 보고서</span>
                  <span className="text-xs font-semibold text-teal-600">
                    {reportCache?.[elder.id] ? "보기 →" : "생성 →"}
                  </span>
                </button>
              </div>

              {/* 일정 */}
              <div className="py-3.5">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#FFF8EB" }}>
                    <Calendar size={16} color="#F59E0B" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">진행 중인 일정</span>
                </div>
                {data?.upcomingTasks.length === 0 ? (
                  <p className="pl-12 text-xs text-slate-400">등록된 일정 없음</p>
                ) : (
                  <ul className="space-y-1 pl-12">
                    {data!.upcomingTasks.map((t) => (
                      <li key={t.id} className="text-xs text-slate-600 line-clamp-1">
                        • {t.original_request ?? "일정"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 응답 기록 링크 */}
              <div className="flex items-center gap-3 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#EFF8FF" }}>
                  <MessageSquare size={16} color="#0EA5E9" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-700">응답 기록</span>
                <a
                  href={`/dashboard/calls?parent=${elder.id}`}
                  onClick={onClose}
                  className="text-xs font-semibold text-sky-600 hover:underline"
                >
                  보러 가기 →
                </a>
              </div>
            </>
          )}
        </div>

        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}
