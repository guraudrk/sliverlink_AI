"use client";

import { useEffect } from "react";

export function ParentGuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="기능 가이드"
      className="animate-rag-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-rag-pop-in w-full max-w-lg rounded-t-3xl bg-white px-6 pb-8 pt-6 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">📖 AI 알림 기능 가이드</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 text-sm text-slate-600">
          <section>
            <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              AI가 자동으로 SMS 메시지를 만들어요
            </h3>
            <p className="mb-2 leading-relaxed">
              부모님 프로필에 입력한 정보(돌봄 내용, 복약 정보, 일상 루틴 등)를 AI가 읽고,
              상황에 딱 맞는 SMS 메시지를 자동으로 작성해줍니다.
            </p>
            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              <p className="font-semibold">예시</p>
              <p className="mt-1">프로필에 "혈압약 매일 오전 9시"를 입력 →<br />
              AI가 "어머니, 오전 약 드실 시간이에요. 혈압약 잊지 마세요 💊" 메시지 자동 구성</p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              AI가 전화 스크립트도 자동으로 만들어요
            </h3>
            <p className="mb-2 leading-relaxed">
              전화를 걸면 AI가 부모님 프로필을 바탕으로 통화 스크립트를 자동 생성합니다.
              어르신은 전화를 받은 뒤 키패드를 눌러 간단하게 응답할 수 있어요.
            </p>
            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              <p className="font-semibold">전화 응답 방식</p>
              <p className="mt-1">1번: 완료했어요 &nbsp;·&nbsp; 2번: 도움이 필요해요<br />
              응답 결과는 대시보드에 자동으로 기록됩니다</p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">💡</span>
              AI 챗봇에서 바로 실행하기
            </h3>
            <p className="leading-relaxed">
              대시보드의 AI 비서 채팅창에서 자연어로 명령하면 SMS·전화를 바로 실행할 수 있어요.
            </p>
            <div className="mt-2 rounded-xl bg-green-50 p-3 text-xs text-green-800">
              <p className="font-semibold">예시 명령</p>
              <p className="mt-1">"어머니께 약 드셨는지 문자 보내줘"<br />
              "아버지 안부 전화 걸어줘"</p>
            </div>
          </section>

          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            ✏️ 부모님 정보를 더 자세하게 입력할수록 AI 메시지·스크립트 품질이 높아집니다.
            프로필 하단의 돌봄 내용, 복약 정보, 소통 방식 항목을 채워보세요.
          </p>
        </div>
      </div>
    </div>
  );
}
