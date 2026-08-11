"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemoSetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSeed() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/demo/seed-org", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setStatus("done");
      setTimeout(() => router.push("/dashboard/caseworker"), 1200);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "알 수 없는 오류");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-3xl shadow-md">
            🎬
          </div>
          <h1 className="text-2xl font-bold text-slate-900">영업 데모 모드</h1>
          <p className="mt-2 text-sm text-slate-500">
            어르신 30명의 가상 데이터를 생성합니다.<br />
            기존 데모 데이터가 있으면 초기화됩니다.
          </p>
        </div>

        {/* 시나리오 설명 */}
        <div className="mb-6 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">생성 데이터 구성</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-rose-500">🔴</span>
              <span><strong>즉시확인 5명</strong> — 연결 점수 20~35점 + 3일 연속 미응답. 낙상·위기·흉통 알림 포함.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">🟠</span>
              <span><strong>추세 악화 8명</strong> — 전주 60점대 → 이번주 43~52점으로 하락.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">●</span>
              <span><strong>정상 7명</strong> — 70~90점, 꾸준히 응답.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-slate-400">●</span>
              <span><strong>보통 10명</strong> — 56~69점, 혼합 응답.</span>
            </li>
          </ul>
        </div>

        {/* 시연 경로 안내 */}
        <div className="mb-6 rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-200">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">3분 시연 경로</p>
          <ol className="space-y-1 text-sm text-slate-600">
            <li>① KPI 헤더에서 즉시확인 수 확인</li>
            <li>② 🔴 어르신 카드 → 플래그 사유 확인</li>
            <li>③ 카드 오른쪽 보고서 버튼 → AI 리포트 생성</li>
            <li>④ 기록 복사 버튼 → 클립보드</li>
          </ol>
        </div>

        {/* 실행 버튼 */}
        {status === "done" ? (
          <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-center ring-1 ring-emerald-200">
            <p className="font-semibold text-emerald-700">✅ 데모 데이터 생성 완료!</p>
            <p className="mt-1 text-sm text-emerald-600">대시보드로 이동합니다…</p>
          </div>
        ) : (
          <button
            onClick={handleSeed}
            disabled={status === "loading"}
            className="w-full rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-60"
          >
            {status === "loading" ? "생성 중… (약 5초)" : "어르신 30명 데모 데이터 생성"}
          </button>
        )}

        {status === "error" && (
          <p className="mt-3 text-center text-sm text-rose-600">{errorMsg}</p>
        )}

        <p className="mt-4 text-center text-xs text-slate-400">
          실제 어르신 데이터와 완전히 격리된 데모 전용 기관에 저장됩니다.
        </p>
      </div>
    </div>
  );
}
