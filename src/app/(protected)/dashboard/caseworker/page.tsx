import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listElderSummaries } from "@/lib/supabase/caseworker-queries";
import { computeRiskFlags, getRiskWeight } from "@/lib/caseworker/risk-flags";
import { CaseworkerClient } from "./caseworker-client";

function CaseworkerIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9" aria-hidden="true">
      {/* 클립보드 */}
      <rect x="7" y="8" width="22" height="26" rx="3" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.8" />
      {/* 클립보드 클립 */}
      <rect x="14" y="5" width="8" height="5" rx="2" fill="white" fillOpacity="0.8" />
      {/* 체크리스트 라인 3개 */}
      <path d="M13 16h10M13 21h10M13 26h6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      {/* 체크 점 */}
      <circle cx="11" cy="16" r="1.3" fill="white" fillOpacity="0.9" />
      <circle cx="11" cy="21" r="1.3" fill="white" fillOpacity="0.7" />
      <circle cx="11" cy="26" r="1.3" fill="white" fillOpacity="0.5" />
      {/* 상단 우측 별 (AI 상징) */}
      <path d="M33 4l.5 1.6L35 6.1l-1.5.5L33 8l-.5-1.4L31 6.1l1.5-.5L33 4z" fill="white" fillOpacity="0.85" />
    </svg>
  );
}

export default async function CaseworkerPage() {
  const supabase = await createSupabaseServerClient();
  const summaries = await listElderSummaries(supabase);

  const eldersWithFlags = summaries
    .map((s) => ({ ...s, flags: computeRiskFlags(s) }))
    .sort(
      (a, b) =>
        getRiskWeight(a.flags, a.latestScore) -
        getRiskWeight(b.flags, b.latestScore)
    );

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        {/* 뒤로가기 */}
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-blue-500 animate-rag-fade-in-up"
        >
          ← 대시보드
        </Link>

        {/* 헤더 */}
        <div className="mb-6 flex items-center gap-5 animate-rag-fade-in-up">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md shadow-emerald-200/60">
            <CaseworkerIcon />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">SilverLink AI</p>
            <h1 className="mt-0.5 text-2xl font-bold text-slate-900 sm:text-3xl">케어 관리</h1>
          </div>
        </div>
        <p className="mb-8 text-slate-500 animate-rag-fade-in-up">
          담당 어르신을 위험도 순으로 한눈에 파악해요. 자동 플래그로 즉시 확인이 필요한 분을 놓치지 않아요.
        </p>

        {eldersWithFlags.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-12 text-center shadow-sm ring-1 ring-slate-200 animate-rag-fade-in-up">
            <p className="text-slate-500">등록된 어르신이 없어요.</p>
            <Link
              href="/parents"
              className="mt-4 inline-block rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              어르신 등록하기
            </Link>
          </div>
        ) : (
          <CaseworkerClient elders={eldersWithFlags} />
        )}
      </div>
    </div>
  );
}
