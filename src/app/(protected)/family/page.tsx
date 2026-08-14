"use client";

/**
 * B-6 자녀 대시보드 — 안심 현황 + 목소리 메시지
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

export default function FamilyDashboardPage() {
  const supabase = createSupabaseBrowserClient();
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listParentProfiles(supabase)
      .then(setParents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F5F7FB] px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-[#101828]">가족 안심 현황</h1>
        <p className="mt-1 text-sm text-[#667085]">
          AI 며느리가 어르신 곁에서 지키고 있어요.
        </p>

        {loading && (
          <div className="mt-8 text-center text-sm text-[#98A2B3]">불러오는 중...</div>
        )}

        {!loading && parents.length === 0 && (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7EBF3]">
            <p className="text-[#475467]">연결된 어르신이 없어요.</p>
            <p className="mt-1 text-sm text-[#98A2B3]">
              AI 며느리 앱에서 &apos;가족 연결&apos;을 눌러 6자리 코드를 만들고,
              아래 버튼을 눌러 연결하세요.
            </p>
            <Link
              href="/join"
              className="mt-4 inline-block rounded-xl bg-[#2E5BFF] px-6 py-3 text-sm font-semibold text-white"
            >
              + 어르신 연결하기
            </Link>
          </div>
        )}

        {parents.map((parent) => (
          <div
            key={parent.id}
            className="mt-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E7EBF3]"
          >
            {/* 어르신 정보 */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#101828]">{parent.display_name}</h2>
                {parent.relationship && (
                  <span className="mt-0.5 inline-block rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-semibold text-[#2E5BFF]">
                    {parent.relationship}
                  </span>
                )}
              </div>
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-sm">
                🛡️
              </span>
            </div>

            {/* 안심 현황 — 실제 데이터는 B-5 native 수신 연결(B-5b) 이후 채워진다 */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F5F7FB] px-4 py-3">
                <p className="text-xs text-[#667085]">이번 주 차단</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#101828]">—</p>
                <p className="text-xs text-[#98A2B3]">의심 문자</p>
              </div>
              <div className="rounded-xl bg-[#F5F7FB] px-4 py-3">
                <p className="text-xs text-[#667085]">모르는 번호</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#101828]">—</p>
                <p className="text-xs text-[#98A2B3]">이번 주 확인</p>
              </div>
            </div>

            {/* 목소리 메시지 버튼 */}
            <Link
              href={`/family/voice-message?parentId=${parent.id}&name=${encodeURIComponent(parent.display_name)}`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2E5BFF] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#234AE0]"
            >
              🎙 목소리 메시지 보내기
            </Link>
          </div>
        ))}

        {/* 형제 초대 (B-6 spec) */}
        {parents.length > 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-[#E7EBF3] p-6 text-center">
            <p className="text-sm font-medium text-[#344054]">형제·가족도 알림을 받게 하세요</p>
            <p className="mt-1 text-xs text-[#98A2B3]">최대 3명까지 초대 가능 (안심+ 전용)</p>
            <button
              disabled
              className="mt-3 rounded-xl border border-[#E7EBF3] px-5 py-2 text-sm font-semibold text-[#98A2B3]"
            >
              형제 초대하기 (준비 중)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
