# Tasks: Day 8 — Notification Queue & Delivery Adapter 기반 공사

기준 문서: `docs/PRD-day8-to-mvp-master-plan.md` 4장(Day 8), `tasks/tasks-member-parent-scoped-mvp.md`(Day6+7, 이번 챕터가 이어받는 RLS/repo/route 패턴의 출처)

## Relevant Files
- `docs/supabase-schema-member-scoped.sql` — `notification_queue`/`delivery_attempts` 테이블 + RLS 정책 추가(같은 파일에 이어서 작성, Day6+7과 동일 패턴)
- `src/lib/silverlink/delivery/schema.ts` (신규) — `channel`/`status`/`provider`/`call_goal` enum, `notificationQueueInputSchema`(Zod)
- `src/lib/silverlink/delivery/provider.ts` (신규) — `DeliveryProvider` 인터페이스 정의(추후 twilio/kakao_partner/sms_provider/vapi/retell가 같은 인터페이스로 교체될 수 있게)
- `src/lib/silverlink/delivery/mock-provider.ts` (신규) — `MockDeliveryProvider`, 항상 네트워크 호출 없이 가짜 성공/실패 결과만 반환
- `src/lib/supabase/notification-queue-repo.ts` (신규) — `createNotificationQueueEntry`, `listNotificationQueue(supabase, ownerUserId)` (`parent-profiles-repo.ts`/`care-tasks-repo.ts` 패턴 재사용)
- `src/lib/supabase/delivery-attempts-repo.ts` (신규) — `createDeliveryAttempt`
- `src/app/api/delivery/preview/route.ts` (신규) — 로그인 필수 + `care_task_id` 소유권 검증(`isOwnParentProfile`과 동일한 RLS 의존 패턴) → `notification_queue` insert → `MockDeliveryProvider` 호출 → `delivery_attempts` insert
- `src/app/(protected)/delivery-preview/page.tsx` (신규) — care_task 선택 → "미리보기 생성" → 큐/시도 결과 표시 UI, `voice_call` 채널도 선택 가능하게 표시
- `tests/e2e/delivery-preview.spec.ts` (신규, 가제) — 비로그인 리다이렉트 가드 1건(Day6+7의 `create-task.spec.ts` 재작성 패턴과 동일)
- `docs/work-log.md`, `tasks/tasks-day8-notification-queue.md` — 슬라이스별 기록/체크

## Notes
- **이번 Day의 핵심 원칙**: 알림을 절대 실제로 보내지 않는다. `MockDeliveryProvider`만 구현하고, 실제 `twilio`/`kakao_partner`/`sms_provider`/`vapi`/`retell` provider는 만들지 않는다(Day 12 이후 범위). 따라서 이번 Day에는 "실제 발송 on/off" 환경변수 플래그가 필요 없다 — 실제 provider가 생기는 시점(Day 12)에 `ENABLE_REAL_CALLS`/유사 플래그를 그때 도입한다.
- `owner_user_id` + `parent_id` 격리 원칙은 Day6+7과 동일하게 RLS로 강제한다. `notification_queue`/`delivery_attempts` 둘 다 4개 정책(select/insert/update/delete own)을 그대로 복붙해서 적용.
- `care_task_id`는 `care_tasks` FK이므로, `/api/delivery/preview`에서 소유권 검증은 "해당 `care_task_id`가 로그인한 회원의 `care_tasks`에 속하는지"를 RLS 기반 0건 체크로 확인한다(Day6+7의 `isOwnParentProfile`과 동일한 패턴 — `care-tasks-repo.ts`에 `isOwnCareTask` 같은 함수를 추가하는 형태가 될 가능성이 높음, 실제 구현은 Slice 진행 시 확정).
- `notification_queue.response_token`은 이번 Day에는 **생성만 하고 검증 로직은 만들지 않는다** — 실제 토큰 기반 응답 처리는 Day 9(`/r/[token]`)에서 구현.
- 회원 A/B 데이터 격리 테스트는 Day6+7에서 "모든 기능을 만들고 마지막에 한 번에" 하기로 결정되어 아직 미완료 상태([[project_silverlink_status]] 참고). 이번 Day8에서 새로 추가하는 두 테이블도 같은 마지막 일괄 테스트에 포함시킨다 — Day8 자체에서 별도 A/B 테스트를 새로 진행하지 않는다.
- 구현 진입 전 `node_modules/next/dist/docs/`에서 관련 Next.js 16.2.9 API(동적 라우트, Route Handler 등)를 확인한다(AGENTS.md 지침).
- 하위 테스크 단위로 구현 후 체크하고, 관련 테스트를 실행해 통과를 확인한다. 작업 하나가 끝날 때마다 `docs/work-log.md`에 새 섹션을 추가한다.
- 커밋·푸시는 사용자가 명시적으로 요청한 시점에만 수행한다. 다음 Slice는 사용자가 "Go"라고 입력한 뒤 진행한다.

