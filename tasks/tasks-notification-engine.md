# Tasks: SilverLink AI – Notification Preparation Engine (Code-First)

기준 문서: `docs/PRD-notification-engine-code-first.md`

## Relevant Files
- `data/fixtures/care-tasks.day5.json` — 로컬 fixture 데이터 5건 (실제 Airtable/부모님 데이터 아님)
- `src/lib/silverlink/notifications/schema.ts` — `careTaskSchema` / `CareTask` 타입 정의
- `src/lib/silverlink/notifications/due-task.ts` — due task 판단 로직 (`isDueTask`)
- `src/lib/silverlink/notifications/message-builder.ts` — outbound 메시지 생성 로직 (`buildOutboundMessage`)
- `src/lib/silverlink/notifications/notification-engine.ts` — 알림 준비 로직 (`prepareNotification`/`prepareNotifications`)
- `src/lib/silverlink/notifications/__tests__/due-task.test.ts` — due task 판단 로직 Vitest 테스트
- `src/lib/silverlink/notifications/__tests__/message-builder.test.ts` — outbound 메시지 생성 Vitest 테스트
- `src/lib/silverlink/notifications/__tests__/notification-engine.test.ts` — 알림 준비 로직 Vitest 테스트
- `src/app/api/notifications/prepare/route.ts` — Dry Run `GET` API Route
- `src/lib/silverlink/notifications/fixture.ts` — fixture JSON 로드 + 검증 (`loadCareTaskFixtures`)
- `src/app/notifications/page.tsx` — 알림 준비 미리보기 화면
- `src/components/notification-preview-panel.tsx` — 미리보기 패널 (버튼/배너/카드 목록)
- `src/lib/silverlink/notifications/__tests__/fixture.test.ts` — fixture 로드/검증 Vitest 테스트
- `src/lib/silverlink/target-person.ts` — `TARGET_PERSON_OPTIONS` 단독 모듈 (6.0에서 분리, 이유는 6.0 항목 참고)
- `src/lib/silverlink/schema.ts` — `TARGET_PERSON_OPTIONS`를 `target-person.ts`에서 가져와 재수출(re-export)하도록 수정 (기존 사용처 호환 유지)
- `tests/e2e/notification-preview.spec.ts` — 관리자 preview 화면 Playwright E2E 테스트 (다음 작업에서 필요 시 추가)
- `docs/work-log.md` — 작업(테스크) 완료 시마다 누적되는 작업 로그
- `docs/PRD-notification-engine-code-first.md` — "구현 완료 범위" 섹션 추가 대상

## Notes
- 이 단계의 구현 범위는 "due task 판단 → outbound 메시지 후보 생성 → care_tasks patch 미리보기"까지다. **Make/카카오톡 호출, 실제 메시지 발송, 실제 Airtable 읽기/쓰기, 실제 부모님(어르신) 데이터 사용은 전부 범위 밖**이며, 구현 중 어떤 단계에서도 이를 호출하지 않는다.
- 모든 로직은 **로컬 fixture 데이터**를 기준으로 동작한다 (1.0에서 생성).
- Dry Run API(`/api/notification-engine/preview`)는 항상 미리보기만 반환한다 — 실제 실행 경로 자체가 없다.
- 구현 진입 전 `node_modules/next/dist/docs/`에서 Next.js 16.2.9 Route Handler 관련 문서를 확인한다 (AGENTS.md 지침).
- 하위 테스크 단위로 구현 후 해당 테스크를 체크하고, 관련 Vitest 테스트를 실행해 통과를 확인한다.
- 작업 하나가 끝날 때마다 이 파일에서 해당 항목의 `[ ]`를 `[x]`로 바꾼다.
- 작업 하나가 끝날 때마다 `docs/work-log.md`에 새 섹션(목표/내용/검증/변경 파일/커밋 여부)을 추가한다.
- 커밋·푸시는 사용자가 명시적으로 요청한 시점에만 수행한다.

## 작업 목록 (Tasks)

- [ ] 0.0 기능 브랜치 생성
  - [ ] 0.1 `main` 기준 최신 상태 확인
  - [ ] 0.2 기능 브랜치 생성 (`feature/notification-engine`)
  - [ ] 0.3 병합 방식은 사용자 결정에 따름 (Day4 사례 참고: 초반 슬라이스는 브랜치, 이후 `main`에서 직접 작업으로 전환 가능)

