"use client";

import { useState } from "react";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import type { MessageLogSummary } from "@/lib/supabase/message-logs-repo";
import type { NotificationQueueRow } from "@/lib/supabase/notification-queue-repo";
import { CareTaskDetailModal } from "@/components/tasks/care-task-detail-modal";
import { MessageLogDetailModal } from "@/components/responses/message-log-detail-modal";
import { CarePlanPanel } from "@/components/app/care-plan-panel";

const SEVERITY_LABEL: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  high:   { label: "🔴 높음", color: "text-rose-700",  bg: "bg-rose-50",   ring: "ring-rose-200" },
  medium: { label: "🟠 보통", color: "text-amber-700", bg: "bg-amber-50",  ring: "ring-amber-200" },
  low:    { label: "🟡 낮음", color: "text-yellow-700",bg: "bg-yellow-50", ring: "ring-yellow-200" },
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "예정",
  completed: "완료",
  help_requested: "도움 요청",
  snoozed: "나중에 다시",
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  fall_risk:           "낙상 위험",
  medication_concern:  "복약 문제",
  mobility_concern:    "이동성 감소",
  mental_health_concern: "정신 건강",
  nutrition_concern:   "영양 문제",
  social_isolation:    "사회적 고립",
  urgent_medical:      "긴급 의료",
};

type SafetyAlertRow = {
  id: string;
  call_id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  suggestion: string | null;
  generated_at: string;
  acknowledged_at: string | null;
};

type CallRow = {
  id: string;
  status: string;
  summary: string | null;
  created_at: string;
};

type Props = {
  parentId: string;
  elderName: string;
  careTasks: CareTaskSummary[];
  responses: MessageLogSummary[];
  queueByCareTaskId: Record<string, NotificationQueueRow[]>;
  messageLogByCareTaskId: Record<string, MessageLogSummary>;
  unackedAlerts: SafetyAlertRow[];
  calls: CallRow[];
};

