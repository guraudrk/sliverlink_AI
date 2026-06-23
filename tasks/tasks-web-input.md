# Tasks: SilverLink AI – Web Input Channel MVP

기준 문서: `docs/PRD-web-input.md` (v2)

## Relevant Files
- `src/components/task-request-form.tsx` — 입력 폼 (`sender_name`, `target_person`, `message`)
- `src/lib/silverlink/schema.ts` — Zod 스키마 (사용자 입력 스키마 + 최종 payload 스키마)
- `src/lib/silverlink/time.ts` — KST 기준 `requested_at`/`today_date` 생성
- `src/lib/silverlink/payload.ts` — 입력 + 시간값 + `source_channel: "web"` → 최종 payload 변환
- `src/lib/silverlink/env.ts` — 서버 전용 `MAKE_WEBHOOK_URL` / `SILVERLINK_DRY_RUN` 로더
- `src/lib/silverlink/make-client.ts` — Make Webhook 호출 (DRY_RUN 분기)
- `src/app/api/create-task/route.ts` — `POST` 핸들러 (검증 → payload → make-client)
- `src/lib/silverlink/__tests__/schema.test.ts` — 스키마 Vitest 유닛 테스트
- `src/lib/silverlink/__tests__/payload.test.ts` — payload 변환 Vitest 유닛 테스트
- `tests/e2e/create-task.spec.ts` — Playwright E2E 테스트
- `.env.local` / `.env.example` — 환경변수 (`.env.local`은 Git 업로드 금지, 이미 `.gitignore` 적용됨)
- `package.json` — Zod / Vitest / Playwright 의존성 및 스크립트 추가 대상
- `README.md` — 6.0에서 실행/연동 방법 정리 대상

## Notes
- 이 저장소의 구현 범위는 "웹 입력 → 검증 → Make Webhook 호출"까지다. GPT 해석, Airtable(`care_tasks`, `message_logs`) 기록은 Make.com 시나리오 책임이며 이 코드베이스에서 직접 호출하지 않는다.
- `source_channel`, `requested_at`, `today_date`는 클라이언트 입력값이 아니라 서버가 생성/덮어쓴다.
- 모든 테스트는 `SILVERLINK_DRY_RUN=true` 기준으로 외부 네트워크 의존 없이 동작해야 한다.
- 구현 진입 전 `node_modules/next/dist/docs/`에서 Next.js 16.2.9 Route Handler 관련 문서를 확인한다 (AGENTS.md 지침).
- 하위 테스크 단위로 구현 후 해당 테스크를 체크하고, 관련 테스트를 실행해 통과를 확인한다.
- 작업 하나가 끝날 때마다 이 파일에서 해당 항목의 `[ ]`를 `[x]`로 바꾼다.

## 작업 목록 (Tasks)

- [ ] 0.0 기능 브랜치 생성
  - [ ] 0.1 `main` 기준 최신 상태 확인 (`git status`, `git pull` 필요 시)
  - [ ] 0.2 기능 브랜치 생성 (예: `feature/web-input-channel`)
  - [ ] 0.3 이후 모든 작업은 이 브랜치에서 진행

- [ ] 1.0 프로젝트 환경변수와 하네스 구조 설정
  - [ ] 1.1 `zod`를 `package.json` 직접 의존성으로 추가
  - [ ] 1.2 `vitest`(+ 필요 시 `jsdom`, `@vitejs/plugin-react`) 설치, `vitest.config.ts` 작성, `package.json`에 `test:unit` 스크립트 추가
  - [ ] 1.3 `@playwright/test` 설치, `playwright.config.ts` 작성(baseURL: 로컬 dev 서버), `package.json`에 `test:e2e` 스크립트 추가
  - [ ] 1.4 `src/lib/silverlink/env.ts` 구현: `server-only` 가드, `MAKE_WEBHOOK_URL` 필수값 검증(fail-fast), `SILVERLINK_DRY_RUN` boolean 파싱(기본값 `true`)
  - [ ] 1.5 `.env.example`에 `MAKE_WEBHOOK_URL`, `SILVERLINK_DRY_RUN` 항목과 설명 주석 정리 (값은 마스킹)
  - [ ] 1.6 `.gitignore`의 `.env*` 규칙으로 `.env.local`이 추적되지 않는지 재확인

