import Link from "next/link";
import { redirect } from "next/navigation";
import { PhoneCall, Bell, Sparkles } from "lucide-react";
import { DashboardNavBar } from "@/components/app/dashboard-nav-bar";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { NavigationProgress } from "@/components/app/navigation-progress";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { getServerUser } from "@/lib/supabase/server-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countUnacknowledgedAlerts } from "@/lib/supabase/safety-alerts-repo";
import type { UserRole } from "@/app/api/user/role/route";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const role: UserRole = (user.user_metadata?.role as UserRole) ?? "family";
  const supabase = await createSupabaseServerClient();
  const alertCount = await countUnacknowledgedAlerts(supabase);
  const emailPrefix = user.email?.split("@")[0] ?? "사용자";

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F5F7FB" }}>
      <NavigationProgress />

      {/* ── Sidebar (desktop 768px+) ── */}
      <aside
        className="hidden md:flex md:flex-col"
        style={{
          width: 256,
          flexShrink: 0,
          backgroundColor: "#fff",
          borderRight: "1px solid #E7EBF3",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 40,
          overflowY: "auto",
        }}
      >
        {/* Logo */}
        <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 20px", borderBottom: "1px solid #E7EBF3", flexShrink: 0 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#5B82FF,#2E5BFF)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <PhoneCall size={15} color="#fff" strokeWidth={1.8} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#101828" }}>SilverLink AI</span>
          </Link>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: "12px 12px 0" }}>
          <SidebarNav alertCount={alertCount} />
        </div>

        {/* Bottom AI Care card */}
        <div style={{ padding: "12px 16px 20px", flexShrink: 0 }}>
          <Link
            href="/dashboard/assistant"
            style={{ display: "block", borderRadius: 14, background: "linear-gradient(135deg,#12183F,#1B2660)", padding: "14px 16px", textDecoration: "none" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Sparkles size={13} color="#8FA6FF" strokeWidth={1.8} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8FA6FF", textTransform: "uppercase", letterSpacing: "0.1em" }}>AI 케어 비서</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.4 }}>
              돌봄 기록을 바탕으로 AI가 답변해 드려요
            </p>
          </Link>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="md:ml-64" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Desktop topbar */}
        <header
          className="hidden md:flex md:ml-64"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            left: 256,
            height: 64,
            backgroundColor: "#fff",
            borderBottom: "1px solid #E7EBF3",
            zIndex: 39,
            alignItems: "center",
            padding: "0 24px",
            gap: 16,
          }}
        >
          {/* Search */}
          <div style={{ flex: 1, maxWidth: 340 }}>
            <input
              type="text"
              placeholder="검색..."
              readOnly
              style={{ width: "100%", padding: "8px 14px", borderRadius: 10, border: "1px solid #E7EBF3", fontSize: 14, color: "#101828", backgroundColor: "#F5F7FB", outline: "none", cursor: "text" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Bell */}
            <Link href="/dashboard/alerts" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, border: "1px solid #E7EBF3", backgroundColor: "#fff", textDecoration: "none" }}>
              <Bell size={16} color="#475467" strokeWidth={1.8} />
              {alertCount > 0 && (
                <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", backgroundColor: "#F04438", border: "1.5px solid #fff" }} />
              )}
            </Link>

            {/* Avatar + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#2E5BFF", flexShrink: 0 }}>
                {emailPrefix.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#101828", margin: 0, lineHeight: 1.2 }}>{emailPrefix}</p>
                <p style={{ fontSize: 11, color: "#98A2B3", margin: 0 }}>{role === "caseworker" ? "복지사" : "가족"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile topbar (existing component) */}
        <div className="md:hidden">
          <DashboardNavBar role={role} />
        </div>

        {/* Content */}
        <main className="pb-16 sm:pb-0 md:pt-16">
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