export function ElderDetailClient({
  parentId,
  elderName,
  careTasks,
  responses,
  queueByCareTaskId,
  messageLogByCareTaskId,
  unackedAlerts,
  calls,
}: Props) {
  const [selectedTask, setSelectedTask] = useState<CareTaskSummary | null>(null);
  const [selectedLog, setSelectedLog] = useState<MessageLogSummary | null>(null);
  const [showCarePlan, setShowCarePlan] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SafetyAlertRow | null>(null);

  return (
    <>
      {/* AI 케어 플랜 패널 */}
      {showCarePlan && (
        <CarePlanPanel
          parentId={parentId}
          elderName={elderName}
          onClose={() => setShowCarePlan(false)}
        />
      )}

      {/* 미확인 안전 알림 */}
      {unackedAlerts.length > 0 && (
        <section className="animate-rag-fade-in-up space-y-2" style={{ animationDelay: "80ms" }}>
          <h2 className="text-sm font-bold text-rose-600">⚠️ 미확인 안전 알림</h2>
          {unackedAlerts.map((a) => {
            const sv = SEVERITY_LABEL[a.severity] ?? { label: a.severity, color: "text-slate-700", bg: "bg-slate-50", ring: "ring-slate-200" };
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAlert(a)}
                className={`w-full rounded-2xl ${sv.bg} px-4 py-3 text-left ring-1 ${sv.ring} transition-all hover:shadow-sm hover:brightness-95`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-semibold text-sm ${sv.color}`}>{a.title}</p>
                  <span className={`shrink-0 text-xs font-medium ${sv.color}`}>{sv.label}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.description}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(a.generated_at)} · 탭하면 자세히 보기 →</p>
              </button>
            );
          })}
        </section>
      )}

      {/* AI 케어 플랜 생성 버튼 */}
      <button
        type="button"
        onClick={() => setShowCarePlan(true)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-5 py-4 text-left shadow-md shadow-teal-100 transition-opacity hover:opacity-90 active:opacity-80 animate-rag-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-100">AI 자동 생성</p>
          <p className="mt-0.5 font-bold text-white">다음 주 케어 플랜 초안 만들기</p>
        </div>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 shrink-0 text-white/80" aria-hidden="true">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      </button>

      {/* 일정 */}
      <section className="animate-rag-fade-in-up" style={{ animationDelay: "160ms" }}>
        <h2 className="mb-3 text-lg font-bold text-slate-700">일정</h2>
        {careTasks.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
            등록된 일정이 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {careTasks.map((task, i) => (
              <li key={task.id} className="animate-rag-fade-in-up" style={{ animationDelay: `${200 + i * 40}ms` }}>
                <button
                  type="button"
                  onClick={() => setSelectedTask(task)}
                  className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-700">{task.original_request}</p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {STATUS_LABELS[task.status] ?? task.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(task.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 응답 기록 */}
      <section className="animate-rag-fade-in-up" style={{ animationDelay: "240ms" }}>
        <h2 className="mb-3 text-lg font-bold text-slate-700">응답 기록</h2>
        {responses.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
            아직 받은 응답이 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {responses.map((log, i) => (
              <li key={log.id} className="animate-rag-fade-in-up" style={{ animationDelay: `${280 + i * 40}ms` }}>
                <button
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300"
                >
                  <p className="text-sm text-slate-700">{log.raw_message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(log.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 안전 알림 상세 모달 */}
      {selectedAlert && (() => {
        const sv = SEVERITY_LABEL[selectedAlert.severity] ?? { label: selectedAlert.severity, color: "text-slate-700", bg: "bg-slate-50", ring: "ring-slate-200" };
        const relatedCall = calls.find((c) => c.id === selectedAlert.call_id);
        const callStatusLabel =
          relatedCall?.status === "answered" ? "✅ 응답"
          : relatedCall?.status === "no_answer" ? "❌ 미응답"
          : relatedCall ? relatedCall.status
          : "정보 없음";
        return (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setSelectedAlert(null)} aria-hidden="true" />
            <div className="relative z-10 flex w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl sm:mx-4 sm:my-4 max-h-[90dvh] overflow-hidden">
              {/* 헤더 */}
              <div className={`flex items-start justify-between gap-3 rounded-t-3xl ${sv.bg} px-5 py-5 shrink-0`}>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold uppercase tracking-widest ${sv.color}`}>{sv.label}</p>
                  <h2 className="mt-1 font-bold text-slate-900 leading-snug">{selectedAlert.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors shrink-0"
                  aria-label="닫기"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
              {/* 본문 */}
              <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
                {/* 기본 정보 그리드 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                    <p className="text-xs text-slate-400">대상 어르신</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{elderName}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                    <p className="text-xs text-slate-400">알림 유형</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">
                      {CATEGORY_LABELS[selectedAlert.category] ?? selectedAlert.category}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                    <p className="text-xs text-slate-400">알림 발생</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{formatDate(selectedAlert.generated_at)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                    <p className="text-xs text-slate-400">통화 결과</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{callStatusLabel}</p>
                  </div>
                  {relatedCall && (
                    <div className="col-span-2 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                      <p className="text-xs text-slate-400">관련 통화 시각</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">{formatDate(relatedCall.created_at)}</p>
                    </div>
                  )}
                </div>
                {/* 상황 설명 */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">상황 설명</p>
                  <p className="text-sm leading-relaxed text-slate-700">{selectedAlert.description}</p>
                </div>
                {/* 권장 조치 */}
                {selectedAlert.suggestion && (
                  <div className="rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">💡 권장 조치</p>
                    <p className="text-sm leading-relaxed text-blue-800">{selectedAlert.suggestion}</p>
                  </div>
                )}
              </div>
              {/* 푸터 */}
              <div className="border-t border-slate-100 px-5 py-4 shrink-0">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 모달 */}
      {selectedTask ? (
        <CareTaskDetailModal
          task={selectedTask}
          queueEntries={queueByCareTaskId[selectedTask.id] ?? []}
          messageLog={messageLogByCareTaskId[selectedTask.id] ?? null}
          onClose={() => setSelectedTask(null)}
        />
      ) : null}
      {selectedLog ? (
        <MessageLogDetailModal
          log={selectedLog}
          relatedTask={
            selectedLog.care_task_id
              ? careTasks.find((t) => t.id === selectedLog.care_task_id) ?? null
              : null
          }
          onClose={() => setSelectedLog(null)}
        />
      ) : null}
    </>
  );
}
