"use client";

import { useEffect, useState } from "react";
import { CareAssistantPanel } from "@/components/rag/care-assistant-panel";
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
      <div className="mb-8 max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">돌봄 기록 AI 비서</h1>
        <p className="mt-2 text-slate-500">쌓인 일정/응답/안부전화 기록에서 근거를 찾아 정리해 드려요.</p>
      </div>
      <CareAssistantPanel parentProfiles={parentProfiles} />
    </div>
  );
}
