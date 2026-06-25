"use client";

import { useState, useSyncExternalStore, type FormEvent, type SVGProps } from "react";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

type RecentRequest = {
  sender_name: string;
  target_person: string;
  message: string;
  requested_at: string;
};

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type ApiResponse = {
  ok: boolean;
  dryRun?: boolean;
  payload?: Record<string, unknown>;
  error?: string;
  issues?: { message: string }[];
};

const RECENT_REQUESTS_KEY = "silverlink:recent-requests";
const MAX_RECENT_REQUESTS = 3;

// localStorage는 React state가 아닌 외부 스토어이므로 useSyncExternalStore로 구독한다.
// (같은 탭에서 쓴 변경은 "storage" 이벤트가 발생하지 않아, 쓰기 직후 listeners를 직접 깨운다.)
const recentRequestsListeners = new Set<() => void>();

function getRecentRequestsSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(RECENT_REQUESTS_KEY) ?? "[]";
}

function getRecentRequestsServerSnapshot(): string {
  return "[]";
}

function subscribeToRecentRequests(onStoreChange: () => void): () => void {
  recentRequestsListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    recentRequestsListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function parseRecentRequests(raw: string): RecentRequest[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_REQUESTS) : [];
  } catch {
    return [];
  }
}

function writeRecentRequest(entry: RecentRequest): void {
  const next = [entry, ...parseRecentRequests(getRecentRequestsSnapshot())].slice(0, MAX_RECENT_REQUESTS);
  window.localStorage.setItem(RECENT_REQUESTS_KEY, JSON.stringify(next));
  recentRequestsListeners.forEach((listener) => listener());
}

function describeError(response: ApiResponse | null, fallback: string): string {
  if (!response) return fallback;
  if (response.issues?.length) {
    return response.issues.map((issue) => issue.message).join(" ");
  }
  if (response.error === "missing_webhook_url" || response.error === "webhook_request_failed") {
    return "전달 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";
  }
  return fallback;
}

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

function formatProfileLabel(profile: ParentProfile): string {
  return profile.relationship ? `${profile.display_name} (${profile.relationship})` : profile.display_name;
}

export function TaskRequestForm({ parentProfiles }: { parentProfiles: ParentProfile[] }) {
  const [senderName, setSenderName] = useState("자녀 테스트");
  const [targetPersonId, setTargetPersonId] = useState(parentProfiles[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ApiResponse | null>(null);
  const recentRequestsRaw = useSyncExternalStore(
    subscribeToRecentRequests,
    getRecentRequestsSnapshot,
    getRecentRequestsServerSnapshot
  );
  const recentRequests = parseRecentRequests(recentRequestsRaw);

  const isSubmitting = status === "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (message.trim().length === 0) {
      setMessageError("전달할 말씀을 입력해 주세요.");
      return;
    }
    const selectedProfile = parentProfiles.find((profile) => profile.id === targetPersonId);
    if (!selectedProfile) {
      setMessageError("받는 분을 선택해 주세요.");
      return;
    }
    setMessageError(null);
    setStatus("submitting");
    setStatusMessage(null);

    try {
      const res = await fetch("/api/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_name: senderName,
          target_person_id: targetPersonId,
          target_person: selectedProfile.display_name,
          message,
        }),
      });
      const data: ApiResponse = await res.json();
      setLastResponse(data);

      if (!res.ok || !data.ok) {
        setStatus("error");
        setStatusMessage(describeError(data, "요청을 보내지 못했어요. 다시 시도해 주세요."));
        return;
      }

      setStatus("success");
      setStatusMessage(
        data.dryRun
          ? "(Dry Run) 실제 전송 없이 요청이 정상적으로 처리됐어요."
          : "요청이 성공적으로 전달됐어요."
      );

      const requestedAt = (data.payload?.requested_at as string | undefined) ?? new Date().toISOString();
      writeRecentRequest({
        sender_name: senderName,
        target_person: selectedProfile.display_name,
        message,
        requested_at: requestedAt,
      });
      setMessage("");
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
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">전달할 내용을 적어주세요</h2>
          <p className="text-slate-500">남겨주신 말씀은 저희가 정성껏 어르신께 전달해 드릴게요.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="sender_name" className="block text-base font-semibold text-slate-700">
            보내는 분
          </label>
          <input
            id="sender_name"
            name="sender_name"
            type="text"
            value={senderName}
            onChange={(event) => setSenderName(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="target_person" className="block text-base font-semibold text-slate-700">
            받는 분
          </label>
          <select
            id="target_person"
            name="target_person"
            value={targetPersonId}
            onChange={(event) => setTargetPersonId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {parentProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {formatProfileLabel(profile)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="block text-base font-semibold text-slate-700">
            전하실 말씀
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              if (messageError) setMessageError(null);
            }}
            placeholder="예) 오늘 병원 다녀오셨는지 여쭤봐 주세요."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {messageError ? (
            <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
              <AlertIcon className="h-4 w-4" />
              {messageError}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isSubmitting ? "전달하는 중..." : "전달하기"}
        </button>

        {status !== "idle" && statusMessage ? (
          <div
            role="status"
            aria-live="polite"
            className={
              status === "success"
                ? "flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-700"
                : "flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-base font-medium text-rose-700"
            }
          >
            {status === "success" ? (
              <CheckIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        ) : null}
      </form>

      {recentRequests.length > 0 ? (
        <section className="mt-6 rounded-3xl bg-white/70 p-6 ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-lg font-bold text-slate-700">최근 보낸 요청</h2>
          <ul className="mt-3 space-y-3">
            {recentRequests.map((request, index) => (
              <li
                key={`${request.requested_at}-${index}`}
                className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
              >
                <p className="font-semibold text-slate-700">
                  {request.sender_name} → {request.target_person}
                </p>
                <p className="mt-1 line-clamp-2">{request.message}</p>
                <p className="mt-1 text-xs text-slate-400">{formatTimestamp(request.requested_at)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.415l-7.07 7.071a1 1 0 01-1.415 0L3.296 8.852a1 1 0 111.415-1.414l4.214 4.213 6.364-6.364a1 1 0 011.415.003z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.516-2.63L8.485 2.495zM10 6a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1zm0 7a1 1 0 100 2 1 1 0 000-2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
