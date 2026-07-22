"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { DeliveryAttemptSummary } from "@/lib/supabase/delivery-attempts-repo";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

const DeliveryDetailModal = dynamic(
  () =>
    import("@/components/deliveries/delivery-detail-modal").then((m) => ({
      default: m.DeliveryDetailModal,
    })),
  { ssr: false }
);

const CHANNEL_LABELS: Record<string, string> = {
  voice_call: "AI 전화",
  sms: "SMS",
  kakao_alimtalk: "카카오",
};

function channelBadgeClass(channel: string): string {
  if (channel === "voice_call") return "bg-blue-100 text-blue-700";
  if (channel === "sms") return "bg-emerald-100 text-emerald-700";
  if (channel === "kakao_alimtalk") return "bg-yellow-100 text-yellow-700";
  return "bg-slate-100 text-slate-500";
}

function statusBadgeClass(status: string): string {
  if (status === "answered") return "bg-blue-100 text-blue-700";
  if (status === "sent") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-500";
}

const STATUS_LABELS: Record<string, string> = {
  answered: "응답 완료",
  sent: "발송 완료",
  failed: "실패",
  pending: "대기 중",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  initialAttempts: DeliveryAttemptSummary[];
  parentById: Record<string, ParentProfile>;
};

export function DeliveriesClient({ initialAttempts, parentById }: Props) {
  const [selected, setSelected] = useState<DeliveryAttemptSummary | null>(null);

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl">

        <div className="mb-6 text-center animate-rag-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">알림 이력</h1>
          <p className="mt-1 text-sm text-slate-500">SMS · 음성 전화 발송 내역</p>
        </div>

        {initialAttempts.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200 animate-rag-fade-in-up" style={{ animationDelay: "60ms" }}>
            <p className="text-slate-500">아직 발송 기록이 없어요.</p>
            <p className="mt-1 text-sm text-slate-400">알림을 발송하면 여기에 이력이 쌓입니다.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {initialAttempts.map((attempt, i) => {
              const parent = parentById[attempt.parent_id] ?? null;
              return (
                <li key={attempt.id} className="animate-rag-fade-in-up" style={{ animationDelay: `${60 + i * 55}ms` }}>
                  <button
                    type="button"
                    onClick={() => setSelected(attempt)}
                    className="w-full rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300 active:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${channelBadgeClass(attempt.channel)}`}
                          >
                            {CHANNEL_LABELS[attempt.channel] ?? attempt.channel}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(attempt.status)}`}
                          >
                            {STATUS_LABELS[attempt.status] ?? attempt.status}
                          </span>
                        </div>
                        <p className="truncate font-medium text-slate-800">
                          {parent
                            ? `${parent.display_name}${parent.phone ? ` · ${parent.phone}` : ""}`
                            : "수신자 정보 없음"}
                        </p>
                        <p className="text-xs text-slate-400">{formatDateTime(attempt.attempted_at)}</p>
                      </div>
                      <svg
                        className="h-4 w-4 shrink-0 text-slate-300"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <DeliveryDetailModal
          attempt={selected}
          parent={parentById[selected.parent_id] ?? null}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
