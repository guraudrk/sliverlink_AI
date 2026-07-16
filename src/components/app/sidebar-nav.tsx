"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  Bell,
  CalendarDays,
  Activity,
  Sparkles,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",           label: "대시보드",       Icon: LayoutDashboard },
  { href: "/parents",             label: "부모님 관리",    Icon: Users },
  { href: "/dashboard/calls",     label: "통화 기록",      Icon: PhoneCall },
  { href: "/dashboard/alerts",    label: "안전 알림",      Icon: Bell },
  { href: "/dashboard/timeline",  label: "케어 타임라인",  Icon: CalendarDays },
  { href: "/dashboard/social",    label: "사회 연결 점수", Icon: Activity },
  { href: "/dashboard/assistant", label: "AI 비서",        Icon: Sparkles },
  { href: "/dashboard/settings",  label: "설정",           Icon: Settings },
] as const;

type Props = { alertCount?: number };

export function SidebarNav({ alertCount }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/parents") return pathname.startsWith("/parents");
    return pathname.startsWith(href);
  }

  return (
    <nav style={{ padding: "4px 0" }}>
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        const isAlerts = href === "/dashboard/alerts";
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 10,
              marginBottom: 2,
              backgroundColor: active ? "var(--sl-primary-tint)" : "transparent",
              color: active ? "#2E5BFF" : "var(--sl-body)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              transition: "background-color 0.12s ease, color 0.12s ease",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--sl-bg)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
              }
            }}
          >
            <Icon size={17} strokeWidth={active ? 2.1 : 1.8} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, lineHeight: 1 }}>{label}</span>
            {isAlerts && alertCount ? (
              <span
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: "#F04438",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 5px",
                }}
              >
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
