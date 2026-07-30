"use client";

import { useState } from "react";
import Link from "next/link";
import { PhoneCall, Sparkles, CheckCircle2, Bell, Activity, ClipboardList, BarChart3, FileText } from "lucide-react";

type Audience = "individual" | "org";

// ─── 개인·가족 콘텐츠 ─────────────────────────────────────────────────────────

const IND_VALUE_PROPS = [
  {
    Icon: PhoneCall,
    title: "이미 하고 있는 전화가 돌봄이 됩니다",
    desc: "별도 장비 없이, 평소 부모님께 전화하는 그 순간에 앱으로 녹음만 하면 됩니다.",
  },
  {
    Icon: Activity,
    title: "AI가 7가지 건강 신호를 분석합니다",
    desc: "외로움, 인지 저하, 낙상 위험, 수면 문제 등 전문가가 주목하는 신호를 자동으로 감지해요.",
  },
  {
    Icon: Bell,
    title: "이상 신호는 즉시 알림으로 도착합니다",
    desc: "위험 수준 신호가 감지되면 안전 알림이 바로 올라옵니다. 멀리 살아도 놓치지 않아요.",
  },
] as const;

const IND_COMPARISON = [
  { feature: "어르신 건강 특화 분석" },
  { feature: "7가지 건강 신호 감지" },
  { feature: "위험 신호 안전 알림" },
  { feature: "가족 케어 대시보드" },
  { feature: "통화 이력 타임라인" },
  { feature: "AI 케어 비서" },
];

const IND_CHECKS = ["설치 후 5분 내 첫 분석 완료", "월 요금제 없이 무료로 시작", "모든 데이터 안전 암호화"];

// ─── 기관·센터 콘텐츠 ─────────────────────────────────────────────────────────

const ORG_VALUE_PROPS = [
  {
    Icon: ClipboardList,
    title: "기록 입력 시간을 0으로 만듭니다",
    desc: "생활지원사가 어르신 30명과 통화하면 AI가 보고서를 자동 생성합니다. 정부 시스템에 붙여넣기만 하면 돼요.",
  },
  {
    Icon: BarChart3,
    title: "담당 어르신 30명을 한 화면에서",
    desc: "위험 신호가 있는 어르신이 자동으로 상단에 올라옵니다. 스크롤 없이 우선순위를 파악할 수 있어요.",
  },
  {
    Icon: FileText,
    title: "매주 월요일 자동 보고서 발송",
    desc: "수신 이메일만 등록하면 매주 기관 전체 어르신 보고서가 자동으로 도착합니다.",
  },
] as const;

const ORG_COMPARISON = [
  { feature: "사람이 건 진짜 통화 분석" },
  { feature: "AI 로보콜 없음" },
  { feature: "기관 통합 대시보드" },
  { feature: "보고서 자동 생성·발송" },
  { feature: "붙여넣기 가능한 형식" },
  { feature: "담당자별 필터" },
];

const ORG_CHECKS = [
  "어르신은 아무것도 하지 않습니다",
  "평소 통화 그대로, 분석만 추가됩니다",
  "기관당 월 15만원 정액",
];

// ─── 개인 Mock UI ─────────────────────────────────────────────────────────────

