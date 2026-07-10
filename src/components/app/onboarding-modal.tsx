"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "silverlink_onboarding_v1";

const STEPS = [
  {
    icon: "🌿",
    title: "SilverLink에 오신 것을 환영합니다",
    desc: "부모님과의 통화를 녹음하면 AI가 건강 신호를 자동으로 분석해 드려요. 위험 신호 감지 시 안전 알림으로 알려드립니다.",
    detail: [
      "📞 통화 녹음 → AI 자동 분석",
      "🔔 위험 신호 감지 시 즉시 알림",
      "📊 케어 타임라인 · 사회 연결 점수 추적",
    ],
  },
  {
    icon: "📱",
    title: "모바일 앱으로 녹음하세요",
    desc: "통화 녹음은 SilverLink 모바일 앱에서 합니다. 앱을 설치하고 동일한 계정으로 로그인하면 바로 시작할 수 있어요.",
    detail: [
      "① Expo Go 앱을 Play Store에서 설치",
      "② 개발자에게 QR 링크 요청 후 스캔",
      "③ 지금 이 계정으로 로그인",
    ],
    note: "* 정식 앱 출시 전까지는 Expo Go를 통해 사용합니다.",
  },
  {
    icon: "👴",
    title: "어르신을 등록하세요",
    desc: "전화번호부에서 부모님을 선택해 등록하면 준비 완료! 앱에서 등록하거나 아래 버튼을 눌러 웹에서 바로 등록할 수 있어요.",
    detail: [
      "전화번호부 연동으로 쉽게 등록",
      "등록 후 첫 녹음을 업로드하면 AI 분석 시작",
    ],
  },
] as const;

export function OnboardingModal({ parentCount }: { parentCount: number }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (parentCount === 0 && typeof window !== "undefined") {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setOpen(true);
    }
  }, [parentCount]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  function next() {
    if (isLast) {
      dismiss();
      router.push("/parents");
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40 backdrop-blur-sm animate-rag-fade-in-up">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
        {/* 상단 진행 바 */}
        <div className="flex gap-1.5 p-4 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={[
                "h-1 flex-1 rounded-full transition-all duration-300",
                i <= step ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700",
              ].join(" ")}
            />
          ))}
        </div>

        {/* 콘텐츠 */}
        <div className="p-6 pt-5">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-3xl">
            {current.icon}
          </div>

          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">
            {current.title}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {current.desc}
          </p>

          <ul className="mt-4 space-y-2">
            {current.detail.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 mt-2" />
                {line}
              </li>
            ))}
          </ul>

          {"note" in current && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              {(current as { note: string }).note}
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={dismiss}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            나중에
          </button>
          <button
            onClick={next}
            className="flex-[2] rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            {isLast ? "어르신 등록하러 가기" : "다음"}
          </button>
        </div>

        {/* 단계 표시 */}
        <p className="pb-4 text-center text-xs text-slate-300 dark:text-slate-600">
          {step + 1} / {STEPS.length}
        </p>
      </div>
    </div>
  );
}
