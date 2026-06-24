"use client";

import { useState, type SVGProps } from "react";

type NotificationCandidate = {
  taskId: string;
  taskTitle: string;
  outboundLogCandidate: {
    direction: "outbound";
    status: "prepared";
    source_channel: "system";
    receiver: string;
    raw_message: string;
    related_task: string;
  };
  taskUpdatePatch: {
    parent_notified: true;
    notification_status: "prepared";
    last_notification_at: string;
  };
};

type PrepareResponse = {
  ok: boolean;
  dryRun: boolean;
  count: number;
  candidates: NotificationCandidate[];
};

type LoadStatus = "idle" | "loading" | "success" | "error";

export function NotificationPreviewPanel() {
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [candidates, setCandidates] = useState<NotificationCandidate[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLoading = status === "loading";

  async function handleLoadCandidates() {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/notifications/prepare", { method: "GET" });
      const data: PrepareResponse = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMessage("알림 후보를 불러오지 못했어요. 다시 시도해 주세요.");
        return;
      }

      setCandidates(data.candidates);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("네트워크 연결을 확인하고 다시 시도해 주세요.");
    }
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
        <InfoIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <span>
          Dry Run / Preview 모드입니다. 여기서는 카카오톡 발송이나 Airtable 저장이 실제로 일어나지
          않아요 — 화면에 보이는 결과는 전부 미리보기입니다.
        </span>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">알림 후보 확인하기</h2>
          <p className="text-slate-500">
            지금 시각 기준으로 알림을 보내야 하는 케어 업무를 찾아드려요.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadCandidates}
          disabled={isLoading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isLoading ? "불러오는 중..." : "알림 후보 불러오기"}
        </button>

        {status === "error" && errorMessage ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-base font-medium text-rose-700"
          >
            <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}
      </div>

      {status === "success" ? (
        <section aria-live="polite">
          <p role="status" className="text-base font-semibold text-slate-700">
            총 {candidates.length}건의 알림 후보를 찾았어요.
          </p>

          {candidates.length === 0 ? (
            <p className="mt-3 rounded-xl bg-white px-4 py-3 text-slate-500 ring-1 ring-slate-200">
              지금 알림을 보내야 할 업무가 없어요.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {candidates.map((candidate) => (
                <li
                  key={candidate.taskId}
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-slate-800">{candidate.taskTitle}</h3>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      받는 분: {candidate.outboundLogCandidate.receiver}
                    </span>
                  </div>

                  <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-slate-700">
                    {candidate.outboundLogCandidate.raw_message}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                      notification_status: {candidate.taskUpdatePatch.notification_status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                      parent_notified → true (예정, 아직 적용 안 됨)
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z"
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