- [ ] 2.0 입력 스키마와 payload 생성 로직 구현
  - [ ] 2.1 `src/lib/silverlink/schema.ts`: 사용자 입력 스키마 정의 (`sender_name`, `target_person`, `message` — 필수, trim, 빈 문자열 금지, 최대 길이 제한)
  - [ ] 2.2 `schema.ts`: 최종 payload 스키마 정의 (`source_channel` literal `"web"`, `requested_at` ISO datetime, `today_date` `YYYY-MM-DD` 포함), 향후 `kakao` 확장을 고려해 union으로 확장 가능하게 작성
  - [ ] 2.3 `schema.ts`: `z.infer`로 `TaskRequestInput`, `TaskRequestPayload` 타입 export
  - [ ] 2.4 `src/lib/silverlink/time.ts`: KST 기준 `requested_at`(ISO 8601) 생성 함수 작성
  - [ ] 2.5 `time.ts`: KST 기준 `today_date`(`YYYY-MM-DD`) 생성 함수 작성, 서버 환경 타임존에 의존하지 않도록 처리
  - [ ] 2.6 `src/lib/silverlink/payload.ts`: 검증된 입력 + `time.ts` 결과 + 고정값 `source_channel: "web"`을 합쳐 `TaskRequestPayload`를 만드는 순수 함수 작성 (시간 함수 주입 가능하게 설계해 테스트에서 고정 가능하도록)

- [ ] 3.0 서버 API Route와 Make Webhook 클라이언트 구현
  - [ ] 3.1 `src/lib/silverlink/make-client.ts`: `fetch` 기반 POST 호출 함수 작성 (`MAKE_WEBHOOK_URL`, 최종 payload)
  - [ ] 3.2 `make-client.ts`: 타임아웃 처리(`AbortController`) 및 네트워크/HTTP 오류 핸들링
  - [ ] 3.3 `make-client.ts`: `SILVERLINK_DRY_RUN=true`일 때 실제 호출 생략, 구조화된 로그 + 모의 성공 응답 반환 분기 작성
  - [ ] 3.4 `make-client.ts`: 호출 결과를 일관된 타입(성공/실패 + 메시지)으로 반환
  - [ ] 3.5 `src/app/api/create-task/route.ts`: `POST` 핸들러 작성 — 요청 바디를 2.1 스키마로 파싱, 실패 시 400 + 필드별 에러 응답
  - [ ] 3.6 `route.ts`: 성공 시 2.0의 payload 변환 → 3.1~3.4 make-client 호출 → 결과 응답
  - [ ] 3.7 `route.ts`: make-client 실패 시 5xx + 안전한 에러 메시지(내부 URL/스택 비노출) 응답

- [ ] 4.0 웹 입력 폼 UI 구현
  - [ ] 4.1 `src/components/task-request-form.tsx`: `sender_name`, `target_person`, `message` 입력 필드 UI 작성
  - [ ] 4.2 2.1 스키마를 이용한 제출 전 클라이언트 검증 및 필드별 에러 표시
  - [ ] 4.3 제출 중 로딩 상태, 성공/실패 피드백 UI 처리
  - [ ] 4.4 성공 시 폼 초기화
  - [ ] 4.5 `src/app/page.tsx`(또는 적절한 페이지)에 폼 컴포넌트 연결

- [ ] 5.0 단위 테스트와 E2E 테스트 구현
  - [ ] 5.1 `src/lib/silverlink/__tests__/schema.test.ts`: 유효 입력 통과, 필수값 누락/빈 문자열 실패 케이스
  - [ ] 5.2 `src/lib/silverlink/__tests__/payload.test.ts`: 변환 결과에 `source_channel: "web"`, `requested_at`, `today_date`가 올바르게 포함되는지 검증
  - [ ] 5.3 `npm run test:unit` 전체 통과 확인
  - [ ] 5.4 `tests/e2e/create-task.spec.ts`: `SILVERLINK_DRY_RUN=true` 환경에서 폼 작성 → 제출 → 성공 메시지 확인 플로우 작성
  - [ ] 5.5 `create-task.spec.ts`: 필수 필드 누락 시 에러 메시지 노출 플로우 작성
  - [ ] 5.6 `npm run test:e2e` 전체 통과 확인

- [ ] 6.0 실제 Make 연동 및 README 정리
  - [ ] 6.1 브라우저 네트워크 탭/번들에서 `MAKE_WEBHOOK_URL` 노출 여부 점검
  - [ ] 6.2 `SILVERLINK_DRY_RUN=false` + 테스트용 Webhook URL로 실제 호출 1회 점검 (Make 수신 여부만 확인, GPT/Airtable 이후 단계는 범위 밖)
  - [ ] 6.3 `README.md`에 실행 방법(`npm run dev`), 테스트 실행 방법(`test:unit`, `test:e2e`), 환경변수 설정 안내 추가
  - [ ] 6.4 `docs/PRD-web-input.md` 10장(DoD)·11장(리스크) 체크리스트 최종 갱신
  - [ ] 6.5 기능 브랜치 커밋/푸시 및 필요 시 PR 생성 안내
