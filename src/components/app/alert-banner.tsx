"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = { initialCount: number };

export function AlertBanner({ initialCount }: Props) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("safety-alerts-banner")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "safety_alerts" },
        () => setCount((n) => n + 1)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "safety_alerts" },
        (payload) => {
          if (payload.new.acknowledged_at && !payload.old.acknowledged_at) {
            setCount((n) => Math.max(0, n - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
