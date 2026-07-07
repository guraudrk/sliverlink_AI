import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import { listSocialScores } from "@/lib/supabase/social-scores-repo";
import { SocialScoreCard } from "@/components/social/social-score-card";
import { RecalculateButton } from "@/components/social/recalculate-button";

function SocialScoreIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9" aria-hidden="true">
      {/* 상승 바 차트 */}
      <rect x="4" y="24" width="5" height="10" rx="1.5" fill="white" fillOpacity="0.5" />
      <rect x="12" y="18" width="5" height="16" rx="1.5" fill="white" fillOpacity="0.7" />
      <rect x="20" y="12" width="5" height="22" rx="1.5" fill="white" fillOpacity="0.85" />
      <rect x="28" y="6" width="5" height="28" rx="1.5" fill="white" />
      {/* 트렌드 라인 */}
      <polyline
        points="6.5,29 14.5,23 22.5,17 30.5,9"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.9"
      />
      {/* 끝점 강조 */}
      <circle cx="30.5" cy="9" r="2.2" fill="white" />
      {/* 별 (점수 상징) */}
      <path
        d="M36 4l.6 1.8L38.5 5.9l-1.9.6L36 8.4l-.6-1.9L33.5 5.9l1.9-.1L36 4z"
        fill="white"
        fillOpacity="0.85"
      />
    </svg>
  );
}

export default async function DashboardSocialPage() {
  const supabase = await createSupabaseServerClient();
  const parents = await listParentProfiles(supabase);

  // 부모별 8주치 점수를 병렬로 조회
  const scoresByParent = await Promise.all(
    parents.map((p) => listSocialScores(supabase, p.id, 8))
  );

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto mb-8 max-w-2xl animate-rag-fade-in-up">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-200/60">
            <SocialScoreIcon />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
            <h1 className="mt-0.5 text-2xl font-bold text-slate-900 sm:text-3xl">사회적 연결 점수</h1>
          </div>
        </div>
        <p className="mt-4 text-slate-500">
          안부전화 응답률과 링크 응답 빈도를 바탕으로 어르신의 사회적 연결 상태를 0~100점으로 나타내요.
          주간 추이를 통해 변화를 한눈에 파악할 수 있어요.
        </p>
      </div>

      {parents.length === 0 ? (
        <div className="rounded-2xl bg-white px-8 py-12 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-500">등록된 부모님이 없어요.</p>
          <a
            href="/parents"
            className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            부모님 등록하기
          </a>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {/* 기존 데이터 소급 반영 */}
          <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 animate-rag-fade-in-up">
            <p className="text-sm text-slate-500">과거 안부전화 기록을 점수에 반영할 수 있어요.</p>
            <RecalculateButton />
          </div>

          {/* 점수 기준 안내 */}
          <div className="flex gap-3 rounded-xl bg-white px-4 py-3 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200 animate-rag-fade-in-up">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />70점 이상: 활발</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />40~69점: 보통</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-rose-400" />39점 이하: 낮음</span>
            <span className="ml-auto text-slate-400">안부전화 응답 후 자동 갱신</span>
          </div>

          {parents.map((parent, i) => (
            <div
              key={parent.id}
              className="animate-rag-fade-in-up"
              style={{ animationDelay: `${60 + i * 80}ms` }}
            >
              <SocialScoreCard
                parentName={parent.display_name}
                scores={scoresByParent[i]}
              />
            </div>
          ))}

          {/* 데이터가 전혀 없는 경우 안내 */}
          {scoresByParent.every((s) => s.length === 0) && parents.length > 0 && (
            <div className="rounded-xl bg-blue-50 px-5 py-4 text-sm text-blue-700 ring-1 ring-blue-200 animate-rag-fade-in-up">
              <p className="font-semibold">아직 점수 데이터가 없어요</p>
              <p className="mt-1 text-blue-600">
                안부전화 시뮬레이션을 완료하면 이번 주 점수가 자동으로 계산돼요.
              </p>
              <a
                href="/dashboard/calls"
                className="mt-2 inline-block rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                안부전화 하러 가기
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
