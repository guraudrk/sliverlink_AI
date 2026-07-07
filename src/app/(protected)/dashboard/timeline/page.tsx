import { Suspense } from "react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import { CareJourneyClient } from "@/components/timeline/care-journey-client";

function TimelineIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9" aria-hidden="true">
      {/* 세로 타임라인 선 */}
      <line x1="12" y1="6" x2="12" y2="34" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
      {/* 이벤트 점 3개 */}
      <circle cx="12" cy="10" r="3" fill="white" />
      <circle cx="12" cy="20" r="3" fill="white" fillOpacity="0.8" />
      <circle cx="12" cy="30" r="3" fill="white" fillOpacity="0.5" />
      {/* 각 점에서 나오는 카드 */}
      <rect x="18" y="7" width="16" height="6" rx="2" fill="white" fillOpacity="0.9" />
      <rect x="18" y="17" width="12" height="6" rx="2" fill="white" fillOpacity="0.7" />
      <rect x="18" y="27" width="14" height="6" rx="2" fill="white" fillOpacity="0.5" />
      {/* 트렌드 미니 라인 (카드 위에) */}
      <polyline points="19,9 22,8 25,10 28,7 33,8" stroke="#bfdbfe" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function DashboardTimelinePage() {
  const supabase = await createSupabaseServerClient();
  const parents = await listParentProfiles(supabase);

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
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-blue-200/60">
            <TimelineIcon />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
            <h1 className="mt-0.5 text-2xl font-bold text-slate-900 sm:text-3xl">케어 여정 타임라인</h1>
          </div>
        </div>
        <p className="mb-8 text-slate-500 animate-rag-fade-in-up">
          안부전화, 안전 알림, 가족 브리핑을 한 화면에서 시간순으로 확인하고, 주간 트렌드 차트로 변화를 파악해요.
        </p>

        {parents.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-12 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-500">등록된 부모님이 없어요.</p>
            <Link
              href="/parents"
              className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              부모님 등록하기
            </Link>
          </div>
        ) : (
          <Suspense fallback={<div className="flex h-40 items-center justify-center"><p className="text-slate-400 text-sm">불러오는 중…</p></div>}>
            <CareJourneyClient parents={parents} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
