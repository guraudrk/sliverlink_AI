"use client";

import { useEffect, useCallback } from "react";
import type { DeliveryAttemptSummary } from "@/lib/supabase/delivery-attempts-repo";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

const CHANNEL_LABELS: Record<string, string> = {
  voice_call: "AI 전화",
  sms: "SMS",
  kakao_alimtalk: "카카오 알림톡",
};

const STATUS_LABELS: Record<string, string> = {
  answered: "응답 완료",
  sent: "발송 완료",
  failed: "실패",
  pending: "대기 중",
};

const REPLY_KEY_LABELS: Record<string, string> = {
  "1": "1번 (완료)",
  "2": "2번 (도움 요청)",
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

function parseVoicePayload(payload: unknown): {
  voiceReplied?: boolean;
  replyKey?: string;
  voiceDuration?: number;
} {
  if (!payload || typeof payload !== "object") return {};
  const p = payload as Record<string, unknown>;
  return {
    voiceReplied: typeof p.voiceReplied === "boolean" ? p.voiceReplied : undefined,
    replyKey: typeof p.replyKey === "string" ? p.replyKey : undefined,
    voiceDuration: typeof p.voiceDuration === "number" ? p.voiceDuration : undefined,
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  attempt: DeliveryAttemptSummary;
  parent: ParentProfile | null;
  onClose: () => void;
};

export function DeliveryDetailModal({ attempt, parent, onClose }: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const voiceData = attempt.channel === "voice_call" ? parseVoicePayload(attempt.response_payload) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-0 sm:items-center sm:pb-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${channelBadgeClass(attempt.channel)}`}>
              {CHANNEL_LABELS[attempt.channel] ?? attempt.channel}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(attempt.status)}`}>
              {STATUS_LABELS[attempt.status] ?? attempt.status}
            </span>
          </div>
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <dl className="space-y-3 text-sm">
          {/* 수신자 */}
          <div className="flex justify-between">
            <dt className="text-slate-500">수신자</dt>
            <dd className="font-medium text-slate-800">
              {parent ? `${parent.display_name} (${parent.phone ?? "번호 없음"})` : "알 수 없음"}
            </dd>
          </div>

          {/* 발송 시각 */}
          <div className="flex justify-between">
            <dt className="text-slate-500">발송 시각</dt>
            <dd className="font-medium text-slate-800">{formatDateTime(attempt.created_at)}</dd>
          </div>

          {/* 채널별 상세 */}
          {attempt.channel === "voice_call" && voiceData && (
            <>
              <div className="flex justify-between">
                <dt className="text-slate-500">응답 여부</dt>
                <dd className="font-medium text-slate-800">
                  {voiceData.voiceReplied ? "키패드 응답 있음" : "응답 없음"}
                </dd>
              </div>
              {voiceData.replyKey && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">눌린 키</dt>
                  <dd className="font-medium text-slate-800">
                    {REPLY_KEY_LABELS[voiceData.replyKey] ?? `${voiceData.replyKey}번`}
                  </dd>
                </div>
              )}
              {voiceData.voiceDuration != null && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">통화 시간</dt>
                  <dd className="font-medium text-slate-800">{voiceData.voiceDuration}초</dd>
                </div>
              )}
            </>
          )}

          {attempt.channel === "sms" && attempt.external_message_id && (
            <div className="flex justify-between">
              <dt className="text-slate-500">메시지 ID</dt>
              <dd className="font-mono text-xs text-slate-600">{attempt.external_message_id}</dd>
            </div>
          )}

          {/* 에러 */}
          {attempt.error_code && (
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-600">{attempt.error_code}</p>
              {attempt.error_message && (
                <p className="mt-0.5 text-xs text-red-500">{attempt.error_message}</p>
              )}
            </div>
          )}
        </dl>

        {/* 원본 페이로드 접기/펼치기 */}
        {!!attempt.response_payload && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
              원본 응답 데이터 보기
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              {JSON.stringify(attempt.response_payload, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
