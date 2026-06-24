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
- `docs/work-log.md` — 작업(테스크/슬라이스) 완료 시마다 누적되는 작업 로그

## Notes
- 이 저장소의 구현 범위는 "웹 입력 → 검증 → Make Webhook 호출"까지다. GPT 해석, Airtable(`care_tasks`, `message_logs`) 기록은 Make.com 시나리오 책임이며 이 코드베이스에서 직접 호출하지 않는다.
- `source_channel`, `requested_at`, `today_date`는 클라이언트 입력값이 아니라 서버가 생성/덮어쓴다.
- 모든 테스트는 `SILVERLINK_DRY_RUN=true` 기준으로 외부 네트워크 의존 없이 동작해야 한다.
- 구현 진입 전 `node_modules/next/dist/docs/`에서 Next.js 16.2.9 Route Handler 관련 문서를 확인한다 (AGENTS.md 지침).
- 하위 테스크 단위로 구현 후 해당 테스크를 체크하고, 관련 테스트를 실행해 통과를 확인한다.
- 작업 하나가 끝날 때마다 이 파일에서 해당 항목의 `[ ]`를 `[x]`로 바꾼다.
- 작업 하나가 끝날 때마다 `docs/work-log.md`에 새 섹션(목표/내용/검증/변경 파일/커밋 여부)을 추가한다.

## 작업 목록 (Tasks)

- [ ] 0.0 기능 브랜치 생성
  - [ ] 0.1 `main` 기준 최신 상태 확인 (`git status`, `git pull` 필요 시)
  - [ ] 0.2 기능 브랜치 생성 (예: `feature/web-input-channel`)
  - [ ] 0.3 이후 모든 작업은 이 브랜치에서 진행

