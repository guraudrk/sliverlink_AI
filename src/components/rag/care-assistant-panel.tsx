"use client";

import { useEffect, useRef, useState } from "react";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";
import type { RagAnswer, RagEvidence } from "@/lib/silverlink/rag/types";
import type { RagActionIntent } from "@/lib/silverlink/rag/action-tools";
import { EvidenceDetailModal } from "./evidence-detail-modal";
import { CATEGORY_META, IMPORTANCE_BADGE_CLASS, SOURCE_TYPE_META } from "./rag-ui-meta";

const QUICK_QUESTIONS = [
  { label: "최근 상태 요약", query: "최근 상태 요약해줘" },
  { label: "도움 요청만 보기", query: "도움 요청이 있었던 일정만 보여줘" },
  { label: "복약 관련 기록 정리", query: "복약 관련 기록 정리해줘" },
  { label: "안부전화 결과 요약", query: "안부전화 결과 요약해줘" },
] as const;

// 대화 한 턴 = 사용자 질문 하나 + (있다면) AI 답변 하나. 질문을 보낼 때마다 최근 10턴을 history로
// 같이 보내서, "그 중에 도움 필요한 거 있어?" 같은 후속 질문도 이전 대화 맥락을 참고해 답한다.
// pendingAction이 있으면 아직 실행 전(확인 대기) 상태다 — 사용자가 확인을 누르면 그 자리에서
// category/answer를 실행 결과로 덮어쓰고 pendingAction을 지운다(새 메시지를 추가하지 않는다).
type ChatMessage =
  | { role: "user"; id: string; text: string }
  | { role: "assistant"; id: string; category: string; answer: RagAnswer; pendingAction?: RagActionIntent };

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2-5.2-1.8 5.2-1.8L12 2.5z"
        fill="currentColor"
      />
      <path d="M19 16l.8 2.2 2.2.8-2.2.8L19 22l-.8-2.2-2.2-.8 2.2-.8L19 16z" fill="currentColor" />
    </svg>
  );
}

function createMessageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function CareAssistantPanel({ parentProfiles }: { parentProfiles: ParentProfile[] }) {
  const [parentId, setParentId] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<RagEvidence | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  // textarea가 입력 줄 수에 맞춰 자라도록 높이를 직접 계산한다(최대 5줄 정도, 그 이상은 스크롤).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [query]);

  async function ask(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || busy) return;

    // 새 사용자 메시지를 화면에 추가하기 "전"의 messages를 히스토리로 보낸다 — 그래야 지금 보내는
    // 질문이 히스토리에 중복으로 끼어들지 않는다(히스토리 = 이전 턴들, query = 이번 턴).
    const history = messages.slice(-10).map((message) => ({
      role: message.role,
      text: message.role === "user" ? message.text : message.answer.answerText,
    }));

    setMessages((prev) => [...prev, { role: "user", id: createMessageId(), text: trimmed }]);
    setQuery("");
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, parentId: parentId || undefined, history }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error === "parent_not_found" ? "선택한 부모님 정보를 찾을 수 없어요." : "답변 생성에 실패했어요.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          id: createMessageId(),
          category: data.category as string,
          answer: data.answer as RagAnswer,
          pendingAction: data.pendingAction as RagActionIntent | undefined,
        },
      ]);
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    ask(query);
  }

  // Shift+Enter는 줄바꿈, Enter 단독은 전송 — 메신저 앱들의 일반적인 관례를 따른다.
  function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask(query);
    }
  }

  // 확인 버튼 — 같은 메시지 자리에서 category/answer를 실행 결과로 바꿔치기한다(새 메시지 추가 X).
  async function confirmAction(messageId: string) {
    const target = messages.find((message) => message.id === messageId);
    if (!target || target.role !== "assistant" || !target.pendingAction || busy) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rag/confirm-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: parentId || undefined, intent: target.pendingAction }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("명령 실행에 실패했어요.");
        return;
      }
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId && message.role === "assistant"
            ? { ...message, category: data.category as string, answer: data.answer as RagAnswer, pendingAction: undefined }
            : message
        )
      );
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  // 취소는 서버에 아무것도 실행하지 않았으니 API 호출 없이 화면에서만 정리한다.
  function cancelAction(messageId: string) {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId && message.role === "assistant"
          ? { ...message, answer: { ...message.answer, answerText: "취소했어요. 다른 도움이 필요하면 말씀해 주세요." }, pendingAction: undefined }
          : message
      )
    );
  }

  return (
    <div
      className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white/90 shadow-lg shadow-slate-200/60 ring-1 ring-slate-200 backdrop-blur-sm"
      style={{ height: "min(720px, 75vh)" }}
    >
      <div className="shrink-0 space-y-3 border-b border-slate-100 p-4 sm:px-6 sm:py-5">
        <div className="space-y-1.5">
          <label htmlFor="parent_id" className="block text-xs font-semibold text-slate-500">
            부모님 선택
          </label>
          <select
            id="parent_id"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">전체 부모님</option>
            {parentProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={busy}
              onClick={() => ask(item.query)}
              className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-100 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
            <SparkleIcon className="h-8 w-8 text-blue-300" />
            <p className="text-sm">무엇이든 물어보거나, 위 빠른 질문을 눌러보세요.</p>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="animate-rag-fade-in-up flex justify-end">
                <p className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white shadow-sm shadow-blue-200">
                  {message.text}
                </p>
              </div>
            ) : (
              <AssistantMessage
                key={message.id}
                category={message.category}
                answer={message.answer}
                pendingAction={message.pendingAction}
                busy={busy}
                onSelectEvidence={setSelectedEvidence}
                onConfirm={() => confirmAction(message.id)}
                onCancel={() => cancelAction(message.id)}
              />
            )
          )
        )}

        {busy ? (
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 ring-1 ring-blue-100">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <SparkleIcon className="h-4 w-4 animate-pulse" />
            </span>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" />
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-slate-100 p-4 sm:px-6 sm:py-4">
        {error ? (
          <div className="animate-rag-fade-in-up mb-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="무엇이든 물어보세요 (Shift+Enter로 줄바꿈)"
            rows={1}
            className="max-h-[140px] flex-1 resize-none overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 shadow-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={busy || !query.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-300 disabled:shadow-none"
          >
            물어보기
          </button>
        </form>
      </div>

      {selectedEvidence ? <EvidenceDetailModal evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} /> : null}
    </div>
  );
}

function AssistantMessage({
  category,
  answer,
  pendingAction,
  busy,
  onSelectEvidence,
  onConfirm,
  onCancel,
}: {
  category: string;
  answer: RagAnswer;
  pendingAction?: RagActionIntent;
  busy: boolean;
  onSelectEvidence: (evidence: RagEvidence) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const categoryMeta = CATEGORY_META[category] ?? CATEGORY_META.open;

  return (
    <div className="animate-rag-fade-in-up space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm shadow-blue-200">
          <SparkleIcon className="h-4 w-4" />
        </span>
        <div className="flex-1 space-y-3 rounded-2xl rounded-tl-sm bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 ring-1 ring-slate-200 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">돌봄 기록 AI 비서</p>
            {categoryMeta ? (
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${categoryMeta.className}`}>{categoryMeta.label}</span>
            ) : null}
          </div>

          <p className="whitespace-pre-line text-base leading-relaxed text-slate-800">{answer.answerText}</p>

          {pendingAction ? (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-300"
              >
                확인
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onCancel}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                취소
              </button>
            </div>
          ) : null}

          {answer.nextSteps.length > 0 ? (
            <div className="space-y-1.5 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
              <p className="text-xs font-bold text-amber-700">⚡ 지금 확인할 일</p>
              <ul className="space-y-1">
                {answer.nextSteps.map((step) => (
                  <li key={step} className="flex items-center gap-2 text-sm text-amber-800">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-xs text-slate-400">이 답변은 의료 진단이 아니에요. 정확한 상태는 직접 연락해 확인해 주세요.</p>
        </div>
      </div>

      {answer.evidence.length > 0 ? (
        <div className="space-y-2 pl-12">
          <button
            type="button"
            onClick={() => setEvidenceOpen((open) => !open)}
            className="text-xs font-semibold uppercase tracking-wide text-slate-400 underline underline-offset-2 transition-colors hover:text-blue-500"
          >
            근거 {answer.evidence.length}건 {evidenceOpen ? "숨기기" : "보기"}
          </button>
          {evidenceOpen ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {answer.evidence.map((item, index) => {
              const meta = SOURCE_TYPE_META[item.sourceType] ?? { label: item.sourceType, dot: "bg-slate-400" };
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectEvidence(item)}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="animate-rag-pop-in rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-blue-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${IMPORTANCE_BADGE_CLASS[item.importance]}`}>
                      {item.importance}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-slate-700">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.summary}</p>
                  <p className="mt-1 text-[11px] font-medium text-blue-400">자세히 보기 →</p>
                </button>
              );
            })}
          </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