## 작업 목록 (Tasks)

- [x] 1.0 `notification_queue` / `delivery_attempts` 스키마 + RLS 설계
  - [x] 1.1 `docs/supabase-schema-member-scoped.sql`에 이어서 `notification_queue` 테이블 SQL 작성 — `id`/`owner_user_id`/`parent_id`/`care_task_id`/`channel`/`message_text`/`response_token`/`status`/`scheduled_for`/`expires_at`/`created_at` + voice_call 확장 필드(`call_script`/`call_goal`/`max_attempts`/`preferred_call_window`). `care_task_id`는 not null로 결정(Day8 범위는 항상 특정 일정에 대한 알림만 다룸)
  - [x] 1.2 같은 파일에 `delivery_attempts` 테이블 SQL 작성 — `id`/`owner_user_id`/`parent_id`/`queue_id`/`provider`/`channel`/`request_payload`/`response_payload`/`status`/`external_message_id`/`error_code`/`error_message`/`attempted_at`
  - [x] 1.3 두 테이블 모두 RLS 활성화 + select/insert/update/delete own 정책 4개씩 작성(기존 `parent_profiles`/`care_tasks`/`message_logs` 정책과 동일한 `auth.uid() = owner_user_id` 패턴). 기존 테이블들과 일관되게 CHECK 제약은 넣지 않고 텍스트 + 주석 설명으로만 값 범위를 문서화(검증은 Zod에서)
  - [x] 1.4 사용자가 Supabase SQL Editor에서 직접 실행 완료(2026-06-25)
  - [x] 1.5 실행 후 "Success. No rows returned" 확인됨

- [x] 2.0 TypeScript 스키마 + Supabase repo 함수
  - [x] 2.1 `src/lib/silverlink/delivery/schema.ts`: `DELIVERY_CHANNEL_OPTIONS`/`CALL_GOAL_OPTIONS` Zod enum + `notificationQueueInputSchema`(`parent_id`/`owner_user_id`는 서버가 derive하므로 입력 스키마에 없음). `src/lib/silverlink/delivery/response-token.ts`: `generateResponseToken()`(node:crypto `randomBytes(24)` base64url, Day8은 생성만 함)
  - [x] 2.2 `src/lib/supabase/notification-queue-repo.ts`: `createNotificationQueueEntry(supabase, ownerUserId, parentId, responseToken, input)`, `listNotificationQueue(supabase)` — `parent-profiles-repo.ts` 패턴 재사용
  - [x] 2.3 `src/lib/supabase/delivery-attempts-repo.ts`: `createDeliveryAttempt(supabase, input)`
  - [x] 2.4 (계획보다 위치 변경) 스키마 검증 테스트 7건은 `src/lib/silverlink/delivery/__tests__/schema.test.ts`에 작성. 추가로 `care-tasks-repo.ts`에 `getOwnCareTask(supabase, careTaskId)`(소유권 확인 + parent_id 조회를 한 쿼리로) 신설하고 스텁 클라이언트 테스트 3건 추가 — `isOwnParentProfile`처럼 boolean만 반환하면 `/api/delivery/preview`에서 parent_id를 얻으려 쿼리를 한 번 더 해야 해서, 행 자체(또는 null)를 반환하도록 설계를 변경함(tasks 파일 4.1의 `isOwnCareTask`라는 이름에서 변경)