- [ ] 1.0 프로젝트 환경변수와 하네스 구조 설정
  - [x] 1.1 `zod`를 `package.json` 직접 의존성으로 추가
  - [x] 1.2 `vitest`(+ `jsdom`, `@vitejs/plugin-react`) 설치, `vitest.config.ts` 작성(e2e 디렉터리 제외), `package.json`에 `test` 스크립트 추가
  - [ ] 1.3 `@playwright/test` 설치, `playwright.config.ts` 작성(baseURL: 로컬 dev 서버), `package.json`에 `test:e2e` 스크립트 추가 (`playwright` 패키지/`test:e2e` 스크립트는 있으나 config 미작성 — 다음 슬라이스에서 진행)
  - [x] 1.4 `src/lib/silverlink/env.ts` 구현 — `getSilverLinkEnv()`로 `MAKE_WEBHOOK_URL`/`SILVERLINK_DRY_RUN`(기본값 `true`) 파싱. **변경**: fail-fast로 즉시 throw하지 않고 값을 그대로 반환하도록 단순화 (Slice 2 요구사항 #6 "URL 없으면 500 응답"을 만족하려면 import 시점에 throw하면 안 되고, 호출 시점에 route.ts/make-client.ts가 분기 처리해야 함). `server-only` 패키지는 미설치 — env.ts/make-client.ts가 API Route에서만 import되어 클라이언트 번들에 포함되지 않음을 코드 구조로 보장
  - [ ] 1.5 `.env.example`에 `MAKE_WEBHOOK_URL`, `SILVERLINK_DRY_RUN` 항목과 설명 주석 정리 (값은 마스킹)
  - [x] 1.6 `.gitignore`의 `.env*` 규칙으로 `.env.local`이 추적되지 않는지 재확인 (`.env.local`, `.env*.local` 규칙 존재, `git status`에 잡히지 않음 확인)

- [ ] 2.0 입력 스키마와 payload 생성 로직 구현
  - [x] 2.1 `src/lib/silverlink/schema.ts`: 사용자 입력 스키마 정의 (`sender_name`, `target_person`, `message` 필수/trim/빈 문자열 금지) — `target_person`은 `"아버지 테스트" | "어머니 테스트"` enum으로 구현 (최대 길이 제한은 이번 슬라이스 범위에서 제외, 필요 시 추후 추가)
  - [x] 2.2 `schema.ts`: 최종 payload 스키마 정의 (`source_channel` literal `"web"`, `requested_at` ISO datetime(+09:00 offset), `today_date` `YYYY-MM-DD`) — kakao 확장용 union화는 이번 슬라이스에서 보류 (YAGNI, 필요 시점에 추가)
  - [x] 2.3 `schema.ts`: `z.infer`로 `TaskRequestInput`, `TaskRequestPayload` 타입 export
  - [x] 2.4 `src/lib/silverlink/time.ts`: Asia/Seoul 기준 `requested_at`(ISO 8601, +09:00) 생성 함수 작성
  - [x] 2.5 `time.ts`: Asia/Seoul 기준 `today_date`(`YYYY-MM-DD`) 생성 함수 작성 — `Intl.DateTimeFormat(timeZone: "Asia/Seoul")` 사용으로 서버 로컬 타임존 무관하게 동작
  - [x] 2.6 `src/lib/silverlink/payload.ts`: `buildSilverLinkPayload(input, now?)` 구현 — 입력 검증 + 시간 생성 + `source_channel: "web"` 고정값을 합쳐 payload 생성, `now` 주입 가능

- [x] 3.0 서버 API Route와 Make Webhook 클라이언트 구현
  - [x] 3.1 `src/lib/silverlink/make-client.ts`: `fetch` 기반 POST 호출 함수 작성 (`MAKE_WEBHOOK_URL`, 최종 payload)
  - [x] 3.2 `make-client.ts`: 타임아웃 처리(`AbortController`, 10초) 및 네트워크/HTTP 오류 핸들링
  - [x] 3.3 `make-client.ts`: `SILVERLINK_DRY_RUN=true`일 때 실제 호출 생략, 구조화된 로그 + 모의 성공 응답 반환 분기 작성
  - [x] 3.4 `make-client.ts`: 호출 결과를 일관된 타입(`MakeWebhookResult` 판별 유니언: dryRun 성공/실제 성공/url 누락/호출 실패)으로 반환
  - [x] 3.5 `src/app/api/create-task/route.ts`: `POST` 핸들러 작성 — 요청 바디를 `buildSilverLinkPayload`(2.0의 입력 스키마 사용)로 파싱, 실패 시 400 + 필드별 에러(`issues`) 응답
  - [x] 3.6 `route.ts`: 성공 시 2.0의 payload 변환 → 3.1~3.4 make-client 호출 → 결과 응답 (`{ ok: true, dryRun: true, payload }` 또는 `{ ok: true, dryRun: false }`)
  - [x] 3.7 `route.ts`: make-client 실패 시 안전한 에러 메시지(내부 URL/스택 비노출) 응답 — `MAKE_WEBHOOK_URL` 누락은 500, 실제 호출 실패는 502로 구분

- [x] 4.0 웹 입력 폼 UI 구현
  - [x] 4.1 `src/components/task-request-form.tsx`: `sender_name`(텍스트, 기본값 "자녀 테스트"), `target_person`(select, "아버지 테스트"/"어머니 테스트"), `message`(textarea) 입력 필드 UI 작성
  - [x] 4.2 `message`가 빈 값이면 제출 차단 + 인라인 에러 표시 (사용자 시나리오상 `sender_name`은 기본값으로 항상 채워져 있고 `target_person`은 select로 항상 유효값이라 클라이언트 검증은 `message`만 필요)
  - [x] 4.3 제출 중 버튼 비활성화("전달하는 중...") + 성공(초록)/실패(빨강) 상태 배너(아이콘+텍스트, 색상에만 의존하지 않음) 처리
  - [x] 4.4 성공 시 `message` 필드 초기화 (`sender_name`/`target_person`은 연속 입력 편의를 위해 유지)
  - [x] 4.5 `src/app/page.tsx`에 폼 컴포넌트 연결 — 추가로 응답 payload 미리보기, 최근 보낸 요청(localStorage 최대 3개, `useSyncExternalStore`로 동기화) 구현

- [ ] 5.0 단위 테스트와 E2E 테스트 구현
  - [x] 5.1 `src/lib/silverlink/__tests__/schema.test.ts`: 유효 입력 통과, 필수값 누락/빈 문자열 실패 케이스
  - [x] 5.2 `src/lib/silverlink/__tests__/payload.test.ts`: 변환 결과에 `source_channel: "web"`, `requested_at`, `today_date`가 올바르게 포함되는지 검증
  - [ ] 5.3 `npm run test` 전체 통과 확인
  - [ ] 5.4 `tests/e2e/create-task.spec.ts`: `SILVERLINK_DRY_RUN=true` 환경에서 폼 작성 → 제출 → 성공 메시지 확인 플로우 작성
  - [ ] 5.5 `create-task.spec.ts`: 필수 필드 누락 시 에러 메시지 노출 플로우 작성
  - [ ] 5.6 `npm run test:e2e` 전체 통과 확인

- [ ] 6.0 실제 Make 연동 및 README 정리
  - [ ] 6.1 브라우저 네트워크 탭/번들에서 `MAKE_WEBHOOK_URL` 노출 여부 점검
  - [ ] 6.2 `SILVERLINK_DRY_RUN=false` + 테스트용 Webhook URL로 실제 호출 1회 점검 (Make 수신 여부만 확인, GPT/Airtable 이후 단계는 범위 밖)
  - [ ] 6.3 `README.md`에 실행 방법(`npm run dev`), 테스트 실행 방법(`test`, `test:e2e`), 환경변수 설정 안내 추가
  - [ ] 6.4 `docs/PRD-web-input.md` 10장(DoD)·11장(리스크) 체크리스트 최종 갱신
  - [ ] 6.5 기능 브랜치 커밋/푸시 및 필요 시 PR 생성 안내
