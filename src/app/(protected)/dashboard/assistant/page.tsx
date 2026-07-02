"use client";

import { useEffect, useState } from "react";
import { CareAssistantPanel } from "@/components/rag/care-assistant-panel";
import { PageGuideButton } from "@/components/app/page-guide-button";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

export default function DashboardAssistantPage() {
  const [parentProfiles, setParentProfiles] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/parents")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.ok) setParentProfiles(data.profiles as ParentProfile[]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
        <p className="text-slate-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mb-3 flex w-full max-w-2xl animate-rag-fade-in-up">
        <PageGuideButton title="돌봄 기록 AI 비서 안내">
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              무엇을 해주나요?
            </h3>
            <p className="leading-relaxed">지금까지 쌓인 <strong>일정 · 응답 기록 · 안부전화 결과</strong>를 AI가 검색해, 질문에 맞는 근거를 찾아 자연어로 정리해 드려요.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              질문 예시
            </h3>
            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              <p>"엄마가 최근에 약 드셨다는 응답을 한 적 있어?"</p>
              <p className="mt-1">"지난달에 도움이 필요하다고 한 적 있었나요?"</p>
              <p className="mt-1">"아버지 안부전화 응답 요약해줘"</p>
            </div>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              근거 카드
            </h3>
            <p className="leading-relaxed">AI 답변 아래 근거로 사용된 기록 카드가 표시돼요. 카드를 클릭하면 원문 내용을 자세히 확인할 수 있습니다.</p>
          </section>
        </PageGuideButton>
      </div>

      <div className="mb-8 max-w-2xl text-center animate-rag-fade-in-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">돌봄 기록 AI 비서</h1>
        <p className="mt-2 text-slate-500">쌓인 일정/응답/안부전화 기록에서 근거를 찾아 정리해 드려요.</p>
      </div>
      <div className="animate-rag-fade-in-up w-full" style={{ animationDelay: "80ms" }}>
        <CareAssistantPanel parentProfiles={parentProfiles} />
      </div>
    </div>
  );
}
