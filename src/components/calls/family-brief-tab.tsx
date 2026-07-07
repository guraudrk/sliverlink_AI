"use client";

import type { CallFamilyBrief } from "@/lib/supabase/call-family-briefs-repo";

export function FamilyBriefTab({ brief }: { brief: CallFamilyBrief }) {
  return (
    <div className="space-y-4">
      {/* 오늘 어르신의 마음 */}
      {brief.mind_points.length > 0 ? (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            💭 오늘 어르신의 마음
          </p>
          <ul className="space-y-1.5">
            {brief.mind_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 shrink-0 text-base leading-none">{point.emoji}</span>
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 대화 제안 */}
      {brief.conversation_starters.length > 0 ? (
        <section className="rounded-xl bg-blue-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
            💬 이번 주 대화 제안
          </p>
          <ul className="space-y-2">
            {brief.conversation_starters.map((starter, i) => (
              <li key={i} className="text-sm">
                <span className="text-slate-400 mr-1">→</span>
                <span className="font-medium text-slate-700">&ldquo;{starter.suggestion}&rdquo;</span>
                {starter.topic ? (
                  <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                    {starter.topic}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 주목 사항 */}
      {brief.attention_item ? (
        <section className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3">
          <span className="mt-0.5 shrink-0 text-base">📌</span>
          <div>
            <p className="text-xs font-semibold text-amber-700">주목 사항</p>
            <p className="text-sm text-amber-800">{brief.attention_item}</p>
          </div>
        </section>
      ) : null}

      <p className="text-right text-xs text-slate-400">
        {new Date(brief.generated_at).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })} 생성
      </p>
    </div>
  );
}

export function FamilyBriefLoading() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function FamilyBriefEmpty() {
  return (
    <p className="text-center text-sm text-slate-400 py-4">
      이 통화에 대한 브리핑이 아직 없어요.
    </p>
  );
}
