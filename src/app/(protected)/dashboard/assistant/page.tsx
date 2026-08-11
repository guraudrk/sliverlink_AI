"use client";

import { useEffect, useState } from "react";
import { CareAssistantPanel } from "@/components/rag/care-assistant-panel";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

export default function DashboardAssistantPage() {
  const [parentProfiles, setParentProfiles] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/parents")
      .then((res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        if (data.ok) setParentProfiles(data.profiles as ParentProfile[]);
      })
      .catch(() => {
        if (active) setFetchError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // 세션당 1회 RAG 재인덱싱 — call_recordings 등 새 데이터를 AI 비서가 바로 참조하도록
    const REINDEX_KEY = "sl_rag_reindex_at";
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const lastReindex = Number(sessionStorage.getItem(REINDEX_KEY) ?? 0);
    if (Date.now() - lastReindex > SIX_HOURS) {
      sessionStorage.setItem(REINDEX_KEY, String(Date.now()));
      fetch("/api/rag/reindex", { method: "POST", body: JSON.stringify({}) }).catch(() => {});
    }

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

  if (fetchError) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
        <p className="text-slate-500">프로필을 불러오지 못했습니다. 페이지를 새로고침해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">

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
