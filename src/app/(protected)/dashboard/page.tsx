import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronRight,
  Mic,
  UserPlus,
  CalendarDays,
  Calendar,
  BookOpen,
  AlertTriangle,
  BarChart2,
  Send,
  Sparkles,
  FileText,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getServerUser } from "@/lib/supabase/server-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countUnacknowledgedAlerts } from "@/lib/supabase/safety-alerts-repo";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import { OnboardingModal } from "@/components/app/onboarding-modal";
import { AlertBanner } from "@/components/app/alert-banner";

const QUICK_ACCESS = [
  {
    href: "/dashboard/calls",
    title: "통화 요약 보기",
    sub: "통화 기록 · AI 분석 결과 확인",
    Icon: FileText,
    bgColor: "#ECFDF3",
    iconColor: "#10B981",
  },
  {
    href: "/dashboard/calls",
    title: "통화 녹음 저장",
    sub: "녹음 파일 업로드 · 공유",
    Icon: Upload,
    bgColor: "#EFF8FF",
    iconColor: "#0EA5E9",
  },
] as const;

type MoreMenuItem = { href: string; label: string; Icon: LucideIcon; color: string; iconColor: string };

const MORE_MENU: MoreMenuItem[] = [
  { href: "/dashboard/alerts",    label: "안전 알림",       Icon: AlertTriangle, color: "#FEF3F2", iconColor: "#EF4444" },
  { href: "/dashboard/tasks",     label: "일정 관리",       Icon: Calendar,      color: "#FFF8EB", iconColor: "#F59E0B" },
  { href: "/dashboard/social",    label: "AI 케어 리포트",  Icon: BarChart2,     color: "#ECFDF3", iconColor: "#10B981" },
  { href: "/dashboard/deliveries",label: "알림/메시지 이력",Icon: Send,          color: "#EFF8FF", iconColor: "#0EA5E9" },
  { href: "/dashboard/assistant", label: "AI 케어 비서",    Icon: Sparkles,      color: "#EEF2FF", iconColor: "#6366F1" },
  { href: "/dashboard/references",label: "서비스 근거",     Icon: BookOpen,      color: "#F5F3FF", iconColor: "#7C3AED" },
  { href: "/dashboard/calls",     label: "통화 기록",       Icon: FileText,      color: "#FFF8EB", iconColor: "#F59E0B" },
  { href: "/parents",             label: "어르신 추가",     Icon: UserPlus,      color: "#F0FDFA", iconColor: "#0F766E" },
  { href: "/dashboard/timeline",  label: "케어 타임라인",   Icon: CalendarDays,  color: "#F0F9FF", iconColor: "#0369A1" },
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

      {/* ── Navy gradient 헤더 ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
          paddingBottom: 32,
        }}
      >
        <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: 0 }}>{dateLabel}</p>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "6px 0 0", lineHeight: 1.2 }}>
                안녕하세요,<br />{emailPrefix}님 👋
              </h1>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Link
                href="/dashboard/calls"
                className="flex items-center gap-1.5"
                style={{
                  padding: "9px 16px",
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.30)",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  backdropFilter: "blur(8px)",
                  whiteSpace: "nowrap",
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
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.25)",
                    backgroundColor: "rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.80)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6" style={{ marginTop: -20 }}>

        {/* ── 알림 배너 (Realtime 클라이언트 컴포넌트) ── */}
        <AlertBanner initialCount={alertCount} />

        {/* ── 빠른 액세스 ── */}
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
            빠른 액세스
          </p>
          <div className="flex flex-col gap-3">
            {QUICK_ACCESS.map(({ href, title, sub, Icon, bgColor, iconColor }) => (
              <Link
                key={title}
                href={href}
                className="flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
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
                  className="flex shrink-0 items-center justify-center rounded-2xl"
                  style={{ width: 52, height: 52, backgroundColor: bgColor }}
                >
                  <Icon size={22} strokeWidth={1.8} style={{ color: iconColor }} />
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
            {MORE_MENU.map(({ href, label, Icon, color, iconColor }, idx) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                style={{
                  textDecoration: "none",
                  borderBottom:
                    idx < MORE_MENU.length - 1
                      ? "1px solid var(--sl-border)"
                      : "none",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={17} strokeWidth={1.8} style={{ color: iconColor }} />
                </div>
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

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
