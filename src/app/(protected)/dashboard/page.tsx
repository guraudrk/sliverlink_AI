import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countUnacknowledgedAlerts } from "@/lib/supabase/safety-alerts-repo";

function AiChatIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9" aria-hidden="true">
      <rect x="3" y="5" width="28" height="22" rx="5" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3 27l5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M31 27l-5-5" stroke="white" strokeWidth="0" />
      <path d="M11 27v5l6-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="16" r="2" fill="white" />
      <circle cx="17" cy="16" r="2" fill="white" />
      <circle cx="23" cy="16" r="2" fill="white" />
      <path d="M30 2l.9 2.6L33.5 5.5l-2.6.9L30 9l-.9-2.6L26.5 5.5l2.6-.9L30 2z" fill="white" />
    </svg>
  );
}

export default async function DashboardPage() {
  // getServerUser는 React.cache()로 감싸져 있어 layout.tsx에서 이미 호출했으면 재사용한다.
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const unreadAlertCount = await countUnacknowledgedAlerts(supabase);

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
            <p className="mt-1 text-slate-500">{user.email}</p>
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

        <Link
          href="/dashboard/assistant"
          className="flex items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300 sm:p-8 animate-rag-fade-in-up"
          style={{ animationDelay: "60ms" }}
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">AI Assistant</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">돌봄 기록 AI 비서</h2>
            <p className="mt-1 text-slate-500">질문하면 근거를 찾아 정리해드려요</p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-200/60">
            <AiChatIcon />
          </div>
        </Link>

        {unreadAlertCount > 0 ? (
          <Link
            href="/dashboard/alerts"
            className="flex items-center justify-between gap-4 rounded-2xl bg-rose-50 px-5 py-4 ring-1 ring-rose-200 transition-colors hover:ring-rose-400 animate-rag-fade-in-up"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🚨</span>
              <div>
                <p className="font-semibold text-rose-700">안전 알림 {unreadAlertCount}건</p>
                <p className="text-sm text-rose-500">미확인 안전 우려사항이 있어요</p>
              </div>
            </div>
            <span className="text-rose-400 text-sm font-semibold">확인하기 →</span>
          </Link>
        ) : null}

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
            { href: "/dashboard/alerts", title: "안전 알림", sub: "안부전화 안전 우려사항" },
            { href: "/dashboard/social", title: "사회 연결 점수", sub: "8주 추이 · 연결 상태" },
          ].map(({ href, title, sub }, i) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300 animate-rag-fade-in-up"
              style={{ animationDelay: `${120 + i * 45}ms` }}
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