- [x] 1.0 테스트용 care_tasks fixture 설계 — 계획했던 `src/lib/notification-engine/fixtures/*.ts` 대신 사용자가 직접 `data/fixtures/care-tasks.day5.json`(순수 JSON)으로 작성
  - [x] 1.1 fixture 필드를 PRD 5장의 가정(`message`/`due_at`/`category`)이 아니라 실제로 받은 구조(`id`/`task_title`/`task_type`/`target_person`/`task_datetime`/`status`/`priority`/`confirmation_message`/`parent_notified`/`notification_status`/`source_channel`)로 확정 — 이후 2.0/3.0의 `CareTask` 타입이 이 구조를 따름
  - [x] 1.2 5가지 케이스 포함 확인: 지금 알림 대상 2건(복약/식사확인) / 미래 예정 1건(산책) / 이미 발송됨 1건(영양제, `parent_notified:true`) / 완료됨 1건(병원방문, `status:"completed"`)
  - [x] 1.3 `target_person`은 "아버지 테스트"/"어머니 테스트"만 사용, 실제 개인정보 미포함 확인
  - [x] 1.4 fixture 형태 자체에 대한 별도 Vitest(`fixtures.test.ts`)는 작성하지 않음 — 2.0/3.0의 테스트가 동일 구조의 객체를 직접 사용해 간접 검증되므로 중복 테스트로 보류 (YAGNI)

- [x] 2.0 due task 판단 로직 구현 — 경로를 `src/lib/silverlink/notifications/`로 확정 (Day4 `src/lib/silverlink/` 네이밍과 일관성 유지)
  - [x] 2.1 `src/lib/silverlink/notifications/schema.ts`: `careTaskSchema`/`CareTask` 타입 정의 — fixture(`data/fixtures/care-tasks.day5.json`) 필드(`id`/`task_title`/`task_type`/`target_person`/`task_datetime`/`status`/`priority`/`confirmation_message`/`parent_notified`/`notification_status`/`source_channel`)에 맞춤. `target_person`은 기존 `TARGET_PERSON_OPTIONS` 재사용
  - [x] 2.2 `src/lib/silverlink/notifications/due-task.ts`: `isDueTask(task, now)` 순수 함수 작성 — `status === "scheduled"`, `parent_notified === false`, `task_datetime` 존재, `task_datetime <= now` 4가지 조건 모두 만족해야 due
  - [x] 2.3 `src/lib/silverlink/notifications/__tests__/due-task.test.ts`: Vitest 테스트 작성 (이전/같음 → due, completed/parent_notified true/미래/누락 → 제외, 총 6케이스)
  - [x] 2.4 `npm run test` 실행해 전체 21/21 통과 확인 (tsc/eslint 클린)
  - 비고: 여러 task를 한 번에 걸러 정렬하는 `findDueTasks`(목록 단위)는 이번 슬라이스 범위에서 보류 — 이번엔 `isDueTask` 단일 판단 함수만 구현 (사용자 지시: "due task detection only")

- [x] 3.0 outbound message 및 update patch 생성 로직 구현 — 경로를 `src/lib/silverlink/notifications/`로 확정, PRD 7~8장 구조를 실제 요구사항의 필드명(`outboundLogCandidate`/`taskUpdatePatch`)에 맞춰 구현
  - [x] 3.1 `src/lib/silverlink/notifications/message-builder.ts`: `buildOutboundMessage(task)` 작성 — `confirmation_message`가 있으면 그대로 사용, 없으면 `task_title`+`target_person` 기반 fallback 문구 생성 (GPT/Make 호출 없음). `careTaskSchema.confirmation_message`를 `optional()`로 변경해 fallback 케이스를 표현 가능하게 함
  - [x] 3.2 `src/lib/silverlink/notifications/notification-engine.ts`: `prepareNotification(task, now)` 작성 — `isDueTask`로 due가 아니면 `null` 반환, due면 `{ taskId, outboundLogCandidate: { direction:"outbound", status:"prepared", source_channel:"system", receiver, raw_message, related_task }, taskUpdatePatch: { parent_notified:true, notification_status:"prepared", last_notification_at } }` 반환. `status`/`notification_status`는 항상 `"prepared"`(실제 발송 전이므로 `"sent"` 금지). `last_notification_at`은 Day4 `time.ts`의 `getRequestedAt(now)` 재사용으로 Asia/Seoul ISO(+09:00) 문자열 생성
  - [x] 3.3 `notification-engine.ts`: `prepareNotifications(tasks, now)` 작성 — 각 task에 `prepareNotification` 적용 후 `null`(미래/완료/이미발송) 제외하고 due task 후보만 반환
  - [x] 3.4 `src/lib/silverlink/notifications/__tests__/message-builder.test.ts`: `confirmation_message` 있음/없음(fallback) 2케이스
  - [x] 3.5 `src/lib/silverlink/notifications/__tests__/notification-engine.test.ts`: due 복약 task 생성, 미래/이미발송/완료 task 스킵(`null`), fallback 메시지 반영, `status`가 항상 `"prepared"`, `prepareNotifications` 목록 필터링 — 총 7케이스
  - [x] 3.6 `npm run test` 실행해 전체 30/30 통과 확인 (tsc/eslint 클린)

