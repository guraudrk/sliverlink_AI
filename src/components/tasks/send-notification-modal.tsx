"use client";

import { useEffect, useState } from "react";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";

type Channel = "sms" | "kakao_alimtalk" | "voice_call";

const CHANNEL_LABELS: Record<Channel, string> = {
  sms: "SMS",
  kakao_alimtalk: "카카오 알림톡",
  voice_call: "AI 안부전화 (TTS)",
};

type SyncResult = {
  voiceReplied: boolean;
  replyKey: number | null;
  status: string;
  duration: number | null;
};

// Slice 13.0 — 대시보드의 "미발송 알림" 목록에서 항목을 클릭했을 때 뜨는 채널 선택 + 발송 팝업.
// 백엔드는 새로 만들지 않고 기존 POST /api/delivery/preview(Mock 발송)를 그대로 재사용한다.
// Day17: voice_call 채널 추가 + 발신 후 키패드 응답 확인 UI 추가
export function SendNotificationModal({
  task,
  onClose,
  onSent,
}: {
  task: CareTaskSummary;
  onClose: () => void;
  onSent: (careTaskId: string) => void;
}) {
  const [channel, setChannel] = useState<Channel>("sms");
  const [messageText, setMessageText] = useState(task.original_request ?? "");
  const [sending, setSending] = useState(false);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 발신 완료 후 상태 (음성 채널에서 키패드 응답 확인용)
  const [sentAttemptId, setSentAttemptId] = useState<string | null>(null);
  const [sentChannel, setSentChannel] = useState<Channel | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const composeType = channel === "voice_call" ? "call_script" : "sms";

  async function handleAiCompose() {
    setComposing(true);
    setError(null);
    try {
      const res = await fetch("/api/delivery/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ care_task_id: task.id, compose_type: composeType }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("AI 초안 생성에 실패했어요. 직접 입력해 주세요.");
        return;
      }
      setMessageText(data.text);
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setComposing(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    const text = messageText.trim();
    try {
      const body: Record<string, unknown> = { care_task_id: task.id, channel };
      if (channel === "voice_call") {
        if (text) body.call_script = text;
      } else {
        if (text) body.message_text = text;
      }
      const res = await fetch("/api/delivery/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("발송에 실패했어요. 다시 시도해 주세요.");
        return;
      }
      if (channel === "voice_call" && data.deliveryAttemptId) {
        // 음성 채널은 모달을 닫지 않고 키패드 응답 확인 UI를 보여준다
        setSentAttemptId(data.deliveryAttemptId as string);
        setSentChannel(channel);
        onSent(task.id);
      } else {
        onSent(task.id);
      }
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setSending(false);
    }
  }

  async function handleSyncStatus() {
    if (!sentAttemptId) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/voice/sync-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryAttemptId: sentAttemptId }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSyncResult({
          voiceReplied: data.voiceReplied as boolean,
          replyKey: (data.replyKey as number | null) ?? null,
          status: data.status as string,
          duration: (data.duration as number | null) ?? null,
        });
      } else {
        setError("응답 확인에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setSyncing(false);
    }
  }

  // 음성 발신 완료 후 응답 확인 화면
  if (sentAttemptId && sentChannel === "voice_call") {
    const replyLabel =
      syncResult?.voiceReplied
        ? syncResult.replyKey === 1
          ? "1번 키 눌림 (완료)"
          : syncResult.replyKey === 2
            ? "2번 키 눌림 (도움 요청)"
            : "키패드 응답 수신"
        : null;

    return (
      <div
        role="presentation"
        onClick={onClose}
        className="animate-rag-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-sent-modal-title"
          onClick={(event) => event.stopPropagation()}
          className="animate-rag-pop-in max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:max-w-lg sm:rounded-3xl sm:p-8"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="voice-sent-modal-title" className="text-xl font-bold text-slate-900">
              AI 안부전화 발신 완료
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            TTS 음성 전화를 발신했어요. 어르신이 키패드를 누른 뒤 아래 버튼으로 응답을 확인하세요.
          </p>

          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 ring-1 ring-slate-200">
            <span className="font-semibold text-slate-600">키패드 안내:</span> 1번 = 완료, 2번 = 도움 요청
          </div>

          {syncResult ? (
            <div className={`mt-4 rounded-xl px-4 py-3 ring-1 ${
              syncResult.voiceReplied
                ? "bg-emerald-50 ring-emerald-200"
                : "bg-slate-50 ring-slate-200"
            }`}>
              {syncResult.voiceReplied ? (
                <>
                  <p className="font-semibold text-emerald-700">✓ 응답 수신됨</p>
                  {replyLabel ? <p className="mt-1 text-sm text-emerald-600">{replyLabel}</p> : null}
                  {syncResult.duration ? (
                    <p className="mt-0.5 text-xs text-emerald-500">통화 시간 {syncResult.duration}초</p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-slate-600">아직 키패드 응답이 없어요. 잠시 후 다시 확인하세요.</p>
              )}
            </div>
          ) : null}

          {error ? (
            <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-100">{error}</div>
          ) : null}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleSyncStatus}
              disabled={syncing}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-300"
            >
              {syncing ? "확인 중..." : "응답 확인"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="animate-rag-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-notification-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="animate-rag-pop-in max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="send-notification-modal-title" className="text-xl font-bold text-slate-900">
            지금 알릴까요?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p className="mt-1 text-sm text-slate-500">{task.target_person ?? "대상자 미지정"}</p>
        <p className="mt-0.5 text-xs text-slate-400">Mock 발송이에요 — 실제로 외부에 전송되지 않아요.</p>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">채널 선택</p>
          <div className="flex gap-2">
            {(Object.keys(CHANNEL_LABELS) as Channel[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setChannel(option)}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  channel === option ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {CHANNEL_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="send_message_text" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {channel === "voice_call" ? "TTS 스크립트" : "보낼 내용"}
            </label>
            <button
              type="button"
              onClick={handleAiCompose}
              disabled={composing}
              className="flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 1a.75.75 0 01.75.75V2.5h1.75a.75.75 0 010 1.5H10.75V5.5a.75.75 0 01-1.5 0V4H7.5a.75.75 0 010-1.5h1.75V1.75A.75.75 0 0110 1zM5.5 8a.75.75 0 01.75.75v1h1a.75.75 0 010 1.5h-1v1a.75.75 0 01-1.5 0v-1h-1a.75.75 0 010-1.5h1v-1A.75.75 0 015.5 8zM14 11a.75.75 0 01.75.75v.75h.75a.75.75 0 010 1.5h-.75v.75a.75.75 0 01-1.5 0v-.75h-.75a.75.75 0 010-1.5h.75v-.75A.75.75 0 0114 11z" />
              </svg>
              {composing ? "AI 작성 중..." : "AI 초안 생성"}
            </button>
          </div>
          <textarea
            id="send_message_text"
            rows={3}
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder={channel === "voice_call" ? "TTS로 읽어줄 내용을 입력하세요 (비우면 자동 스크립트 사용)" : ""}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 shadow-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {channel === "voice_call" ? (
            <p className="text-xs text-slate-400">키패드 안내: 1번 = 완료 확인, 2번 = 도움 요청</p>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-100">{error}</div>
        ) : null}

        <button
          type="button"
          disabled={sending}
          onClick={handleSend}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-300"
        >
          {sending ? "보내는 중..." : `${CHANNEL_LABELS[channel]}로 보내기`}
        </button>
      </div>
    </div>
  );
}
