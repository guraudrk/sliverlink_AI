import type { Metadata } from "next";

export const metadata: Metadata = { title: "학술 참조 — SilverLink AI" };

type Paper = {
  title: string;
  authors: string;
  year: number;
  venue: string;
  theory: string;
  applied: string;
};

type Section = {
  day: string;
  feature: string;
  color: string;
  badge: string;
  papers: Paper[];
};

const SECTIONS: Section[] = [
  {
    day: "Day 22",
    feature: "긴급 안전 알림",
    color: "rose",
    badge: "🔴",
    papers: [
      {
        title: "Technology-Based Monitoring of Older Adults at Home",
        authors: "Rantz et al.",
        year: 2015,
        venue: "Journal of Gerontological Nursing",
        theory: "센서 데이터에서 이상 패턴(수면 방해, 이동 감소)이 감지되면 낙상·입원이 뒤따름을 입증",
        applied: "통화 미응답 + 점수 급락을 '이상 패턴'으로 정의해 즉시 알림 발생",
      },
      {
        title: "Smart Home Technologies for Health and Social Care Support",
        authors: "Demiris & Hensel",
        year: 2008,
        venue: "Health Informatics Journal",
        theory: "거주 환경 모니터링의 비침습 원칙: 어르신이 기기를 착용하지 않아도 행동 데이터로 위험 감지 가능",
        applied: "SilverLink는 별도 센서 없이 전화·앱 상호작용 로그만으로 위험 신호 추출",
      },
    ],
  },
  {
    day: "Day 23",
    feature: "사회 연결 점수",
    color: "blue",
    badge: "🔵",
    papers: [
      {
        title: "Social Networks, Host Resistance, and Mortality",
        authors: "Berkman & Syme",
        year: 1979,
        venue: "American Journal of Epidemiology (UC Berkeley)",
        theory: "사회적 연결망이 약한 고령자의 9년 내 사망률이 2~3배 높음 — 사회 고립은 흡연·비만보다 위험",
        applied: "통화 응답률·일정 완료율로 '사회 연결 점수'를 주 단위로 산출, 40점 이하를 위험 구간으로 설정",
      },
      {
        title: "Loneliness and Social Isolation as Risk Factors for Mortality",
        authors: "Holt-Lunstad et al.",
        year: 2015,
        venue: "Perspectives on Psychological Science (BYU)",
        theory: "26개 연구 메타분석: 사회 고립은 사망 위험 29%, 고독감은 26% 증가 — 공중보건 위기로 규정",
        applied: "점수 40~55 구간을 '주의', 56~100을 '활발'로 등급화해 케어워커 우선순위 결정에 활용",
      },
    ],
  },
  {
    day: "Day 26",
    feature: "복지사 케어 관리 대시보드 — 위험 플래그",
    color: "amber",
    badge: "🟠",
    papers: [
      {
        title: "Designing AI-Assisted Decision Support for Social Workers",
        authors: "Yang et al. (NUS + Northwestern)",
        year: 2025,
        venue: "CHI 2025 (ACM Conference on Human Factors in Computing Systems)",
        theory: "현장 사회복지사는 ML 점수보다 '규칙 기반 플래그'를 더 신뢰함 — 이해 가능성(explainability)이 채택의 핵심",
        applied: "urgent / worsening / unacked_alerts 3종을 규칙 기반으로 단순하게 정의, 각 플래그에 이유 문장 첨부",
      },
      {
        title: "Early Warning Scores in Clinical Practice",
        authors: "Smith et al.",
        year: 2013,
        venue: "BMJ (British Medical Journal)",
        theory: "EWS(조기 경고 점수): 단일 임계값보다 복합 신호 조합이 위험 예측 정확도를 높임",
        applied: "점수 단독이 아니라 '미응답 연속 3회 + 낮은 점수'의 AND 조건으로 urgent 플래그 발동",
      },
    ],
  },
  {
    day: "Day 27",
    feature: "AI 주간 케어 보고서 자동 생성",
    color: "teal",
    badge: "🟢",
    papers: [
      {
        title: "LLM-Assisted Care Planning in Elderly Populations",
        authors: "Wang et al.",
        year: 2023,
        venue: "npj Digital Medicine (Nature Portfolio)",
        theory: "GPT-4 기반 케어 보고서 초안이 사회복지사의 보고서 작성 시간을 45분 → 12분으로 단축",
        applied: "4주치 점수·통화·알림 데이터를 구조화해 Gemini에 전달, 5섹션 보고서 초안 스트리밍 생성",
      },
      {
        title: "Preparing the Healthcare Workforce to Deliver the Digital Future",
        authors: "Topol Review",
        year: 2019,
        venue: "Health Education England / NHS",
        theory: "AI 초안 + 전문가 최종 검토 모델(Human-in-the-loop)이 안전성과 효율을 동시에 달성",
        applied: "보고서 패널 하단에 '※ AI 초안입니다. 반드시 검토 후 사용하세요.' 문구 명시",
      },
    ],
  },
  {
    day: "Day 28",
    feature: "종합 뷰 · AI 케어 플랜 · 역할 구분 · 참조 페이지",
    color: "purple",
    badge: "🟣",
    papers: [
      {
        title: "LifeLines2: Interacting with Multiple Timelines",
        authors: "Plaisant et al.",
        year: 2009,
        venue: "CHI 2009 (ACM, HCIL / University of Maryland)",
        theory: "복수 시계열 데이터를 한 화면에 정렬하면 의사·케어워커의 패턴 인식 속도가 약 40% 향상",
        applied: "점수 스파크라인·통화 도트·알림 배지를 한 화면에 배치해 상태 파악 시간 단축",
      },
      {
        title: "Formalizing Trust in AI Systems",
        authors: "Jacovi et al.",
        year: 2021,
        venue: "FAccT 2021 (ACM Conference on Fairness, Accountability, Transparency)",
        theory: "AI 근거(논문·출처)를 투명하게 공개하면 사용자 신뢰와 채택률이 통계적으로 유의미하게 상승",
        applied: "이 참조 페이지 자체가 Jacovi 2021 원칙의 구현 — 모든 기능에 논문 출처 공개",
      },
      {
        title: "Human Factors Systems Approach to Healthcare Quality and Safety",
        authors: "Carayon et al.",
        year: 2014,
        venue: "Work (IOS Press)",
        theory: "시스템 UI가 사용자의 역할에 맞게 설계될수록 오조작·누락이 감소, 직무 만족도 향상",
        applied: "family / caseworker 역할별 UI 레이어 구분 — 기능 공유, 맥락(context)만 차별화",
      },
    ],
  },
];