- [x] 4.0 Dry Run API Route 구현 — 경로를 `src/app/api/notifications/prepare/route.ts`로, 응답 형태를 `{ ok, dryRun, count, candidates }`로 확정 (실제 요구사항 기준, PRD 9장 초안과 필드명 다름)
  - [x] 4.1 `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` 확인 — `GET` 핸들러는 기본적으로 캐시되지 않음(opt-in 캐시만 `dynamic = "force-static"`으로 가능), 이번 라우트는 매 요청마다 `new Date()`를 쓰므로 기본 동작(캐시 안 함)이 그대로 맞음
  - [x] 4.2 `src/lib/silverlink/notifications/fixture.ts`: `loadCareTaskFixtures()` — `data/fixtures/care-tasks.day5.json`을 `resolveJsonModule`로 직접 import 후 `careTaskSchema.array().parse()`로 검증된 `CareTask[]` 반환
  - [x] 4.3 `src/app/api/notifications/prepare/route.ts`: `GET` 핸들러 작성 — `loadCareTaskFixtures()`(4.2) → `prepareNotifications(tasks, new Date())`(3.0) → `{ ok: true, dryRun: true, count, candidates }` 응답. Day4 `jsonResponse` 헬퍼 패턴 그대로 재사용해 `charset=utf-8` 명시
  - [x] 4.4 쿼리 파라미터 `now` 오버라이드는 이번 요구사항에 없어 구현하지 않음 — 필요해지면 6.7 백로그에서 추가 검토
  - [x] 4.5 코드 리뷰 관점에서 이 라우트와 `fixture.ts`/`notification-engine.ts`에 Make/Kakao/Airtable 관련 import나 외부 호출이 전혀 없는지 확인 — 없음
  - [x] 4.6 수동 테스트: `npm run dev`로 임시 포트(3010) 기동 후 `curl GET /api/notifications/prepare` 호출 — `count:2`, `task_001`/`task_002`만 후보로 포함, `task_003`(미래)/`task_004`(이미발송)/`task_005`(완료)는 제외됨을 확인. 응답 `Content-Type: application/json; charset=utf-8` 확인

- [x] 5.0 관리자 preview UI 구현 — 경로를 `src/app/notifications/page.tsx`(+`src/components/notification-preview-panel.tsx`)로 확정 (`/admin/notifications`가 아니라 `/notifications`)
  - [x] 5.1 `src/app/notifications/page.tsx`: Day4 `page.tsx`와 동일한 레이아웃(상단 타이틀/설명) + `NotificationPreviewPanel` 배치
  - [x] 5.2 `src/components/notification-preview-panel.tsx`: "알림 후보 불러오기" 버튼 — 클릭 시 `GET /api/notifications/prepare` 호출 (자동 새로고침 버튼은 없음, 클릭으로만 재호출 — "지금 기준으로 다시 확인"과 동일 동작을 버튼 재클릭으로 수행)
  - [x] 5.3 후보별 카드 UI — task title, 받는 분(`receiver`), outbound `raw_message`를 카드로 표시
  - [x] 5.4 카드 하단에 `notification_status: prepared`와 "parent_notified → true (예정, 아직 적용 안 됨)" 배지로 patch 미리보기 표시 — 응답 JSON 원본을 그대로 `<pre>`로 보여주는 대신 사람이 읽기 쉬운 카드로 가공 (Day4의 `<pre>` 응답 미리보기보다 보호자/관리자가 보기 편한 형태 우선)
  - [x] 5.5 화면 상단에 amber 색상 안내 배너로 "Dry Run / Preview 모드, 실제 발송/저장 없음" 고정 표시 (로딩 전/후 항상 보임), 발송/적용 버튼 자체가 컴포넌트에 없음
  - [x] 5.6 디자인 톤을 Day4와 동일하게 유지 (Pretendard, slate/blue 팔레트, `CheckIcon`/`AlertIcon`과 같은 패턴의 `InfoIcon` 추가)
  - [x] 5.7 수동 테스트: 임시 포트(3011)에서 Playwright 스크립트로 실제 브라우저 동작 확인 — 배너 노출, 버튼 클릭 → "총 2건의 알림 후보를 찾았어요", 카드 제목(`혈압약 복용`/`점심 식사 확인`), `raw_message`, `notification_status: prepared` 배지 정상 표시, `localhost:3011` 외 외부 네트워크 요청 0건 확인

