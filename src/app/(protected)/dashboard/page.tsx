import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  async function logout() {
    "use server";
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">안녕하세요</h1>
            <p className="mt-1 text-slate-500">{data.user.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              로그아웃
            </button>
          </form>
        </div>

        <nav className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link
            href="/parents"
            className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
          >
            <p className="font-semibold text-slate-800">부모님 관리</p>
            <p className="mt-1 text-sm text-slate-500">등록 · 조회</p>
          </Link>
          <Link
            href="/dashboard/create-task"
            className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
          >
            <p className="font-semibold text-slate-800">새 일정 만들기</p>
            <p className="mt-1 text-sm text-slate-500">요청 작성</p>
          </Link>
          <Link
            href="/dashboard/tasks?unsent=1"
            className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
          >
            <p className="font-semibold text-slate-800">미발송 알림</p>
            <p className="mt-1 text-sm text-slate-500">바로 확인 · 발송</p>
          </Link>
          <Link
            href="/dashboard/tasks"
            className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
          >
            <p className="font-semibold text-slate-800">오늘의 일정</p>
            <p className="mt-1 text-sm text-slate-500">전체 현황</p>
          </Link>
          <Link
            href="/dashboard/responses"
            className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
          >
            <p className="font-semibold text-slate-800">어르신 응답 기록</p>
            <p className="mt-1 text-sm text-slate-500">링크 응답 모아보기</p>
          </Link>
          <Link
            href="/dashboard/calls"
            className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
          >
            <p className="font-semibold text-slate-800">안부전화 (Mock)</p>
            <p className="mt-1 text-sm text-slate-500">AI 비서 전화 시뮬레이션</p>
          </Link>
          <Link
            href="/dashboard/deliveries"
            className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
          >
            <p className="font-semibold text-slate-800">발송 기록</p>
            <p className="mt-1 text-sm text-slate-500">SMS · 음성 발송 이력</p>
          </Link>
          <Link
            href="/dashboard/assistant"
            className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
          >
            <p className="font-semibold text-slate-800">돌봄 기록 AI 비서</p>
            <p className="mt-1 text-sm text-slate-500">질문하면 근거를 정리해드려요</p>
          </Link>
        </nav>
      </div>
    </div>
  );
}
