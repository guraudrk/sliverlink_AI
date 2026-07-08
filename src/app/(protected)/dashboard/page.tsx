import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countUnacknowledgedAlerts } from "@/lib/supabase/safety-alerts-repo";

async function AlertBanner() {
  const supabase = await createSupabaseServerClient();
  const count = await countUnacknowledgedAlerts(supabase);
  if (count === 0) return null;
  return (
    <Link
      href="/dashboard/alerts"
      className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 px-5 py-4 ring-1 ring-rose-200 transition-all hover:ring-rose-300 hover:shadow-sm animate-rag-fade-in-up"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-lg">🚨</span>
        <div>
          <p className="font-semibold text-rose-700 text-sm">미확인 안전 알림 {count}건</p>
          <p className="text-xs text-rose-400 mt-0.5">지금 바로 확인해 주세요</p>
        </div>
      </div>
      <span className="shrink-0 text-xs font-bold text-rose-400 tracking-wide">확인 →</span>
    </Link>
  );
}

type BentoItem = {
  href: string;
  title: string;
  sub: string;
  icon: string;
  iconBg: string;
  wide?: boolean;
};

const BENTO: BentoItem[] = [
  { href: "/parents",                  title: "부모님 관리",    sub: "등록 · 조회 · 현황",      icon: "👴", iconBg: "bg-emerald-100", wide: true },
  { href: "/dashboard/caseworker",     title: "케어 관리",      sub: "위험도 순 현황",           icon: "📋", iconBg: "bg-teal-100" },
  { href: "/dashboard/create-task",    title: "새 일정",        sub: "돌봄 요청 작성",           icon: "✏️",  iconBg: "bg-blue-100" },
  { href: "/dashboard/calls",          title: "안부전화",       sub: "AI 비서 전화 시뮬",        icon: "📞", iconBg: "bg-violet-100" },
  { href: "/dashboard/responses",      title: "응답 기록",      sub: "어르신 링크 응답",         icon: "💬", iconBg: "bg-sky-100" },
  { href: "/dashboard/timeline",       title: "케어 타임라인",  sub: "통화·알림·브리핑",         icon: "📅", iconBg: "bg-indigo-100" },
  { href: "/dashboard/social",         title: "사회 연결 점수", sub: "8주 추이 · 연결 상태",     icon: "📊", iconBg: "bg-cyan-100" },
  { href: "/dashboard/alerts",         title: "안전 알림",      sub: "우려사항 모니터링",        icon: "🔔", iconBg: "bg-rose-100" },
  { href: "/dashboard/deliveries",     title: "발송 기록",      sub: "SMS · 음성 이력",          icon: "📤", iconBg: "bg-orange-100" },
  { href: "/dashboard/tasks?unsent=1", title: "미발송 알림",    sub: "바로 확인 · 발송",         icon: "⚡", iconBg: "bg-amber-100" },
  { href: "/dashboard/tasks",          title: "오늘의 일정",    sub: "전체 현황",                icon: "📌", iconBg: "bg-slate-100" },
  { href: "/dashboard/settings",       title: "설정",           sub: "역할 · 계정 관리",         icon: "⚙️",  iconBg: "bg-slate-100" },
  { href: "/dashboard/references",     title: "학술 참조",      sub: "이 서비스가 참고한 논문",  icon: "📚", iconBg: "bg-purple-100", wide: true },
];

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  async function logout() {
    "use server";
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-100 px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-4">

        {/* ── Hero 카드 (다크 그라디언트) ── */}
        <div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-800 to-indigo-900 p-6 shadow-xl shadow-slate-900/20 sm:p-8 animate-rag-fade-in-up"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-blue-500/10" />
          <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-indigo-400/10" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">SilverLink AI</p>
              <h1 className="mt-1.5 text-2xl font-bold text-white sm:text-3xl">안녕하세요 👋</h1>
              <p className="mt-1 max-w-[200px] truncate text-sm text-slate-400">{user.email}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="shrink-0 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-700/80"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>

        {/* ── 안전 알림 배너 (Suspense 스트리밍) ── */}
        <Suspense fallback={null}>
          <AlertBanner />
        </Suspense>

        {/* ── AI 비서 피처 카드 ── */}
        <Link
          href="/dashboard/assistant"
          className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 sm:p-7 animate-rag-fade-in-up"
          style={{ animationDelay: "60ms" }}
        >
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200">AI Assistant</p>
            <h2 className="mt-1.5 text-xl font-bold text-white">돌봄 기록 AI 비서</h2>
            <p className="mt-1 text-sm text-blue-200">질문하면 근거를 찾아 정리해드려요</p>
          </div>
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 transition-colors group-hover:bg-white/20">
            <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9" aria-hidden="true">
              <rect x="3" y="5" width="28" height="22" rx="5" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M3 27l5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M11 27v5l6-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="11" cy="16" r="2" fill="white" />
              <circle cx="17" cy="16" r="2" fill="white" />
              <circle cx="23" cy="16" r="2" fill="white" />
              <path d="M30 2l.9 2.6L33.5 5.5l-2.6.9L30 9l-.9-2.6L26.5 5.5l2.6-.9L30 2z" fill="white" />
            </svg>
          </div>
        </Link>

        {/* ── Bento 그리드 ── */}
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 animate-rag-fade-in-up"
          style={{ animationDelay: "120ms" }}
        >
          {BENTO.map(({ href, title, sub, icon, iconBg, wide }) => (
            <Link
              key={href}
              href={href}
              className={[
                wide ? "col-span-2 flex items-center gap-4 sm:col-span-2" : "flex flex-col gap-3",
                "group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all",
                "hover:-translate-y-0.5 hover:shadow-md hover:ring-blue-200 sm:p-5",
              ].join(" ")}
            >
              <div
                className={[
                  "flex shrink-0 items-center justify-center rounded-xl text-xl",
                  iconBg,
                  wide ? "h-12 w-12" : "h-10 w-10",
                ].join(" ")}
              >
                {icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-slate-800">{title}</p>
                <p className="mt-0.5 truncate text-xs leading-tight text-slate-400">{sub}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
