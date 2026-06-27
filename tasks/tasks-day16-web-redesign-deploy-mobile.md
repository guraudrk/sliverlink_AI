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

- [ ] 1.0 브랜드 아이콘
  - [ ] 1.1 `src/app/icon.tsx` — `next/og`의 `ImageResponse`로 32x32 PNG 생성, 블루 베이스 + 돌봄/연결 모티프
  - [ ] 1.2 `src/app/apple-icon.tsx` — 180x180 버전(iOS 홈 화면용)
  - [ ] 1.3 `src/app/manifest.ts` — name/short_name/theme_color/icons 정의
  - [ ] 1.4 기존 `src/app/favicon.ico`(Next 기본 템플릿) 삭제
  - [ ] 1.5 `npm run dev`로 브라우저 탭 아이콘 확인

- [ ] 2.0 레거시 정리
  - [ ] 2.1 `/notifications` 페이지, `/api/notifications/prepare`, `notification-preview-panel.tsx` 사용처가 정말 없는지 grep으로 재확인 후 삭제
  - [ ] 2.2 관련 테스트/타입이 있으면 함께 정리
  - [ ] 2.3 `npx tsc --noEmit` / `npx vitest run` / `npm run build` 클린 확인

- [ ] 3.0 모바일 반응형 점검(Playwright 스크린샷 기반)
  - [ ] 3.1 임시 스크린샷 스크립트 작성(iPhone 14 뷰포트 375x812) — `/r/[token]`(테스트용 토큰), `/login`, `/signup`
  - [ ] 3.2 스크린샷 확인 후 문제(가로 스크롤/겹침/터치 영역) 있으면 수정, 재스크린샷
  - [ ] 3.3 로그인 세션으로 `/dashboard`, `/dashboard/assistant`(채팅 입력창 포커스 상태 포함), `/dashboard/create-task` 점검·수정
  - [ ] 3.4 `/dashboard/tasks`, `/dashboard/calls`, `/dashboard/parents`(+상세), `/dashboard/responses` 점검·수정
  - [ ] 3.5 점검에 쓴 임시 스크립트/스크린샷 파일 정리(스크래치패드로, 저장소에 남기지 않음)

- [ ] 4.0 배포 사전 준비
  - [ ] 4.1 `.env.example`/README 6장 기준으로 Vercel에 등록할 환경변수 목록 정리
  - [ ] 4.2 Supabase Authentication URL Configuration / Google Cloud OAuth 리다이렉트 URI에 운영 도메인 추가 절차를 문서로 정리(실제 추가는 도메인 확정 후)

- [ ] 5.0 Vercel 배포 (사용자 직접 진행 + Claude Code 안내)
  - [ ] 5.1 사용자가 Vercel에 GitHub 저장소(`guraudrk/sliverlink_AI`) Import
  - [ ] 5.2 프로젝트 이름을 `silverlink-ai`(또는 가능한 가장 가까운 이름)로 지정해 서브도메인 확정
  - [ ] 5.3 환경변수 등록(4.1 목록대로, 값은 사용자가 직접 입력)
  - [ ] 5.4 첫 배포 실행
  - [ ] 5.5 확정된 운영 도메인을 Supabase/Google OAuth 리다이렉트 설정에 추가(4.2 절차대로)
  - [ ] 5.6 배포된 주소에서 로그인/회원가입/Google 로그인/대시보드/채팅까지 직접 스모크 테스트

- [ ] 6.0 문서화
  - [ ] 6.1 `docs/deployment-guide.md` 신규 작성(재배포 방법, 환경변수 목록, 도메인/리다이렉트 설정 위치, 문제 발생 시 확인 순서)
  - [ ] 6.2 `README.md`에 배포 관련 섹션 추가(운영 주소, 배포 방법 한 줄 요약 + deployment-guide.md 링크)
  - [ ] 6.3 `docs/work-log.md`에 Day16 항목 작성(기술/쉬운 설명 모두)