- [x] 6.0 테스트 보강 (1차) — `npm test`/`npm run build` 통과를 성공 기준으로 진행, Playwright E2E(6.2/6.3)는 이번 차수에서는 보류
  - [x] 6.1 신규 Vitest 테스트 추가: `src/lib/silverlink/notifications/__tests__/fixture.test.ts`(fixture JSON이 `careTaskSchema`로 5건 정상 로드되는지, `task_004`/`task_005`의 플래그가 의도대로 들어있는지 3케이스) + `message-builder.test.ts`에 2케이스 보강(`confirmation_message`가 빈 문자열일 때 fallback, 다른 `target_person`도 정확히 반영되는지). `npm run test` 35/35 통과(due task 6 + message-builder 4 + notification-engine 7 + fixture 3 + Day4 schema/payload 15)
  - [x] 6.1a **(예상 못 한 발견) `npm run build` 실패 — Turbopack + zod `.datetime()` 충돌 버그**: API route가 1개(`/api/create-task`)였을 때는 빌드가 됐지만, 2번째 라우트(`/api/notifications/prepare`)가 추가되자 `ReferenceError: Cannot access 'am' before initialization`로 `next build`(프로덕션 빌드, Turbopack)가 깨졌다. `git stash`로 Day4 커밋 시점과 비교하며 라우트/모듈을 하나씩 제거·복원하는 방식으로 원인을 좁혔다 — `src/lib/silverlink/notifications/schema.ts`가 `target_person` enum 값을 재사용하려고 Day4의 `src/lib/silverlink/schema.ts`에서 `TARGET_PERSON_OPTIONS`를 import했는데, 그 파일에 있는 `z.string().datetime({ offset: true })`(`requested_at` 검증용)까지 같이 끌려 들어가 두 라우트가 같은 공유 청크에 묶이면서 Turbopack이 그 청크를 잘못된 순서로 평가하는 버그였다(zod v4 + Turbopack 조합 문제, 코드 자체의 논리 오류는 아님)
  - [x] 6.1b 위 버그를 근본적으로 해결: `TARGET_PERSON_OPTIONS`를 `src/lib/silverlink/target-person.ts`라는 단독 모듈로 분리하고, `src/lib/silverlink/schema.ts`는 거기서 import해 그대로 재수출(re-export)(기존 `task-request-form.tsx` 등 사용처는 변경 없음), `src/lib/silverlink/notifications/schema.ts`도 `target-person.ts`를 직접 import하도록 변경 — 이제 두 라우트의 공유 그래프에 `.datetime()` 코드가 섞이지 않아 빌드 통과
  - [x] 6.1c `npm run build` 통과 확인 (`/`, `/notifications` 정적, `/api/create-task`, `/api/notifications/prepare` 동적으로 정상 라우트 목록에 표시), `tsc --noEmit`/`eslint .` 0 에러, `npm test` 재실행 35/35 통과(회귀 없음)
  - [ ] 6.2 `tests/e2e/notification-preview.spec.ts`: 관리자 preview 화면 진입 시 fixture 기반 결과가 렌더링되는지, 실제 발송/적용 버튼이 화면에 없는지 확인하는 Playwright E2E 테스트 작성 (다음 작업에서 진행)
  - [ ] 6.3 `npm run test:e2e` 전체 통과 확인 (다음 작업에서 진행)
  - [ ] 6.4 수동 검증: 브라우저 네트워크 탭에서 `/notifications` 및 `/api/notifications/prepare` 호출 시 Make/Kakao/Airtable로 나가는 외부 요청이 전혀 없는지 확인 (Slice 5에서 Playwright로 1차 확인했으나, 6.2 E2E로 정식 회귀 테스트화는 다음 작업에서 진행)
  - [x] 6.5 `docs/work-log.md`에 Day5 Slice 6 섹션 추가 (목표/내용/검증/변경 파일/AI 활용 팁/커밋 여부)
  - [ ] 6.6 `docs/PRD-notification-engine-code-first.md`에 "구현 완료 범위" 섹션 추가 (Day4 PRD와 동일한 패턴)
  - [ ] 6.7 향후 연동 백로그 정리 (PRD 12장과 연결) — Airtable 실제 read/write 연동, Kakao 실제 발송 연동(+ `KAKAO_DRY_RUN` 스위치 도입), Make 역할 재정의, `message_logs` outbound 기록, 부모님 "완료" 응답 처리, 멱등성/중복 발송 방지 설계를 백로그 항목으로 명시
