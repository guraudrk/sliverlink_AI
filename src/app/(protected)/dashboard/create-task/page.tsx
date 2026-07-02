"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TaskRequestForm } from "@/components/task-request-form";
import { PageGuideButton } from "@/components/app/page-guide-button";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

export default function CreateTaskPage() {
  const [profiles, setProfiles] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/parents")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.ok) {
          setProfiles(data.profiles as ParentProfile[]);
        }
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

  if (profiles.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
        <div className="max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 animate-rag-pop-in">
          <p className="text-lg font-semibold text-slate-700">먼저 부모님/어르신을 등록해 주세요.</p>
          <p className="text-sm text-slate-500">등록된 분이 있어야 일정을 만들 수 있어요.</p>
          <Link
            href="/parents"
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            부모님 등록하러 가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mb-3 flex w-full max-w-xl animate-rag-fade-in-up">
        <PageGuideButton title="새 일정 만들기 안내">
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              어떻게 작성하나요?
            </h3>
            <p className="leading-relaxed">부모님을 선택하고, 어르신께 전할 내용을 <strong>자유롭게</strong> 적으면 돼요. 형식 없이 편하게 써도 됩니다.</p>
            <div className="mt-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              <p className="font-semibold">예시</p>
              <p className="mt-1">"엄마 오늘 혈압약 드셨는지 확인해줘"</p>
              <p>"아버지 오후 3시 병원 예약 상기시켜줘"</p>
            </div>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              AI가 해주는 것
            </h3>
            <ul className="space-y-1 leading-relaxed">
              <li>✦ 일정 유형 자동 분류 (복약/병원/안부 등)</li>
              <li>✦ SMS 메시지 초안 자동 생성</li>
              <li>✦ AI 전화 스크립트 초안 자동 생성</li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              생성 후에는?
            </h3>
            <p className="leading-relaxed">일정이 만들어지면 <strong>오늘의 일정</strong> 페이지에서 확인할 수 있어요. "미발송 알림만 보기" 필터로 골라 바로 발송하면 됩니다.</p>
          </section>
        </PageGuideButton>
      </div>

      <div className="mb-8 max-w-xl text-center animate-rag-fade-in-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">어르신께 마음을 전해보세요</h1>
        <p className="mt-2 text-slate-500">등록하신 부모님께 전할 말씀을 남겨주세요.</p>
      </div>
      <div className="animate-rag-fade-in-up w-full max-w-xl" style={{ animationDelay: "80ms" }}>
        <TaskRequestForm parentProfiles={profiles} />
      </div>
    </div>
  );
}

