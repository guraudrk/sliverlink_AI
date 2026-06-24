# Work Log: SilverLink AI – Web Input Channel

작업(테스크/슬라이스)이 끝날 때마다 아래에 새 섹션을 추가한다. 최신 항목이 위로 오도록 역순으로 쌓는다.

---

## 2026-06-24 — Slice 2 후속 수정: API 응답 charset 누락으로 한글 깨짐

**증상**: 사용자가 Windows PowerShell `Invoke-RestMethod`로 `/api/create-task`를 호출했을 때 응답의 한글(`sender_name`, `target_person`, `message` 등)이 `ê¹ìë` 식으로 깨져서 출력됨.

**원인**: `NextResponse.json()`이 기본적으로 `Content-Type: application/json`만 설정하고 `charset`을 명시하지 않음. curl/브라우저는 charset이 없어도 JSON을 UTF-8로 간주하지만, Windows PowerShell 5.1의 `Invoke-RestMethod`/`Invoke-WebRequest`는 charset이 없으면 UTF-8이 아닌 인코딩(주로 ISO-8859-1)으로 응답 본문을 디코딩해 한글이 mojibake로 깨짐. 서버 버그는 아니지만 클라이언트 호환성을 위해 명시하는 것이 맞음.

**수정**: `src/app/api/create-task/route.ts`에 `jsonResponse()` 헬퍼를 추가해 모든 응답에 `Content-Type: application/json; charset=utf-8`을 명시. `NextResponse.json()` 대신 표준 `Response`를 직접 사용.

**검증**: `tsc --noEmit`/`eslint`/`vitest run`(15/15)/`npm run build` 모두 통과. `curl -i`로 응답 헤더에 `charset=utf-8`이 포함됨을 확인.

**변경 파일**: `src/app/api/create-task/route.ts`

**커밋**: 아직 안 함

---

## 2026-06-24 — Slice 2: POST /api/create-task Route Handler + Make Webhook 클라이언트 (task 3.0, 일부 1.4/1.6)

**목표**: Next.js Route Handler로 `POST /api/create-task`를 만들고, Dry Run 모드에서 실제 Make Webhook을 호출하지 않도록 한다.

**내용**:
- `src/lib/silverlink/env.ts`: `getSilverLinkEnv()` — `MAKE_WEBHOOK_URL`, `SILVERLINK_DRY_RUN`(기본값 `true`, `"false"`만 false로 처리)을 읽어 반환. import 시점에 throw하지 않음 (DRY_RUN=true일 때는 URL이 없어도 정상 동작해야 하므로).
- `src/lib/silverlink/make-client.ts`: `sendToMakeWebhook(payload)` —
  - `dryRun=true`: 실제 fetch 없이 로그만 남기고 `{ ok: true, dryRun: true, payload }` 반환
  - `dryRun=false` + URL 없음: `{ ok: false, error: "missing_webhook_url" }` 반환
  - `dryRun=false` + 호출: `AbortController`로 10초 타임아웃, 실패/non-2xx 시 `{ ok: false, error: "webhook_request_failed" }`, 성공 시 `{ ok: true, dryRun: false }`
- `src/app/api/create-task/route.ts`: `POST` 핸들러 — `request.json()` → `buildSilverLinkPayload()`(Slice 1) 검증 실패 시 400 + `issues` → `sendToMakeWebhook()` 결과에 따라 200/500/502 분기. `MAKE_WEBHOOK_URL`은 응답 어디에도 포함하지 않음.

**Next.js 16.2.9 확인 사항**: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `03-api-reference/03-file-conventions/route.md` 확인 — `POST(request: Request)` + `Response`/`NextResponse.json()` 표준 패턴이 그대로 적용됨, 이번 슬라이스에서 breaking change 영향 없음.

**수동 테스트 (dev 서버, 3개 환경 조합)**:
1. 기본 `.env.local`(`SILVERLINK_DRY_RUN=true`) → 정상 입력 시 200 `{ ok: true, dryRun: true, payload }`
2. 빈 `sender_name`/`message` + 허용 안 된 `target_person` → 400 `{ ok: false, error: "validation_failed", issues: [...] }`
3. `SILVERLINK_DRY_RUN=false` + `MAKE_WEBHOOK_URL=""` → 500 `{ ok: false, error: "missing_webhook_url" }`
4. `SILVERLINK_DRY_RUN=false` + 존재하지 않는 URL(`http://127.0.0.1:9/...`) → 502 `{ ok: false, error: "webhook_request_failed" }`

테스트 3·4는 실제 Make Webhook(.env.local의 운영 URL)을 호출하지 않도록 별도 포트(3001)의 임시 dev 서버에 환경변수를 오버라이드해서 진행했고, 종료 후 모두 정리함.

