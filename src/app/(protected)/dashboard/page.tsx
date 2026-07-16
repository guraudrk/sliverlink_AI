import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, PhoneCall, Activity, Bell, Mic, ChevronRight } from "lucide-react";
import { getServerUser } from "@/lib/supabase/server-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countUnacknowledgedAlerts } from "@/lib/supabase/safety-alerts-repo";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import { OnboardingModal } from "@/components/app/onboarding-modal";

async function AlertBanner() {
  const supabase = await createSupabaseServerClient();
  const count = await countUnacknowledgedAlerts(supabase);
  if (count === 0) return null;
  return (
    <Link
      href="/dashboard/alerts"
      className="flex items-center justify-between gap-3 rounded-2xl px-5 py-4 transition-all hover:opacity-90 animate-rag-fade-in-up"
      style={{ backgroundColor: "#FEF3F2", border: "1px solid #FECDCA" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#FECDCA" }}>
          <Bell size={16} color="#B42318" strokeWidth={2} />
        </div>
        <div>
          <p style={{ fontWeight: 600, color: "#B42318", fontSize: 14, margin: 0 }}>미확인 안전 알림 {count}건</p>
          <p style={{ fontSize: 12, color: "#F04438", margin: "2px 0 0" }}>지금 바로 확인해 주세요</p>
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#B42318" }}>확인 →</span>
    </Link>
  );
}

type BentoItem = {
  href: string;
  title: string;
  sub: string;
  emoji: string;
  color: string;
  wide?: boolean;
};

const BENTO: BentoItem[] = [
  { href: "/dashboard/calls",          title: "통화 기록",      sub: "녹음 · AI 분석 결과",      emoji: "🎙️", color: "#F0EDFF" },
  { href: "/dashboard/responses",      title: "분석 기록",      sub: "통화 요약 · 신호 이력",    emoji: "💬", color: "#EFF8FF" },
  { href: "/dashboard/timeline",       title: "케어 타임라인",  sub: "녹음·알림·브리핑",         emoji: "📅", color: "#EEF2FF" },
  { href: "/dashboard/social",         title: "사회 연결 점수", sub: "8주 추이 · 연결 상태",     emoji: "📊", color: "#ECFDF3" },
  { href: "/dashboard/alerts",         title: "안전 알림",      sub: "우려사항 모니터링",        emoji: "🔔", color: "#FEF3F2" },
  { href: "/dashboard/create-task",    title: "새 일정",        sub: "돌봄 요청 작성",           emoji: "✏️", color: "#EEF2FF" },
  { href: "/dashboard/deliveries",     title: "분석 이력",      sub: "AI 전사 · 분석 로그",      emoji: "📤", color: "#FFF8EB" },
  { href: "/dashboard/tasks",          title: "오늘의 일정",    sub: "전체 현황",                emoji: "📌", color: "#F5F7FB" },
  { href: "/dashboard/references",     title: "학술 참조",      sub: "이 서비스가 참고한 논문",  emoji: "📚", color: "#F5F3FF", wide: true },
  { href: "/dashboard/settings",       title: "설정",           sub: "역할 · 계정 관리",         emoji: "⚙️", color: "#F5F7FB" },
  { href: "/parents",                  title: "부모님 관리",    sub: "등록 · 조회 · 현황",       emoji: "👴", color: "#ECFDF3" },
  { href: "/dashboard/caseworker",     title: "케어 관리",      sub: "위험도 순 현황",           emoji: "📋", color: "#F0FDFA" },
];

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const [parents, alertCount] = await Promise.all([
    listParentProfiles(supabase),
    countUnacknowledgedAlerts(supabase),
  ]);

  const emailPrefix = user.email?.split("@")[0] ?? "사용자";
  const now = new Date();
  const dateLabel = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

  async function logout() {
    "use server";
    const sc = await createSupabaseServerClient();
    await sc.auth.signOut();
    redirect("/login");
  }

  return (
    <div style={{ backgroundColor: "var(--sl-bg)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">

        {/* ── Greeting header ── */}
        <div className="flex items-start justify-between gap-4 animate-rag-fade-in-up">
          <div>
            <p style={{ fontSize: 13, color: "var(--sl-placeholder)", margin: 0 }}>{dateLabel}</p>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--sl-ink)", margin: "4px 0 0" }}>
              안녕하세요, {emailPrefix}님!
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/calls"
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5"
              style={{ backgroundColor: "#2E5BFF", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700 }}
            >
              <Mic size={14} strokeWidth={2} />
              새 녹음
            </Link>
            <form action={logout}>
              <button
                type="submit"
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--sl-border)", backgroundColor: "var(--sl-card)", color: "var(--sl-muted)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>

        {/* ── Alert banner ── */}
        <Suspense fallback={null}>
          <AlertBanner />
        </Suspense>

        {/* ── 4 Stat cards ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 animate-rag-fade-in-up" style={{ animationDelay: "40ms" }}>
          {[
            { label: "등록 어르신",   value: parents.length, Icon: Users,    tintColor: "#EEF2FF", iconColor: "#2E5BFF" },
            { label: "이번 달 통화",  value: "—",            Icon: PhoneCall, tintColor: "#EFF8FF", iconColor: "#2E5BFF" },
            { label: "분석 완료",     value: "—",            Icon: Activity,  tintColor: "#ECFDF3", iconColor: "#12B76A" },
            { label: "주의 신호",     value: alertCount,     Icon: Bell,      tintColor: alertCount > 0 ? "#FEF3F2" : "var(--sl-bg)", iconColor: alertCount > 0 ? "#F04438" : "var(--sl-placeholder)" },
          ].map(({ label, value, Icon, tintColor, iconColor }) => (
            <div key={label} className="rounded-2xl p-4" style={{ backgroundColor: "var(--sl-card)", border: "1px solid var(--sl-border)" }}>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: tintColor }}>
                <Icon size={17} color={iconColor} strokeWidth={1.8} />
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: "var(--sl-ink)", margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 12, color: "var(--sl-placeholder)", margin: "4px 0 0" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── AI 비서 피처 카드 ── */}
        <Link
          href="/dashboard/assistant"
          className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl p-5 transition-all hover:opacity-95 animate-rag-fade-in-up"
          style={{ background: "linear-gradient(135deg,#12183F,#1B2660)", textDecoration: "none", animationDelay: "80ms" }}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
          <div className="min-w-0">
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8FA6FF", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>AI Assistant</p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "4px 0 3px" }}>돌봄 기록 AI 비서</h2>
            <p style={{ fontSize: 13, color: "#A7B4E8", margin: 0 }}>질문하면 근거를 찾아 정리해드려요</p>
          </div>
          <ChevronRight size={20} color="#8FA6FF" strokeWidth={1.8} style={{ flexShrink: 0 }} />
        </Link>

        {/* ── 온보딩 모달 ── */}
        <OnboardingModal parentCount={parents.length} />

        {/* ── Bento 그리드 ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 animate-rag-fade-in-up" style={{ animationDelay: "120ms" }}>
          {BENTO.map(({ href, title, sub, emoji, color, wide }) => (
            <Link
              key={href}
              href={href}
              className={[
                wide ? "col-span-2 flex items-center gap-4 sm:col-span-2" : "flex flex-col gap-3",
                "group rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5",
              ].join(" ")}
              style={{ backgroundColor: "var(--sl-card)", border: "1px solid var(--sl-border)", textDecoration: "none" }}
            >
              <div
                className={["flex shrink-0 items-center justify-center rounded-xl text-xl", wide ? "h-12 w-12" : "h-10 w-10"].join(" ")}
                style={{ backgroundColor: color }}
              >
                {emoji}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight" style={{ color: "var(--sl-ink)", margin: 0 }}>{title}</p>
                <p className="mt-0.5 truncate text-xs leading-tight" style={{ color: "var(--sl-placeholder)" }}>{sub}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
