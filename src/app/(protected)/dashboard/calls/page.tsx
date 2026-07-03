import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

      <div className="mx-auto mb-8 max-w-2xl text-center animate-rag-fade-in-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">안부전화 (Mock)</h1>
        <p className="mt-2 text-slate-500">실제 전화 없이 AI 비서 안부전화 흐름을 미리 검증해요.</p>
      </div>
      <div className="mx-auto w-full max-w-2xl animate-rag-fade-in-up" style={{ animationDelay: "80ms" }}>
        <CareCallPanel careTasks={careTasks} initialAttempts={attempts} />
      </div>
    </div>
  );
}
