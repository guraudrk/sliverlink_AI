export const metadata = {
  title: "개인정보처리방침 | SilverLink AI",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 text-slate-800">
      <h1 className="text-2xl font-bold mb-2">개인정보처리방침</h1>
      <p className="text-sm text-slate-500 mb-8">최종 수정일: 2026년 7월 13일</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">1. 수집하는 개인정보</h2>
        <p className="text-sm leading-7 text-slate-600">
          SilverLink AI(이하 "서비스")는 다음 정보를 수집합니다.
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-600">
          <li>이메일 주소 (로그인 및 계정 관리)</li>
          <li>어르신 프로필 정보 (이름, 생년월일 등 사용자가 직접 입력한 정보)</li>
          <li>통화 녹음 파일 및 텍스트 요약 (AI 분석 목적)</li>
          <li>AI 분석 결과 (건강 신호, 요약, 위험 수준)</li>
          <li>기기 권한 (마이크 — 직접 녹음 기능 사용 시)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">2. 수집 목적</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
          <li>어르신과의 통화 내용을 AI로 분석하여 건강·안전 신호 감지</li>
          <li>가족 또는 케어매니저에게 케어 인사이트 제공</li>
          <li>서비스 운영 및 개선</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">3. 보관 기간</h2>
        <p className="text-sm leading-7 text-slate-600">
          수집된 정보는 회원 탈퇴 시 즉시 삭제됩니다. 통화 녹음 파일은 분석 완료 후
          사용자가 직접 삭제할 수 있으며, 삭제 요청 시 즉시 처리됩니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">4. 제3자 제공</h2>
        <p className="text-sm leading-7 text-slate-600">
          수집된 개인정보는 아래 서비스에 한해 처리 목적으로만 전달됩니다.
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-600">
          <li>Supabase (데이터베이스 및 파일 저장 — 미국 소재)</li>
          <li>Google Gemini AI (통화 내용 분석 — 미국 소재)</li>
          <li>Vercel (웹 서버 호스팅 — 미국 소재)</li>
        </ul>
        <p className="text-sm mt-2 text-slate-600">
          마케팅 또는 광고 목적으로 제3자에게 개인정보를 판매하거나 공유하지 않습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">5. 사용자 권리</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
          <li>개인정보 열람·수정·삭제 요청 가능</li>
          <li>계정 탈퇴 시 모든 데이터 즉시 삭제</li>
          <li>통화 녹음 개별 삭제 가능 (앱 내 설정)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">6. 마이크 권한</h2>
        <p className="text-sm leading-7 text-slate-600">
          직접 녹음 기능 사용 시 마이크 권한이 필요합니다. 이 권한은 사용자가
          명시적으로 녹음을 시작할 때만 사용되며, 백그라운드에서 마이크에 접근하지 않습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">7. 문의</h2>
        <p className="text-sm leading-7 text-slate-600">
          개인정보 처리에 관한 문의는 아래 이메일로 연락해 주세요.
          <br />
          <a href="mailto:djwls9614@gmail.com" className="text-blue-600 underline">
            djwls9614@gmail.com
          </a>
        </p>
      </section>
    </main>
  );
}
