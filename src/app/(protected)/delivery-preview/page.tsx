"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DeliveryPreviewForm } from "@/components/delivery/delivery-preview-form";
import { PageGuideButton } from "@/components/app/page-guide-button";
import type { CareTaskSummary } from "@/lib/supabase/care-tasks-repo";

export default function DeliveryPreviewPage() {
  const [careTasks, setCareTasks] = useState<CareTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/care-tasks")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.ok) {
          setCareTasks(data.careTasks as CareTaskSummary[]);
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

  if (careTasks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
        <div className="max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 animate-rag-pop-in">
          <p className="text-lg font-semibold text-slate-700">먼저 일정을 만들어 주세요.</p>
          <p className="text-sm text-slate-500">등록된 일정이 있어야 발송 미리보기를 만들 수 있어요.</p>
          <Link
            href="/dashboard/create-task"
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            일정 만들러 가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mb-3 flex w-full max-w-xl animate-rag-fade-in-up">
        <PageGuideButton title="발송 미리보기 안내">
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              발송 미리보기란?
            </h3>
            <p className="leading-relaxed">실제 SMS·전화를 보내지 않고 <strong>알림 큐와 발송 기록을 Mock으로 생성</strong>하는 테스트 도구예요. 외부로 아무것도 전송되지 않습니다.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              결과 확인
            </h3>
            <p className="leading-relaxed">Mock 발송 후 <strong>발송 기록</strong> 페이지에서 이력을 확인할 수 있어요. AI가 만든 메시지 초안도 함께 볼 수 있습니다.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              실제 발송 테스트
            </h3>
            <p className="leading-relaxed">실제 SMS·전화를 테스트하려면 <strong>오늘의 일정 → 미발송 알림</strong> 에서 채널을 선택해 발송하거나, Vercel 환경변수를 설정하세요.</p>
          </section>
        </PageGuideButton>
      </div>

      <div className="mb-8 max-w-xl text-center animate-rag-fade-in-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">발송 미리보기</h1>
        <p className="mt-2 text-slate-500">실제 발송 없이 Mock으로 알림 큐와 발송 시도를 만들어 봐요.</p>
      </div>
      <div className="animate-rag-fade-in-up w-full max-w-xl" style={{ animationDelay: "80ms" }}>
        <DeliveryPreviewForm careTasks={careTasks} />
      </div>
    </div>
  );
}
