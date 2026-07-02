import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageGuideButton } from "@/components/app/page-guide-button";
import { listCareTasks } from "@/lib/supabase/care-tasks-repo";
import { listCareCallAttempts } from "@/lib/supabase/care-call-attempts-repo";
import { CareCallPanel } from "@/components/calls/care-call-panel";

export default async function DashboardCallsPage() {
  const supabase = await createSupabaseServerClient();
  const [careTasks, attempts] = await Promise.all([
    listCareTasks(supabase),
    listCareCallAttempts(supabase),
  ]);

  if (careTasks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
        <div className="max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 animate-rag-pop-in">
          <p className="text-lg font-semibold text-slate-700">먼저 일정을 만들어 주세요.</p>
          <p className="text-sm text-slate-500">등록된 일정이 있어야 안부전화를 시뮬레이션할 수 있어요.</p>
          <Link
            href="/dashboard/create-task"
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            일정 만들러 가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mb-3 flex w-full max-w-2xl animate-rag-fade-in-up">
        <PageGuideButton title="안부전화 안내">
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              Mock이란?
            </h3>
            <p className="leading-relaxed">실제 전화를 걸지 않고 AI 음성전화 흐름을 미리 테스트하는 모드예요. 외부로 아무것도 전송되지 않지만 기록은 실제와 동일하게 쌓입니다.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              사용 흐름
            </h3>
            <ol className="space-y-1 leading-relaxed">
              <li>① 일정 선택 → AI가 TTS 스크립트 자동 생성</li>
              <li>② Mock 발신 → 발송 기록에 이력 저장</li>
              <li>③ "응답 확인" 버튼 → Mock 키패드 응답 결과 확인</li>
            </ol>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              실제 전화
            </h3>
            <p className="leading-relaxed">Vercel 환경변수에서 <code className="rounded bg-slate-100 px-1 text-xs">ENABLE_REAL_CALLS=true</code>를 설정하면 Solapi를 통해 실제 TTS 전화가 발신돼요.</p>
          </section>
        </PageGuideButton>
      </div>

      <div className="mb-8 max-w-2xl text-center animate-rag-fade-in-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">안부전화 (Mock)</h1>
        <p className="mt-2 text-slate-500">실제 전화 없이 AI 비서 안부전화 흐름을 미리 검증해요.</p>
      </div>
      <div className="animate-rag-fade-in-up w-full" style={{ animationDelay: "80ms" }}>
        <CareCallPanel careTasks={careTasks} initialAttempts={attempts} />
      </div>
    </div>
  );
}
