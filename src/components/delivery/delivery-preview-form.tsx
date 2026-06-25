"use client";

import { useState, type FormEvent } from "react";
import { DELIVERY_CHANNEL_OPTIONS } from "@/lib/silverlink/delivery/schema";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type ApiResponse = {
  ok: boolean;
  queue?: Record<string, unknown>;
  deliveryAttemptId?: string;
  deliveryStatus?: string;
  error?: string;
  issues?: { message: string }[];
};

const CHANNEL_LABELS: Record<(typeof DELIVERY_CHANNEL_OPTIONS)[number], string> = {
  link: "링크 응답",
  sms: "SMS",
  kakao_alimtalk: "카카오 알림톡",
  voice_call: "AI 안부전화 (voice_call)",
  web_push: "웹 푸시",
};

function describeCareTask(careTask: CareTaskSummary): string {
  const snippet = careTask.original_request?.slice(0, 24) ?? "";
  return `${careTask.target_person ?? "대상자 미지정"} — ${snippet}${snippet.length === 24 ? "..." : ""}`;
}

export function DeliveryPreviewForm({ careTasks }: { careTasks: CareTaskSummary[] }) {
  const [careTaskId, setCareTaskId] = useState(careTasks[0]?.id ?? "");
  const [channel, setChannel] = useState<(typeof DELIVERY_CHANNEL_OPTIONS)[number]>("link");
  const [messageText, setMessageText] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ApiResponse | null>(null);

  const isSubmitting = status === "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setStatusMessage(null);

    try {
      const res = await fetch("/api/delivery/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          care_task_id: careTaskId,
          channel,
          message_text: messageText.trim().length > 0 ? messageText : undefined,
        }),
      });
      const data: ApiResponse = await res.json();
      setLastResponse(data);

      if (!res.ok || !data.ok) {
        setStatus("error");
        setStatusMessage("미리보기 생성에 실패했어요. 다시 시도해 주세요.");
        return;
      }

      setStatus("success");
      setStatusMessage("Mock 발송 미리보기가 생성됐어요. 실제로는 아무것도 발송되지 않았어요.");
    } catch {
      setStatus("error");
      setStatusMessage("네트워크 연결을 확인하고 다시 시도해 주세요.");
    }
  }

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10"
      >
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">발송 미리보기 (Mock)</h2>
          <p className="text-slate-500">실제로는 아무것도 발송되지 않아요 — 큐/시도 기록만 Supabase에 남습니다.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="care_task_id" className="block text-base font-semibold text-slate-700">
            대상 일정
          </label>
          <select
            id="care_task_id"
            value={careTaskId}
            onChange={(event) => setCareTaskId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {careTasks.map((careTask) => (
              <option key={careTask.id} value={careTask.id}>
                {describeCareTask(careTask)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="channel" className="block text-base font-semibold text-slate-700">
            채널
          </label>
          <select
            id="channel"
            value={channel}
            onChange={(event) => setChannel(event.target.value as (typeof DELIVERY_CHANNEL_OPTIONS)[number])}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {DELIVERY_CHANNEL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CHANNEL_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="message_text" className="block text-base font-semibold text-slate-700">
            메시지 내용 (선택)
          </label>
          <textarea
            id="message_text"
            rows={3}
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="예) 아버님, 오전 혈압약 드실 시간이에요."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isSubmitting ? "생성하는 중..." : "미리보기 생성"}
        </button>

        {status !== "idle" && statusMessage ? (
          <div
            role="status"
            aria-live="polite"
            className={
              status === "success"
                ? "rounded-xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-700"
                : "rounded-xl bg-rose-50 px-4 py-3 text-base font-medium text-rose-700"
            }
          >
            {statusMessage}
          </div>
        ) : null}
      </form>

      {lastResponse ? (
        <section className="mt-6 rounded-3xl bg-slate-900 p-6 sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">응답 미리보기</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