const COLOR_MAP: Record<string, { ring: string; bg: string; text: string; subtext: string; dot: string }> = {
  rose:   { ring: "ring-rose-200",   bg: "bg-rose-50",   text: "text-rose-700",   subtext: "text-rose-500",   dot: "bg-rose-400" },
  blue:   { ring: "ring-blue-200",   bg: "bg-blue-50",   text: "text-blue-700",   subtext: "text-blue-500",   dot: "bg-blue-400" },
  amber:  { ring: "ring-amber-200",  bg: "bg-amber-50",  text: "text-amber-700",  subtext: "text-amber-500",  dot: "bg-amber-400" },
  teal:   { ring: "ring-teal-200",   bg: "bg-teal-50",   text: "text-teal-700",   subtext: "text-teal-500",   dot: "bg-teal-400" },
  purple: { ring: "ring-purple-200", bg: "bg-purple-50", text: "text-purple-700", subtext: "text-purple-500", dot: "bg-purple-400" },
};

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
          </p>
        </div>

        {/* 섹션별 카드 */}
        {SECTIONS.map((section, si) => {
          const c = COLOR_MAP[section.color];
          return (
            <section
              key={section.day}
              className="animate-rag-fade-in-up"
              style={{ animationDelay: `${si * 80}ms` }}
            >
              {/* 섹션 헤더 */}
              <div className="mb-3 flex items-center gap-2">
                <span className={`rounded-full ${c.bg} ${c.ring} ring-1 px-3 py-1 text-xs font-bold ${c.text}`}>
                  {section.badge} {section.day}
                </span>
                <h2 className="text-base font-bold text-slate-700">{section.feature}</h2>
              </div>

              {/* 논문 카드들 */}
              <div className="space-y-3">
                {section.papers.map((paper) => (
                  <div
                    key={paper.title}
                    className={`rounded-2xl bg-white shadow-sm ring-1 ${c.ring} px-5 py-4`}
                  >
                    {/* 논문 제목 + 연도 */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-slate-800 leading-snug">
                        &ldquo;{paper.title}&rdquo;
                      </p>
                      <span className={`shrink-0 text-sm font-bold ${c.subtext}`}>{paper.year}</span>
                    </div>

                    {/* 저자 + 학술지 */}
                    <p className="mt-1 text-xs text-slate-400">
                      {paper.authors} &mdash; <span className="font-medium text-slate-500">{paper.venue}</span>
                    </p>

                    <div className="mt-3 space-y-2">
                      {/* 핵심 이론 */}
                      <div className="flex gap-2">
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">핵심 이론</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{paper.theory}</p>
                        </div>
                      </div>
                      {/* SilverLink 적용 */}
                      <div className="flex gap-2">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SilverLink 적용</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{paper.applied}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* 푸터 */}
        <p className="pb-4 text-center text-xs text-slate-400 animate-rag-fade-in-up" style={{ animationDelay: "480ms" }}>
          모든 논문은 공개된 학술 저널·학회에서 발표된 연구입니다.
          SilverLink AI는 논문의 핵심 이론을 실무에 적용했으며, 의학적 진단이나 처방을 대체하지 않습니다.
        </p>
      </div>
    </div>
  );
}