function IndividualMockUI() {
  return (
    <div className="relative mt-8 md:mt-0">
      <div style={{ backgroundColor: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(16,24,40,0.12)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#12183F,#1B2660)", padding: "20px 24px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#A7B4E8", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>이번 주 케어 리포트</p>
          <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0 }}>김수진 어머니</p>
              <p style={{ fontSize: 13, color: "#A7B4E8", margin: "2px 0 0" }}>최근 통화 7월 14일</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: 0 }}>78</p>
              <p style={{ fontSize: 11, color: "#8FA6FF", margin: 0 }}>건강 점수</p>
            </div>
          </div>
          <svg width="100%" height="52" viewBox="0 0 300 52" style={{ marginTop: 14, display: "block" }} aria-hidden="true">
            <defs>
              <linearGradient id="indChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B8CFF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#5B8CFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points="0,44 50,38 100,42 150,28 200,24 250,30 300,20 300,52 0,52" fill="url(#indChartFill)" />
            <polyline points="0,44 50,38 100,42 150,28 200,24 250,30 300,20" fill="none" stroke="#5B8CFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div className="mb-3 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: "#FEF3F2", border: "1px solid #FECDCA" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#F04438", flexShrink: 0 }} />
            <p style={{ fontSize: 12, fontWeight: 600, color: "#B42318", margin: 0 }}>인지기능 저하 신호 감지됨</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["통화", "12회"], ["분석", "8건"], ["주의신호", "2건"]].map(([label, val]) => (
              <div key={label} className="rounded-lg py-2.5 text-center" style={{ backgroundColor: "#F9FAFD" }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#101828", margin: 0 }}>{val}</p>
                <p style={{ fontSize: 11, color: "#98A2B3", margin: "2px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute" style={{ bottom: -12, left: -16, backgroundColor: "#fff", borderRadius: 14, boxShadow: "0 8px 24px rgba(16,24,40,0.14)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div className="relative flex h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: "#FECDCA" }} />
          <span className="relative inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: "#F04438" }} />
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#101828", margin: 0 }}>녹음 중</p>
          <p style={{ fontSize: 11, color: "#98A2B3", margin: 0 }}>05:12</p>
        </div>
      </div>
    </div>
  );
}

// ─── 기관 Mock UI ─────────────────────────────────────────────────────────────

const FLAG_COLORS = {
  urgent: { bg: "#FEF3F2", border: "#FECDCA", dot: "#F04438", text: "#B42318" },
  warning: { bg: "#FFFAEB", border: "#FEF0C7", dot: "#F79009", text: "#B54708" },
  normal:  { bg: "#ECFDF3", border: "#A9EFC5", dot: "#12B76A", text: "#027A48" },
} as const;

const ORG_ELDERS = [
  { name: "김말순", age: 89, flag: "urgent" as const, flagText: "인지기능 저하 신호" },
  { name: "이복순", age: 76, flag: "warning" as const, flagText: "응답률 33%" },
  { name: "박영희", age: 82, flag: "normal" as const,  flagText: "이번주 통화 완료" },
];

function OrgMockUI() {
  return (
    <div className="relative mt-8 md:mt-0">
      <div style={{ backgroundColor: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(16,24,40,0.12)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#12183F,#1B2660)", padding: "16px 20px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#A7B4E8", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>기관 통합 대시보드</p>
          <div className="grid grid-cols-3 gap-3" style={{ marginTop: 12 }}>
            {[["담당 어르신", "30명"], ["즉시확인", "2명"], ["이번주 미통화", "5명"]].map(([label, val]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>{val}</p>
                <p style={{ fontSize: 10, color: "#A7B4E8", margin: "3px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {ORG_ELDERS.map((e) => {
            const c = FLAG_COLORS[e.flag];
            return (
              <div key={e.name} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ border: "1px solid #F0F3F9", backgroundColor: "#FAFBFF" }}>
                <div className="flex items-center gap-2.5">
                  <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#4F46E5", flexShrink: 0 }}>
                    {e.name[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#101828", margin: 0 }}>
                      {e.name} <span style={{ fontWeight: 400, color: "#98A2B3" }}>({e.age}세)</span>
                    </p>
                    <span style={{ fontSize: 11, fontWeight: 600, color: c.text, backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: "1px 7px", display: "inline-block", marginTop: 2 }}>
                      {e.flagText}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#2E5BFF", border: "1px solid #DCE4FF", backgroundColor: "#EEF2FF", borderRadius: 8, padding: "5px 10px" }}>
                  기록 복사
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute" style={{ bottom: -12, right: -16, backgroundColor: "#fff", borderRadius: 14, boxShadow: "0 8px 24px rgba(16,24,40,0.14)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#ECFDF3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
          📧
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#101828", margin: 0 }}>보고서 자동 발송</p>
          <p style={{ fontSize: 11, color: "#98A2B3", margin: 0 }}>매주 월요일 08:00</p>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function LandingClient() {
  const [audience, setAudience] = useState<Audience>("individual");
  const [visible, setVisible] = useState(true);

  function switchAudience(next: Audience) {
    if (next === audience) return;
    setVisible(false);
    setTimeout(() => {
      setAudience(next);
      setVisible(true);
    }, 180);
  }

  const isOrg = audience === "org";
  const valueProps = isOrg ? ORG_VALUE_PROPS : IND_VALUE_PROPS;
  const comparison = isOrg ? ORG_COMPARISON : IND_COMPARISON;
  const checks = isOrg ? ORG_CHECKS : IND_CHECKS;

  const contentStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(6px)",
    transition: "opacity 180ms ease, transform 180ms ease",
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", backgroundColor: "#F5F7FB", minHeight: "100vh" }}>

      {/* ── Nav ── */}
      <nav style={{ height: 76, backgroundColor: "#fff", borderBottom: "1px solid #E7EBF3", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6 md:px-12">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#5B82FF,#2E5BFF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PhoneCall size={16} color="#fff" strokeWidth={1.8} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#101828" }}>SilverLink AI</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {["기능", "이용방식", "차별점", "요금"].map((item) => (
              <a key={item} href={`#${item}`} style={{ fontSize: 15, fontWeight: 500, color: "#475467", textDecoration: "none" }}>{item}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" style={{ fontSize: 14, fontWeight: 500, color: "#667085", textDecoration: "none" }}>로그인</Link>
            {isOrg ? (
              <Link href="/demo" style={{ padding: "10px 20px", borderRadius: 10, backgroundColor: "#2E5BFF", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
                데모 보기
              </Link>
            ) : (
              <Link href="/signup" style={{ padding: "10px 20px", borderRadius: 10, backgroundColor: "#2E5BFF", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
                무료 시작
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── 오디언스 토글 ── */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #F0F3F9", padding: "14px 0" }}>
        <div className="flex flex-col items-center gap-2.5">
          <p style={{ fontSize: 12, color: "#98A2B3", margin: 0, fontWeight: 500 }}>나에게 맞는 서비스를 선택하세요</p>
          <div style={{ display: "flex", backgroundColor: "#F2F4F7", borderRadius: 12, padding: 4, gap: 4 }}>
            {([
              { key: "individual" as const, label: "👨‍👩‍👧 개인·가족" },
              { key: "org" as const, label: "🏢 기관·센터" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchAudience(key)}
                style={{
                  padding: "9px 22px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: audience === key ? "#fff" : "transparent",
                  color: audience === key ? "#101828" : "#667085",
                  fontWeight: audience === key ? 700 : 500,
                  fontSize: 14,
                  boxShadow: audience === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  transition: "all 200ms ease",
                  whiteSpace: "nowrap" as const,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 전환되는 콘텐츠 ── */}
      <div style={contentStyle}>

        {/* ── Hero ── */}
        <section id="기능" style={{ background: "linear-gradient(180deg,#FFF 0%,#F5F8FF 100%)", padding: "80px 0" }}>
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-[1fr_1.05fr] md:gap-16 md:px-12 md:py-4">
            <div>
              <div className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5" style={{ backgroundColor: "#EEF2FF", border: "1px solid #DCE4FF" }}>
                <Sparkles size={13} color="#2E5BFF" strokeWidth={1.8} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#2E5BFF" }}>
                  {isOrg ? "방문요양·주간보호센터 전용" : "AI 통화 건강 분석 서비스"}
                </span>
              </div>

              {isOrg ? (
                <h1 className="text-4xl font-extrabold md:text-[52px]" style={{ color: "#101828", lineHeight: 1.2, margin: 0 }}>
                  생활지원사가 어르신 30명과<br />
                  통화한 뒤 기록 입력 시간을,<br />
                  <span style={{ color: "#2E5BFF" }}>0으로 만듭니다</span>
                </h1>
              ) : (
                <h1 className="text-4xl font-extrabold md:text-[58px]" style={{ color: "#101828", lineHeight: 1.15, margin: 0 }}>
                  부모님과의 통화,<br />
                  <span style={{ color: "#2E5BFF" }}>AI가 건강을 지킵니다</span>
                </h1>
              )}

              <p className="mt-5 text-lg leading-relaxed" style={{ color: "#475467", marginBottom: 36 }}>
                {isOrg
                  ? "통화가 끝나면 AI가 보고서를 자동 생성합니다. 정부 시스템에 그대로 붙여넣을 수 있어요."
                  : "평소 하던 전화를 앱으로 녹음하면 AI가 건강 신호를 분석하고, 이상 징후가 감지되면 즉시 알려드려요."}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                {isOrg ? (
                  <>
                    <Link href="/demo" style={{ padding: "15px 28px", borderRadius: 12, backgroundColor: "#2E5BFF", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none", textAlign: "center", boxShadow: "0 4px 14px rgba(46,91,255,0.35)", display: "inline-block" }}>
                      3분 데모 보기 →
                    </Link>
                    <Link href="/login" style={{ padding: "15px 28px", borderRadius: 12, backgroundColor: "#fff", color: "#344054", fontSize: 16, fontWeight: 600, textDecoration: "none", textAlign: "center", border: "1px solid #E7EBF3", display: "inline-block" }}>
                      로그인
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/signup" style={{ padding: "15px 28px", borderRadius: 12, backgroundColor: "#2E5BFF", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none", textAlign: "center", boxShadow: "0 4px 14px rgba(46,91,255,0.35)", display: "inline-block" }}>
                      무료로 시작하기 →
                    </Link>
                    <Link href="/login" style={{ padding: "15px 28px", borderRadius: 12, backgroundColor: "#fff", color: "#344054", fontSize: 16, fontWeight: 600, textDecoration: "none", textAlign: "center", border: "1px solid #E7EBF3", display: "inline-block" }}>
                      로그인
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-8 flex flex-col gap-2.5">
                {checks.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <CheckCircle2 size={16} color="#12B76A" strokeWidth={2} />
                    <span style={{ fontSize: 14, color: "#475467" }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {isOrg ? <OrgMockUI /> : <IndividualMockUI />}
          </div>
        </section>

        {/* ── Value Props ── */}
        <section id="이용방식" style={{ padding: "80px 0", backgroundColor: "#fff" }}>
          <div className="mx-auto max-w-6xl px-6 md:px-12">
            <div className="mb-12 text-center">
              <h2 style={{ fontSize: 40, fontWeight: 800, color: "#101828", margin: "0 0 12px" }}>왜 SilverLink인가요?</h2>
              <p style={{ fontSize: 17, color: "#475467", margin: 0 }}>
                {isOrg
                  ? "기록 입력을 없애고, 붙여넣을 수 있는 결과물을 대신 만들어 드립니다"
                  : "전화 한 통이 전문적인 돌봄 기록이 됩니다"}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {valueProps.map(({ Icon, title, desc }) => (
                <div key={title} style={{ padding: 28, borderRadius: 16, border: "1px solid #E7EBF3", backgroundColor: "#fff" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={20} color="#2E5BFF" strokeWidth={1.8} />
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 700, color: "#101828", margin: "0 0 10px" }}>{title}</h3>
                  <p style={{ fontSize: 15, color: "#475467", lineHeight: 1.6, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison ── */}
        <section id="차별점" style={{ padding: "80px 0", backgroundColor: "#F5F7FB" }}>
          <div className="mx-auto max-w-6xl px-6 md:px-12">
            <div className="mb-12 text-center">
              <h2 style={{ fontSize: 40, fontWeight: 800, color: "#101828", margin: "0 0 12px" }}>
                {isOrg ? "클로바 케어콜과 다릅니다" : "다른 녹음 앱과 다릅니다"}
              </h2>
              <p style={{ fontSize: 16, color: "#667085", margin: 0 }}>
                {isOrg
                  ? "클로바 케어콜은 AI가 어르신에게 전화를 겁니다(로보콜). SilverLink는 사람이 건 진짜 통화를 분석합니다."
                  : "클로바 노트, Google Recorder는 회의·메모용입니다. SilverLink는 처음부터 어르신 돌봄을 위해 만들었습니다."}
              </p>
            </div>
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #E7EBF3", backgroundColor: "#fff" }}>
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  {isOrg ? (
                    <colgroup>
                      <col style={{ width: "60%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "20%" }} />
                    </colgroup>
                  ) : (
                    <colgroup>
                      <col style={{ width: "40%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "20%" }} />
                    </colgroup>
                  )}
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E7EBF3", backgroundColor: "#F9FAFD" }}>
                      <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 600, color: "#667085" }}>기능</th>
                      <th style={{ padding: "14px 20px", textAlign: "center", fontWeight: 700, color: "#2E5BFF", backgroundColor: "#EEF2FF" }}>SilverLink</th>
                      {isOrg ? (
                        <th style={{ padding: "14px 20px", textAlign: "center", fontWeight: 500, color: "#98A2B3" }}>클로바 케어콜</th>
                      ) : (
                        <>
                          <th style={{ padding: "14px 20px", textAlign: "center", fontWeight: 500, color: "#98A2B3" }}>클로바 노트</th>
                          <th style={{ padding: "14px 20px", textAlign: "center", fontWeight: 500, color: "#98A2B3" }}>Google Recorder</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row, i) => (
                      <tr key={row.feature} style={{ borderBottom: i < comparison.length - 1 ? "1px solid #F0F3F9" : "none" }}>
                        <td style={{ padding: "14px 20px", color: "#344054", fontWeight: 500 }}>{row.feature}</td>
                        <td style={{ padding: "14px 20px", textAlign: "center", backgroundColor: "#EEF2FF", color: "#2E5BFF", fontSize: 18 }}>✓</td>
                        <td style={{ padding: "14px 20px", textAlign: "center", color: "#D0D5DD" }}>—</td>
                        {!isOrg && <td style={{ padding: "14px 20px", textAlign: "center", color: "#D0D5DD" }}>—</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA / 요금 ── */}
        <section id="요금" style={{ padding: "80px 24px", backgroundColor: "#F5F7FB" }}>
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-3xl px-8 py-16 text-center md:px-16" style={{ background: "linear-gradient(135deg,#12183F,#1B2660)" }}>
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.03)" }} />
              <div className="relative">
                {isOrg ? (
                  <>
                    <div style={{ display: "inline-block", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 14px", marginBottom: 16 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#A7B4E8" }}>기관당 월 15만원 · 파일럿 기간 무료</span>
                    </div>
                    <h2 style={{ fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>3분 데모로 먼저 확인하세요</h2>
                    <p style={{ fontSize: 17, color: "#A7B4E8", margin: "0 0 36px" }}>실제 데이터로 대시보드·보고서·복사 기능을 직접 눌러볼 수 있습니다.</p>
                    <Link href="/demo" style={{ display: "inline-block", padding: "16px 36px", borderRadius: 12, backgroundColor: "#fff", color: "#2E5BFF", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
                      데모 보기 →
                    </Link>
                  </>
                ) : (
                  <>
                    <h2 style={{ fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>오늘부터 부모님 돌봄을 시작하세요</h2>
                    <p style={{ fontSize: 17, color: "#A7B4E8", margin: "0 0 36px" }}>무료로 사용할 수 있습니다. 신용카드가 필요 없어요.</p>
                    <Link href="/signup" style={{ display: "inline-block", padding: "16px 36px", borderRadius: 12, backgroundColor: "#fff", color: "#2E5BFF", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
                      무료로 시작하기 →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>{/* end contentStyle div */}

      {/* ── Footer (토글 무관하게 항상 노출) ── */}
      <footer style={{ padding: "28px 48px", borderTop: "1px solid #E7EBF3", backgroundColor: "#fff", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#98A2B3", margin: 0 }}>© 2026 SilverLink AI — 어르신 돌봄 특화 AI 통화 분석</p>
      </footer>
    </div>
  );
}
