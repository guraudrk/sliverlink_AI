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
        <div className="flex items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 animate-rag-fade-in-up">
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
          {[
            { href: "/parents", title: "부모님 관리", sub: "등록 · 조회" },
            { href: "/dashboard/create-task", title: "새 일정 만들기", sub: "요청 작성" },
            { href: "/dashboard/tasks?unsent=1", title: "미발송 알림", sub: "바로 확인 · 발송" },
            { href: "/dashboard/tasks", title: "오늘의 일정", sub: "전체 현황" },
            { href: "/dashboard/responses", title: "어르신 응답 기록", sub: "링크 응답 모아보기" },
            { href: "/dashboard/calls", title: "안부전화 (Mock)", sub: "AI 비서 전화 시뮬레이션" },
            { href: "/dashboard/deliveries", title: "발송 기록", sub: "SMS · 음성 발송 이력" },
            { href: "/dashboard/assistant", title: "돌봄 기록 AI 비서", sub: "질문하면 근거를 정리해드려요" },
          ].map(({ href, title, sub }, i) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300 animate-rag-fade-in-up"
              style={{ animationDelay: `${60 + i * 45}ms` }}
            >
              <p className="font-semibold text-slate-800">{title}</p>
              <p className="mt-1 text-sm text-slate-500">{sub}</p>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
