"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { ElderQuickPopup } from "@/components/app/elder-quick-popup";

type Elder = {
  id: string;
  display_name?: string | null;
  relationship?: string | null;
};

type Props = {
  parents: Elder[];
};

export function DashboardEldersSection({ parents }: Props) {
  const [selected, setSelected] = useState<Elder | null>(null);
  const [reportCache, setReportCache] = useState<Record<string, string>>({});

  function handleReportGenerated(parentId: string, text: string) {
    setReportCache((prev) => ({ ...prev, [parentId]: text }));
  }

  if (parents.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {parents.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className="flex flex-col items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            style={{
              borderRadius: 20,
              padding: "20px 12px",
              aspectRatio: "1",
              backgroundColor: "var(--sl-card)",
              border: "1px solid var(--sl-border)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              gap: 10,
              cursor: "pointer",
              appearance: "none",
              textAlign: "center",
            }}
          >
            <div
              className="flex shrink-0 items-center justify-center rounded-full text-lg font-bold"
              style={{ width: 52, height: 52, backgroundColor: "#EEF2FF", color: "var(--sl-primary)" }}
            >
              {(p.display_name ?? "?").charAt(0)}
            </div>
            <div className="min-w-0 w-full text-center">
              <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "var(--sl-ink)", margin: 0 }}>
                {p.display_name ?? "이름 없음"}
              </p>
              {p.relationship && (
                <p className="truncate" style={{ fontSize: 11, color: "var(--sl-muted)", margin: "2px 0 0" }}>
                  {p.relationship}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <ElderQuickPopup
          elder={selected}
          onClose={() => setSelected(null)}
          reportCache={reportCache}
          onReportGenerated={handleReportGenerated}
        />
      )}
    </>
  );
}
