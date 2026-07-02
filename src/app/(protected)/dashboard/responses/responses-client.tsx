"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";
import { PageGuideButton } from "@/components/app/page-guide-button";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

const MessageLogDetailModal = dynamic(
  () => import("@/components/responses/message-log-detail-modal").then((m) => ({ default: m.MessageLogDetailModal })),
  { ssr: false }
);

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

interface Props {
  initialResponses: MessageLogSummary[];
  careTaskById: Record<string, CareTaskSummary>;
  parentProfiles: ParentProfile[];
}

export function ResponsesClient({ initialResponses, careTaskById, parentProfiles }: Props) {
  const [parentId, setParentId] = useState("");
  const [selectedLog, setSelectedLog] = useState<MessageLogSummary | null>(null);

  const visibleResponses = parentId
    ? initialResponses.filter((log) => log.parent_id === parentId)
    : initialResponses;

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-3 flex animate-rag-fade-in-up">
          <PageGuideButton title="어르신 응답 기록 안내">
            <section>
              <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
                응답 기록이란?
              </h3>
              <p className="leading-relaxed">SMS로 전달된 <strong>응답 링크</strong>를 어르신이 눌렀을 때 남기는 내용이에요. 어르신이 직접 상태를 체크하거나 메시지를 입력한 결과가 여기 모입니다.</p>
            </section>
            <section>
              <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
                부모님 필터
              </h3>
              <p className="leading-relaxed">상단 선택 박스에서 특정 어르신을 선택하면 그분의 응답만 볼 수 있어요. 기본값은 <strong>등록된 모든 어르신</strong>의 응답을 합쳐서 보여줍니다.</p>
            </section>
            <section>
              <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
                응답 클릭
              </h3>
              <p className="leading-relaxed">각 응답 카드를 클릭하면 관련 일정, 채널, 받은 시각 등 상세 정보를 확인할 수 있어요.</p>
            </section>
          </PageGuideButton>
        </div>

        <div className="mb-8 text-center animate-rag-fade-in-up">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">어르신 응답 기록</h1>
          <p className="mt-2 text-slate-500">링크로 받은 응답을 최근순으로 모아봤어요.</p>
        </div>

        <div className="mb-5 space-y-1.5 animate-rag-fade-in-up" style={{ animationDelay: "60ms" }}>
          <label htmlFor="response_parent_id" className="block text-xs font-semibold text-slate-500">
            부모님 선택
          </label>
          <select
            id="response_parent_id"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">통합 (등록된 모든 어르신)</option>
            {parentProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name}
              </option>
            ))}
          </select>
        </div>

        {visibleResponses.length === 0 ? (
          <p className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200 animate-rag-fade-in-up" style={{ animationDelay: "100ms" }}>
            아직 받은 응답이 없어요.
          </p>
        ) : (
          <ul className="space-y-3">
            {visibleResponses.map((log, i) => (
              <li key={log.id} className="animate-rag-fade-in-up" style={{ animationDelay: `${100 + i * 55}ms` }}>
                <button
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="w-full rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
                >
                  <p className="font-semibold text-slate-800">{log.sender ?? "어르신"}</p>
                  <p className="mt-1 text-slate-600">{log.raw_message}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDate(log.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedLog ? (
        <MessageLogDetailModal
          log={selectedLog}
          relatedTask={selectedLog.care_task_id ? (careTaskById[selectedLog.care_task_id] ?? null) : null}
          onClose={() => setSelectedLog(null)}
        />
      ) : null}
    </div>
  );
}
