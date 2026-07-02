"use client";

import { usePathname } from "next/navigation";
import { PageGuideButton } from "./page-guide-button";

type Guide = { title: string; content: React.ReactNode };

function getGuide(pathname: string): Guide | null {
  if (pathname === "/dashboard") {
    return {
      title: "SilverLink AI 사용 가이드",
      content: (
        <>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              이 앱이 하는 일
            </h3>
            <p className="leading-relaxed">부모님/어르신의 약 복용, 안부 확인, 건강 체크 등을 <strong>SMS · AI 음성전화</strong>로 자동 알려드려요. AI가 개인 맞춤 메시지와 전화 스크립트를 대신 만들어 줍니다.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              시작하는 순서
            </h3>
            <ol className="space-y-1 leading-relaxed">
              <li>① <strong>부모님 관리</strong> — 이름·전화번호·돌봄 내용 등록</li>
              <li>② <strong>새 일정 만들기</strong> — 어르신께 전할 내용 작성</li>
              <li>③ <strong>미발송 알림</strong> — AI 초안 확인 후 SMS/전화 발송</li>
              <li>④ <strong>발송 기록 / 응답 기록</strong> — 결과 확인</li>
            </ol>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">💡</span>
              AI 품질 높이는 팁
            </h3>
            <p className="leading-relaxed">부모님 관리에서 <strong>돌봄 내용 · 복약 정보 · 소통 방식</strong>을 자세히 입력할수록 AI가 더 자연스러운 메시지를 만들어 줘요.</p>
          </section>
        </>
      ),
    };
  }

  if (pathname === "/dashboard/tasks" || pathname.startsWith("/dashboard/tasks")) {
    return {
      title: "오늘의 일정 안내",
      content: (
        <>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              일정이란?
            </h3>
            <p className="leading-relaxed">AI 비서에게 어르신 안부 확인을 부탁하는 항목이에요. 자유롭게 내용을 입력하면 AI가 일정 유형을 분류하고 SMS·전화 초안을 만들어 줍니다.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              상태 뱃지
            </h3>
            <ul className="space-y-1 leading-relaxed">
              <li><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">예정</span> — 아직 발송 전</li>
              <li><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">완료</span> — 어르신이 완료 응답</li>
              <li><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">도움 요청</span> — 직접 연락 필요</li>
              <li><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">나중에 다시</span> — 어르신이 미룸</li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              미발송 필터
            </h3>
            <p className="leading-relaxed">상단 버튼으로 <strong>아직 알림을 보내지 않은 일정만</strong> 골라볼 수 있어요. 클릭하면 채널을 선택해 바로 발송할 수 있습니다.</p>
          </section>
        </>
      ),
    };
  }

  if (pathname === "/dashboard/responses") {
    return {
      title: "어르신 응답 기록 안내",
      content: (
        <>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              응답 기록이란?
            </h3>
            <p className="leading-relaxed">SMS로 전달된 <strong>응답 링크</strong>를 어르신이 눌렀을 때 남기는 내용이에요. 어르신이 직접 상태를 체크하거나 메시지를 입력한 결과가 여기 모입니다.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              부모님 필터
            </h3>
            <p className="leading-relaxed">상단 선택 박스에서 특정 어르신을 선택하면 그분의 응답만 볼 수 있어요. 기본값은 <strong>등록된 모든 어르신</strong>의 응답을 합쳐서 보여줍니다.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              응답 클릭
            </h3>
            <p className="leading-relaxed">각 카드를 클릭하면 관련 일정, 채널, 받은 시각 등 상세 정보를 확인할 수 있어요.</p>
          </section>
        </>
      ),
    };
  }

  if (pathname === "/dashboard/deliveries") {
    return {
      title: "발송 기록 안내",
      content: (
        <>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              채널 뱃지
            </h3>
            <ul className="space-y-1 leading-relaxed">
              <li><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">AI 전화</span> — TTS 음성 안부전화</li>
              <li><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">SMS</span> — 문자 메시지</li>
              <li><span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">카카오</span> — 카카오 알림톡</li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              상태 뱃지
            </h3>
            <ul className="space-y-1 leading-relaxed">
              <li><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">응답 완료</span> — 어르신이 키패드 응답</li>
              <li><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">발송 완료</span> — 정상 전송됨</li>
              <li><span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">실패</span> — 발송 오류 발생</li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              상세 보기
            </h3>
            <p className="leading-relaxed">카드를 클릭하면 수신자, 발송 시각, AI 전화 응답 키, 오류 원인 등을 확인할 수 있어요.</p>
          </section>
        </>
      ),
    };
  }

  if (pathname === "/dashboard/calls") {
    return {
      title: "안부전화 안내",
      content: (
        <>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              Mock이란?
            </h3>
            <p className="leading-relaxed">실제 전화를 걸지 않고 AI 음성전화 흐름을 미리 테스트하는 모드예요. 외부로 아무것도 전송되지 않지만 기록은 실제와 동일하게 쌓입니다.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              사용 흐름
            </h3>
            <ol className="space-y-1 leading-relaxed">
              <li>① 일정 선택 → AI가 TTS 스크립트 자동 생성</li>
              <li>② Mock 발신 → 발송 기록에 이력 저장</li>
              <li>③ "응답 확인" → Mock 키패드 응답 결과 확인</li>
            </ol>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              실제 전화
            </h3>
            <p className="leading-relaxed">Vercel 환경변수에서 <code className="rounded bg-slate-100 px-1 text-xs">ENABLE_REAL_CALLS=true</code>를 설정하면 Solapi를 통해 실제 TTS 전화가 발신돼요.</p>
          </section>
        </>
      ),
    };
  }

  if (pathname === "/dashboard/assistant") {
    return {
      title: "돌봄 기록 AI 비서 안내",
      content: (
        <>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              무엇을 해주나요?
            </h3>
            <p className="leading-relaxed">쌓인 <strong>일정 · 응답 기록 · 안부전화 결과</strong>를 AI가 검색해, 질문에 맞는 근거를 찾아 자연어로 정리해 드려요.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              질문 예시
            </h3>
            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              <p>"엄마가 최근에 약 드셨다는 응답을 한 적 있어?"</p>
              <p className="mt-1">"지난달에 도움이 필요하다고 한 적 있었나요?"</p>
              <p className="mt-1">"아버지 안부전화 응답 요약해줘"</p>
            </div>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              근거 카드
            </h3>
            <p className="leading-relaxed">AI 답변 아래 근거로 사용된 기록 카드가 표시돼요. 카드를 클릭하면 원문 내용을 자세히 확인할 수 있습니다.</p>
          </section>
        </>
      ),
    };
  }

  if (pathname === "/dashboard/create-task") {
    return {
      title: "새 일정 만들기 안내",
      content: (
        <>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              어떻게 작성하나요?
            </h3>
            <p className="leading-relaxed">부모님을 선택하고, 어르신께 전할 내용을 <strong>자유롭게</strong> 적으면 돼요.</p>
            <div className="mt-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              <p>"엄마 오늘 혈압약 드셨는지 확인해줘"</p>
              <p className="mt-1">"아버지 오후 3시 병원 예약 상기시켜줘"</p>
            </div>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              AI가 해주는 것
            </h3>
            <ul className="space-y-1 leading-relaxed">
              <li>✦ 일정 유형 자동 분류 (복약/병원/안부 등)</li>
              <li>✦ SMS 메시지 초안 자동 생성</li>
              <li>✦ AI 전화 스크립트 초안 자동 생성</li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              생성 후에는?
            </h3>
            <p className="leading-relaxed"><strong>오늘의 일정</strong>에서 확인하고, "미발송 알림만 보기" 필터로 골라 바로 발송하면 됩니다.</p>
          </section>
        </>
      ),
    };
  }

  if (pathname.startsWith("/dashboard/parents/")) {
    return {
      title: "어르신 개별 현황 안내",
      content: (
        <>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              이 페이지는?
            </h3>
            <p className="leading-relaxed">이 어르신에게 등록된 <strong>일정</strong>과 <strong>응답 기록</strong>만 모아서 보여줘요. 특정 어르신의 상황을 집중해서 확인할 때 유용합니다.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              상세 보기
            </h3>
            <p className="leading-relaxed">일정·응답 카드를 클릭하면 발송 채널, 상태, 원문 메시지 등 상세 내용을 팝업으로 확인할 수 있어요.</p>
          </section>
        </>
      ),
    };
  }

  if (pathname === "/parents") {
    return {
      title: "AI 알림 기능 가이드",
      content: (
        <>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              AI가 자동으로 SMS 메시지를 만들어요
            </h3>
            <p className="leading-relaxed">부모님 프로필에 입력한 정보를 AI가 읽고, 상황에 딱 맞는 SMS 메시지를 자동으로 작성해줍니다.</p>
            <div className="mt-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              <p className="font-semibold">예시</p>
              <p className="mt-1">프로필에 "혈압약 매일 오전 9시" 입력 →<br />"어머니, 오전 약 드실 시간이에요 💊" 자동 구성</p>
            </div>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              AI가 전화 스크립트도 만들어요
            </h3>
            <p className="leading-relaxed">부모님 프로필을 바탕으로 TTS 통화 스크립트를 자동 생성합니다. 어르신은 키패드로 간단하게 응답할 수 있어요.</p>
            <div className="mt-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              <p className="font-semibold">키패드 응답</p>
              <p className="mt-1">1번: 완료했어요 · 2번: 도움이 필요해요</p>
            </div>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">💡</span>
              입력할수록 품질이 올라가요
            </h3>
            <p className="leading-relaxed">프로필 하단의 <strong>돌봄 내용 · 복약 정보 · 소통 방식</strong>을 채울수록 AI 메시지 품질이 높아집니다.</p>
          </section>
        </>
      ),
    };
  }

  if (pathname === "/delivery-preview") {
    return {
      title: "발송 미리보기 안내",
      content: (
        <>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              발송 미리보기란?
            </h3>
            <p className="leading-relaxed">실제 SMS·전화를 보내지 않고 <strong>알림 큐와 발송 기록을 Mock으로 생성</strong>하는 테스트 도구예요. 외부로 아무것도 전송되지 않습니다.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              결과 확인
            </h3>
            <p className="leading-relaxed">Mock 발송 후 <strong>발송 기록</strong> 페이지에서 이력을 확인할 수 있어요.</p>
          </section>
          <section>
            <h3 className="mb-1.5 flex items-center gap-2 font-bold text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              실제 발송 테스트
            </h3>
            <p className="leading-relaxed"><strong>오늘의 일정 → 미발송 알림</strong>에서 채널을 선택해 발송하거나, Vercel 환경변수를 설정하세요.</p>
          </section>
        </>
      ),
    };
  }

  return null;
}

export function NavPageGuide() {
  const pathname = usePathname();
  const guide = getGuide(pathname);
  if (!guide) return null;

  return <PageGuideButton title={guide.title}>{guide.content}</PageGuideButton>;
}
