import type { Metadata } from "next";
import { ReferenceAccordion } from "@/components/app/reference-accordion";

export const metadata: Metadata = { title: "학술 참조 — SilverLink AI" };

export default function ReferencesPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl space-y-10">
        {/* 헤더 */}
        <div className="animate-rag-fade-in-up text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Research &amp; Evidence
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">학술 참조</h1>
          <p className="mt-3 text-base text-slate-500 leading-relaxed">
            SilverLink AI의 각 기능이 어떤 연구를 근거로 만들어졌는지 쉽게 정리했어요.
            <br />
            <span className="text-sm text-slate-400">각 항목을 클릭하면 세부 내용과 논문 링크를 볼 수 있어요.</span>
          </p>
        </div>

        {/* 아코디언 */}
        <ReferenceAccordion />

        {/* 푸터 */}
        <p className="pb-4 text-center text-xs text-slate-400 animate-rag-fade-in-up">
          모든 논문은 공개된 학술 저널·학회에서 발표된 연구입니다.
          SilverLink AI는 논문의 핵심 이론을 실무에 적용했으며, 의학적 진단이나 처방을 대체하지 않습니다.
        </p>
      </div>
    </div>
  );
}