- [x] 3.0 MockDeliveryProvider
  - [x] 3.1 `src/lib/silverlink/delivery/provider.ts`: `DeliveryProvider` 인터페이스(`send(request): Promise<DeliveryResult>`) 정의
  - [x] 3.2 `src/lib/silverlink/delivery/mock-provider.ts`: `MockDeliveryProvider`가 `DeliveryProvider`를 구현 — fetch 등 외부 호출 import 없이 항상 `status: "sent"` 가짜 결과만 반환
  - [x] 3.3 Vitest 2건 작성 — `npx vitest run` 58/58 통과(기존 46 + 신규 12), `npm run build`도 통과

- [x] 4.0 `/api/delivery/preview` 구현
  - [x] 4.1 (2.4에서 먼저 처리) `care-tasks-repo.ts`에 `getOwnCareTask(supabase, careTaskId)` 추가 — boolean 대신 행을 반환하도록 설계 변경(이유는 2.4 참고)
  - [x] 4.2 `src/app/api/delivery/preview/route.ts`: 로그인 필수(401) → 입력 검증(Zod, 400) → `getOwnCareTask` 확인(403 `care_task_not_found`) → `notification_queue` insert(`status: "prepared"`, 토큰 생성) → `MockDeliveryProvider.send()` 호출 → `delivery_attempts` insert → 응답으로 `queue`/`deliveryAttemptId`/`deliveryStatus` 반환
  - [x] 4.3 Vitest는 스키마(`schema.test.ts`)와 `getOwnCareTask`(`care-tasks-repo.test.ts`) 레이어에서 커버 — `create-task/route.ts`도 라우트 자체 단위 테스트가 없는 기존 패턴과 동일하게 라우트 핸들러 자체 테스트는 작성하지 않고 6.0의 수동 테스트로 검증

- [x] 5.0 `/delivery-preview` UI
  - [x] 5.0a (계획에 없던 선행 작업) `care_tasks` 목록 API가 아예 없어서 새로 추가: `care-tasks-repo.ts`에 `listCareTasks(supabase)` + `src/app/api/care-tasks/route.ts`(GET, `/api/parents` GET과 동일 패턴) 신설
  - [x] 5.1 `src/app/(protected)/delivery-preview/page.tsx`: `(protected)` 그룹에 배치(비로그인 시 자동 `/login` redirect)
  - [x] 5.2 `src/components/delivery/delivery-preview-form.tsx`: 로그인 사용자의 `care_tasks` 목록에서 선택 → 채널 선택(`link`/`sms`/`kakao_alimtalk`/`voice_call`/`web_push`, voice_call도 동일하게 노출) → 메시지 내용(선택) → "미리보기 생성" 버튼
  - [x] 5.3 생성 결과(큐/시도 응답 JSON 전체)를 `task-request-form.tsx`와 동일한 톤의 "응답 미리보기" 패널에 표시
  - [x] 5.4 `(protected)/layout.tsx`의 공용 대시보드 네비게이션이 라우트 그룹 전체에 적용되는 구조라 추가 작업 없이 `/delivery-preview`에도 자동 적용됨(확인됨)
  - [x] (검증) `npx vitest run` 58/58, `npm run build` 통과(신규 라우트 `/api/care-tasks`, `/delivery-preview` 정상 생성 확인)

- [x] 6.0 테스트/문서화 (전부 완료)
  - [x] 6.1 `npx vitest run` 58/58 통과 (Day4+5+6+7+8 누적)
  - [x] 6.2 `npm run build` 통과 확인
  - [x] 6.3 수동 테스트 **최종 확인 완료(2026-06-25)**: 로그인 후 `/delivery-preview`에서 미리보기 생성 → Supabase Table Editor에서 `notification_queue`/`delivery_attempts`에 정확히 저장된 것까지 사용자가 직접 확인
  - [x] 6.4 `docs/work-log.md`에 Day 8 섹션 추가(목표/만든 것/검증/변경 파일)
  - [x] 6.5 `tasks/tasks-member-parent-scoped-mvp.md`의 8.7(향후 백로그: `notification_queue`/`delivery_attempts`)을 "Day8에서 구현 완료"로 갱신
