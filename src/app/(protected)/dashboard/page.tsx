import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Mic,
  UserPlus,
  CalendarDays,
  Clock,
  BookOpen,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: "#FECDCA" }}
        >
          <Bell size={16} color="#B42318" strokeWidth={2} />
        </div>
        <div>
          <p style={{ fontWeight: 600, color: "#B42318", fontSize: 14, margin: 0 }}>
            미확인 안전 알림 {count}건
          </p>
          <p style={{ fontSize: 12, color: "#F04438", margin: "2px 0 0" }}>
            지금 바로 확인해 주세요
          </p>
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#B42318" }}>확인 →</span>
    </Link>
  );
}

const MAIN_FEATURES = [
  {
    href: "/dashboard/calls",
    title: "통화 기록",
    sub: "녹음 · 통화 내용 정리",
    emoji: "🎙️",
    bgColor: "#F0EDFF",
  },
  {
    href: "/dashboard/alerts",
    title: "안전 알림",
    sub: "우려사항 모니터링",
    emoji: "🔔",
    bgColor: "#FEF3F2",
  },
  {
    href: "/dashboard/assistant",
    title: "AI 케어 비서",
    sub: "질문하면 근거 있는 답변",
    emoji: "✨",
    bgColor: "#EEF2FF",
  },
  {
    href: "/dashboard/social",
    title: "AI 케어 리포트",
    sub: "8주 추이 · 사회 연결 상태",
    emoji: "📊",
    bgColor: "#ECFDF3",
  },
] as const;

type SecondaryLink = { href: string; label: string; Icon: LucideIcon };

const SECONDARY_LINKS: SecondaryLink[] = [
  { href: "/dashboard/timeline",   label: "케어 타임라인", Icon: CalendarDays },
  { href: "/dashboard/tasks",      label: "일정 관리",     Icon: Clock },
  { href: "/dashboard/deliveries", label: "알림 이력",     Icon: Bell },
  { href: "/dashboard/references", label: "서비스 근거",   Icon: BookOpen },
  { href: "/dashboard/settings",   label: "설정",          Icon: Settings },
];

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const [parents] = await Promise.all([
    listParentProfiles(supabase),
    countUnacknowledgedAlerts(supabase),
  ]);

  const emailPrefix = user.email?.split("@")[0] ?? "사용자";
  const now = new Date();
  const dateLabel = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  async function logout() {
    "use server";
    const sc = await createSupabaseServerClient();
    await sc.auth.signOut();
    redirect("/login");
  }

  return (
    <div style={{ backgroundColor: "var(--sl-bg)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">

        {/* ── 인사 헤더 ── */}
        <div className="flex items-start justify-between gap-4 animate-rag-fade-in-up">
          <div>
            <p style={{ fontSize: 13, color: "var(--sl-muted)", margin: 0 }}>{dateLabel}</p>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--sl-ink)", margin: "4px 0 0" }}>
              안녕하세요, {emailPrefix}님
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/calls"
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5"
              style={{
                backgroundColor: "var(--sl-primary)",
                color: "#fff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <Mic size={13} strokeWidth={2} />
              새 녹음
            </Link>
            <form action={logout}>
              <button
                type="submit"
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--sl-border)",
                  backgroundColor: "var(--sl-card)",
                  color: "var(--sl-muted)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>

        {/* ── 알림 배너 ── */}
        <Suspense fallback={null}>
          <AlertBanner />
        </Suspense>

        {/* ── 주요 기능 (2×2 그리드) ── */}
        <div className="animate-rag-fade-in-up" style={{ animationDelay: "40ms" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--sl-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: "0 0 12px",
            }}
          >
            주요 기능
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MAIN_FEATURES.map(({ href, title, sub, emoji, bgColor }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  borderRadius: 20,
                  padding: 20,
                  backgroundColor: "var(--sl-card)",
                  border: "1px solid var(--sl-border)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  textDecoration: "none",
                }}
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded-2xl text-2xl"
                  style={{ width: 52, height: 52, backgroundColor: bgColor }}
                >
                  {emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--sl-ink)", margin: 0 }}>
                    {title}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--sl-muted)", margin: "3px 0 0" }}>
                    {sub}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  strokeWidth={2}
                  style={{ flexShrink: 0, color: "var(--sl-border)" }}
                />
              </Link>
            ))}
          </div>
        </div>

        {/* ── 어르신 목록 ── */}
        <div className="animate-rag-fade-in-up" style={{ animationDelay: "80ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--sl-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              등록된 어르신
            </p>
            <Link
              href="/parents"
              style={{ fontSize: 12, fontWeight: 600, color: "var(--sl-primary)", textDecoration: "none" }}
            >
              전체 보기 →
            </Link>
          </div>

          {parents.length === 0 ? (
            <Link
              href="/parents"
              className="flex items-center gap-4 transition-all hover:opacity-90"
              style={{
                borderRadius: 20,
                padding: 20,
                backgroundColor: "var(--sl-card)",
                border: "1px dashed var(--sl-border)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                textDecoration: "none",
              }}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-2xl"
                style={{ width: 52, height: 52, backgroundColor: "var(--sl-primary-tint)" }}
              >
                <UserPlus size={20} color="var(--sl-primary)" strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--sl-ink)", margin: 0 }}>
                  어르신을 추가해 보세요
                </p>
                <p style={{ fontSize: 12, color: "var(--sl-muted)", margin: "3px 0 0" }}>
                  등록 후 통화 기록과 알림을 함께 관리할 수 있어요
                </p>
              </div>
            </Link>
          ) : (
            <div className="space-y-3">
              {parents.map((p) => (
                <Link
                  key={p.id}
                  href="/parents"
                  className="flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{
                    borderRadius: 20,
                    padding: 16,
                    backgroundColor: "var(--sl-card)",
                    border: "1px solid var(--sl-border)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    textDecoration: "none",
                  }}
                >
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full text-base font-bold"
                    style={{ width: 44, height: 44, backgroundColor: "#EEF2FF", color: "var(--sl-primary)" }}
                  >
                    {(p.display_name ?? "?").charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 15, fontWeight: 600, color: "var(--sl-ink)", margin: 0 }}>
                      {p.display_name ?? "이름 없음"}
                    </p>
                    {p.relationship && (
                      <p style={{ fontSize: 12, color: "var(--sl-muted)", margin: "2px 0 0" }}>
                        {p.relationship}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    size={16}
                    strokeWidth={2}
                    style={{ flexShrink: 0, color: "var(--sl-border)" }}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── 더 보기 ── */}
        <div className="animate-rag-fade-in-up" style={{ animationDelay: "120ms" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--sl-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: "0 0 12px",
            }}
          >
            더 보기
          </p>
          <div
            style={{
              borderRadius: 20,
              backgroundColor: "var(--sl-card)",
              border: "1px solid var(--sl-border)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            {SECONDARY_LINKS.map(({ href, label, Icon }, idx) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50"
                style={{
                  textDecoration: "none",
                  borderBottom:
                    idx < SECONDARY_LINKS.length - 1
                      ? "1px solid var(--sl-border)"
                      : "none",
                }}
              >
                <Icon
                  size={16}
                  strokeWidth={1.8}
                  style={{ flexShrink: 0, color: "var(--sl-muted)" }}
                />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--sl-ink)" }}>
                  {label}
                </span>
                <ChevronRight
                  size={14}
                  strokeWidth={2}
                  style={{ color: "var(--sl-border)" }}
                />
              </Link>
            ))}
          </div>
        </div>

        {/* ── 온보딩 모달 ── */}
        <OnboardingModal parentCount={parents.length} />

      </div>
    </div>
  );
}
