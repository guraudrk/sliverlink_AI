import type { Metadata } from "next";
import { ReferenceAccordion } from "@/components/app/reference-accordion";

export const metadata: Metadata = { title: "서비스 근거 — SilverLink AI" };

export default function ReferencesPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl space-y-10">
        {/* 헤더 */}
        <div className="animate-rag-fade-in-up text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Research &amp; Evidence
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">서비스 근거</h1>
          <p className="mt-3 text-base text-slate-500 leading-relaxed">
            SilverLink AI가 참고한 연구 자료와 서비스 근거입니다.
            <br />
            <span className="text-sm text-slate-400">각 항목을 클릭하면 세부 내용과 논문 링크를 볼 수 있어요.</span>
          </p>
        </div>

        {/* 아코디언 */}
        <ReferenceAccordion />

        {/* AI 며느리 홍보 카드 */}
        <div className="animate-rag-fade-in-up rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-2xl shadow">
              👩‍👧
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                SilverLink 패밀리 앱
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-violet-900">AI 며느리</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-violet-700">
                어르신과 매일 대화하는 AI 말동무예요.
                전화번호 검색, 일정 알림, 날씨 안내까지 음성 하나로 해결해 드려요.
                <br />
                <span className="text-violet-500">가족이나 어르신 스스로 설치하면 하루 생활이 훨씬 편해져요.</span>
              </p>
              <a
                href="https://play.google.com/store/apps/details?id=com.leejanghan.aimyeoneuri"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-violet-700 active:scale-95 transition-all"
              >
                <span>▶</span> Play Store에서 무료 설치
              </a>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <p className="pb-4 text-center text-xs text-slate-400 animate-rag-fade-in-up">
          모든 논문은 공개된 학술 저널·학회에서 발표된 연구입니다.
          SilverLink AI는 논문의 핵심 이론을 실무에 적용했으며, 의학적 진단이나 처방을 대체하지 않습니다.
        </p>
      </div>
    </div>
  );
}
