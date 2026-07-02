"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DeliveryPreviewForm } from "@/components/delivery/delivery-preview-form";
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
