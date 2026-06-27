# Tasks: Day 16 — 웹 개편(모바일 최적화) + 배포

기준 문서: `docs/PRD-day16-web-redesign-deploy-mobile.md`

## Notes
- 배포 플랫폼: Vercel (PRD 2-1 근거). 도메인: `silverlink-ai.vercel.app` 계열 무료 서브도메인(PRD 2-2 근거).
- 앱(네이티브/PWA 설치형) 출시는 이번 범위 제외 — 다음 로드맵 항목(5단계, 실제 발송) 이후로 미룸.
- Vercel 프로젝트 생성/Import는 사용자 계정 로그인이 필요해 Claude Code가 대신할 수 없다 — 정확한 클릭 순서만 안내하고 사용자가 직접 진행.
- 커밋·푸시는 사용자가 명시적으로 요청한 시점에만 수행한다.

## Relevant Files
- `src/app/icon.tsx` (신규), `src/app/apple-icon.tsx` (신규), `src/app/manifest.ts` (신규)
- `src/app/favicon.ico` (삭제 — icon.tsx로 대체)
- `src/app/notifications/` (삭제 — 레거시), `src/app/api/notifications/prepare/route.ts` (삭제), `src/components/notification-preview-panel.tsx` (삭제)
- 모바일 점검 대상: `src/app/r/[token]/page.tsx`, `src/app/(auth)/{login,signup}/page.tsx`, `src/app/(protected)/dashboard/**`
- `docs/deployment-guide.md` (신규)

## 작업 목록 (Tasks)

- [x] 1.0 브랜드 아이콘
  - [x] 1.1 `src/app/icon.tsx` — `next/og`의 `ImageResponse`로 PNG 생성, 블루 베이스 + 하트(돌봄/연결) 모티프 — manifest용 해상도까지 함께 쓰려고 32x32가 아니라 512x512로 생성(브라우저가 탭에서는 자동으로 축소해서 보여줌)
  - [x] 1.2 `src/app/apple-icon.tsx` — 180x180 버전(iOS 홈 화면용)
  - [x] 1.3 `src/app/manifest.ts` — name/short_name/theme_color/icons 정의 + `layout.tsx`에 `viewport.themeColor` 추가
  - [x] 1.4 기존 `src/app/favicon.ico`(Next 기본 템플릿) 삭제
  - [x] 1.5 `npm run dev` + `curl`로 `/icon`·`/apple-icon`·`/manifest.webmanifest` 응답 확인, 생성된 PNG를 직접 시각 확인

- [x] 2.0 레거시 정리
  - [x] 2.1 `/notifications` 페이지, `/api/notifications/prepare`, `notification-preview-panel.tsx` 사용처가 정말 없는지 grep으로 재확인 후 삭제(밑단 `src/lib/silverlink/notifications/` 엔진+테스트는 Day5의 독립된 결과물이라 의도적으로 보존)
  - [x] 2.2 관련 테스트 없음(레거시 라우트 자체엔 테스트가 없었음)
  - [x] 2.3 `npx tsc --noEmit` / `npx vitest run` / `npm run build` 클린 확인(스테일 `.next` 타입 캐시 때문에 한 번 재빌드 필요했음)

- [x] 3.0 모바일 반응형 점검(Playwright 스크린샷 기반)
  - [x] 3.1 비로그인 페이지(`/login`, `/signup`, `/r/[token]` invalid-token 상태) 스크린샷 — 셀 다 가로 스크롤 없음, 이미 모바일 친화적
  - [x] 3.2 문제 없었음(코드 레벨 재확인으로 grid-cols/고정폭/오버플로우도 점검)
  - [x] 3.3~3.4 로그인 필요한 대시보드 페이지들은 테스트 계정이 없어 스크린샷 대신 코드 리뷰로 진행 — `text-sm`(14px) 입력 필드 2곳에서 iOS Safari 자동 확대 버그 발견·수정(`care-assistant-panel.tsx` select, `send-notification-modal.tsx` textarea)
  - [x] 3.5 임시 스크립트/스크린샷 모두 삭제 완료

- [x] 4.0 배포 사전 준비
  - [x] 4.1 환경변수 목록 정리 → `docs/deployment-guide.md` 3장
  - [x] 4.2 리다이렉트 URL 절차 정리 → `docs/deployment-guide.md` 4장(Google Cloud Console은 변경 불필요라는 점도 명시)

- [x] 5.0 Vercel 배포 (사용자 직접 진행 + Claude Code 안내)
  - [x] 5.1 사용자가 Vercel에 GitHub 저장소 Import
  - [x] 5.2 프로젝트 이름을 `silverlink-ai`로 지정 — 다만 최초 Import 시 GitHub 저장소 이름(`sliverlink_AI`, 오타)이 도메인 기본값으로 들어가서, Project Name 변경 후 Domains 탭에서 도메인 자체도 별도로 Edit해서 `silverlink-ai.vercel.app`으로 맞춤(deployment-guide.md에 이 함정 기록해둠)
  - [x] 5.3 환경변수 등록(`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`GEMINI_API_KEY`, 사용자가 직접 입력)
  - [x] 5.4 첫 배포 실행 — 성공
  - [x] 5.5 Supabase Authentication URL Configuration에 Site URL/Redirect URLs 추가 완료(Google Cloud Console은 4.2에서 확인한 대로 변경 불필요)
  - [x] 5.6 배포된 주소에서 스모크 테스트 — 공개 라우트는 `curl`로 확인(전부 200/307), 로그인/Google 로그인/대시보드/채팅/`/r/[token]` 실제 응답까지 사용자가 직접 확인 완료(전체 정상)

- [x] 6.0 문서화
  - [x] 6.1 `docs/deployment-guide.md` 작성 + 실제 운영 주소/도메인 함정 메모 반영
  - [x] 6.2 `README.md`에 배포 관련 섹션(5장에 운영 주소 한 줄 + 19장 Day16 섹션) 추가
  - [x] 6.3 `docs/work-log.md`에 Day16 항목 작성
