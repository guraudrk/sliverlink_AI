import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import { listSocialScores } from "@/lib/supabase/social-scores-repo";
import { SocialScoreCard } from "@/components/social/social-score-card";

export default async function DashboardSocialPage() {
  const supabase = await createSupabaseServerClient();
  const parents = await listParentProfiles(supabase);

  // 부모별 8주치 점수를 병렬로 조회
  const scoresByParent = await Promise.all(
    parents.map((p) => listSocialScores(supabase, p.id, 8))
  );

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto mb-8 max-w-2xl text-center animate-rag-fade-in-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">사회적 연결 점수</h1>
        <p className="mt-2 text-slate-500">
          안부전화 응답률과 링크 응답 빈도를 바탕으로 어르신의 사회적 연결 상태를 0~100점으로 나타내요.
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
