"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type NotificationView = {
  message_text: string | null;
  call_script: string | null;
  target_person: string | null;
};

type ViewState =
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "expired" }
  | { kind: "already_responded" }
  | { kind: "ready"; notification: NotificationView }
  | { kind: "responded"; label: string }
  | { kind: "error" };

const ACTIONS = [
  { action: "completed", label: "완료했어요" },
  { action: "need_help", label: "도움이 필요해요" },
  { action: "remind_later", label: "나중에 다시 알려주세요" },
  { action: "wrong_target", label: "잘못 온 알림이에요" },
] as const;

export default function ResponsePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`/api/responses/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (!data.ok) {
          setState({ kind: "not_found" });
          return;
        }
        if (data.isResponded) {
          setState({ kind: "already_responded" });
          return;
        }
        if (data.isExpired) {
          setState({ kind: "expired" });
          return;
        }
        setState({ kind: "ready", notification: data.notification });
      })
      .catch(() => {
        if (active) setState({ kind: "error" });
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function handleAction(action: string, label: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/responses/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok) {
        setState({ kind: "responded", label });
      } else {
        setState({ kind: "error" });
      }
    } catch {
      setState({ kind: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>

        {state.kind === "loading" ? <p className="mt-6 text-slate-400">불러오는 중...</p> : null}

        {state.kind === "not_found" || state.kind === "error" ? (
          <p className="mt-6 text-lg text-slate-600">
            연결할 수 없는 링크예요. 자녀/보호자분께 다시 확인을 부탁드려 보세요.
          </p>
        ) : null}

        {state.kind === "expired" ? (
          <p className="mt-6 text-lg text-slate-600">이 링크는 만료됐어요. 새 알림을 기다려 주세요.</p>
        ) : null}

        {state.kind === "already_responded" ? (
          <p className="mt-6 text-lg text-slate-600">이미 응답해 주신 알림이에요. 감사합니다.</p>
        ) : null}

        {state.kind === "ready" ? (
          <>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              {state.notification.target_person ? `${state.notification.target_person}님, ` : ""}안녕하세요
            </h1>
            <p className="mt-3 text-lg text-slate-700">
              {state.notification.call_script ?? state.notification.message_text ?? "전달드릴 말씀이 있어요."}
            </p>
            <div className="mt-8 space-y-3">
              {ACTIONS.map(({ action, label }) => (
                <button
                  key={action}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAction(action, label)}
                  className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {state.kind === "responded" ? (
          <>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">전달됐어요</h1>
            <p className="mt-3 text-lg text-slate-700">&ldquo;{state.label}&rdquo;로 응답을 전달했어요. 감사합니다.</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