**검증**: `tsc --noEmit` 통과, `eslint .` 통과, `vitest run` 15/15 통과(기존 Slice 1 테스트, 변경 없음), `npm run build` 성공.

**건드리지 않음**: UI(`task-request-form.tsx`) — 다음 슬라이스 범위.

**변경 파일**: `src/lib/silverlink/env.ts`, `make-client.ts`, `src/app/api/create-task/route.ts`, `tasks/tasks-web-input.md`(체크박스 갱신)

**커밋**: 아직 안 함 (사용자가 나중에 한 번에 커밋하기로 함)

---

## 2026-06-24 — 빌드/테스트 에러 수정 (커밋 전)

**내용**: `tasks-web-input.md`의 특정 테스크는 아니고, 현재 코드베이스 점검 중 발견한 에러 2건 수정.

1. **Vitest가 Playwright e2e 스펙을 잘못 실행**
   - 증상: `npx vitest run` 시 `tests/e2e/create-task.spec.ts`(Playwright용 빈 placeholder)를 vitest 기본 글롭이 집어서 "No test suite found" 실패.
   - 수정: `vitest.config.ts` 신규 생성, `include: ["src/**/*.test.ts", "src/**/*.test.tsx"]`, `exclude: ["node_modules", "tests/e2e/**"]`로 범위 분리.
2. **`npm run build` 타입체크 실패**
   - 증상: `src/app/api/create-task/route.ts`가 빈 파일(0바이트)이라 Next.js 16.2.9 typed-routes 검증기가 "is not a module"로 빌드 실패.
   - 수정: 최소 placeholder(`export {}` + "task 3.0 구현 전" 주석)로 모듈화. 실제 핸들러 로직은 아직 구현하지 않음 (task 3.0에서 진행).

**검증**: `tsc --noEmit` 통과, `eslint .` 통과, `vitest run` 15/15 통과, `npm run build` 성공.

**변경 파일**: `vitest.config.ts`(신규), `src/app/api/create-task/route.ts`

**커밋**: 아직 안 함 (사용자가 나중에 한 번에 커밋하기로 함)

---

## 2026-06-23 — Slice 1: 입력 스키마와 payload 생성 로직 구현 (tasks 2.0, 5.1–5.2)

**목표**: SilverLink 웹 입력 payload의 스키마와 payload 생성 로직 작성.

**내용**:
- `src/lib/silverlink/schema.ts`: Zod로 사용자 입력 스키마(`taskRequestInputSchema`: `sender_name`/`target_person`/`message`)와 최종 payload 스키마(`taskRequestPayloadSchema`: 위 3개 + `source_channel` literal `"web"` + `requested_at` ISO datetime(+09:00) + `today_date` `YYYY-MM-DD`) 정의. `target_person`은 `"아버지 테스트" | "어머니 테스트"`만 허용.
- `src/lib/silverlink/time.ts`: `Intl.DateTimeFormat(timeZone: "Asia/Seoul")` 기반으로 서버 로컬 타임존과 무관하게 `requested_at`/`today_date`를 생성하는 `getRequestedAt()`, `getTodayDate()` 작성.
- `src/lib/silverlink/payload.ts`: `buildSilverLinkPayload(input, now?)` — 입력 검증 + 시간 생성 + `source_channel: "web"` 고정값을 합쳐 최종 payload를 만드는 순수 함수. `now`를 주입할 수 있어 테스트에서 시간을 고정 가능.
- 유닛 테스트 15건 작성 (`schema.test.ts`, `payload.test.ts`): 정상 입력 통과, 필수값 누락/빈 문자열 실패, `target_person` 허용값 검증, `source_channel`이 항상 `"web"`인지 등.
- 부수 수정: `package.json`에 중복으로 존재하던 `scripts` 키 두 개를 하나로 병합 (버그). `zod`/`vitest`/`playwright`/`jsdom` 의존성 확인.

**의도적으로 단순화한 부분** (추후 슬라이스에서 보강 가능):
- `sender_name`/`message` 최대 길이 제한 없음.
- `source_channel`을 `kakao` 확장용 union이 아닌 `"web"` literal로만 구현 (YAGNI, 카카오 채널 도입 시점에 확장).

**건드리지 않음**: UI(`task-request-form.tsx`), API Route(`app/api/create-task/route.ts`) — 다음 슬라이스 범위.

**검증**: `vitest run` 15/15 통과, `tsc --noEmit` 통과.

**변경 파일**: `src/lib/silverlink/schema.ts`, `time.ts`, `payload.ts`, `src/lib/silverlink/__tests__/schema.test.ts`, `payload.test.ts`, `package.json`, `tasks/tasks-web-input.md`(체크박스 갱신)

**커밋**: `a4dab07` (브랜치 `feature/web-input-channel`)
