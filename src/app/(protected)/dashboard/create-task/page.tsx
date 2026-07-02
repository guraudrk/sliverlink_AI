"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TaskRequestForm } from "@/components/task-request-form";
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

