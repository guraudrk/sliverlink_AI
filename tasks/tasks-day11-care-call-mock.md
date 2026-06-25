# Tasks: Day 11 — AI 비서 안부전화 Mock MVP

기준 문서: `docs/PRD-day8-to-mvp-master-plan.md` 7장(Day 11)

## Relevant Files
- `docs/supabase-schema-member-scoped.sql` — Day11 섹션: `care_call_schedules`, `care_call_attempts` 테이블 + RLS(둘 다 일반 RLS, Day9 같은 SECURITY DEFINER 함수는 불필요 — 이유는 Notes 참고)
- `src/lib/silverlink/calls/schema.ts` (신규) — `ATTEMPT_RESPONSE_OPTIONS`(`completed`/`help_requested`/`no_answer`), `respondCallAttemptInputSchema`, `createCallAttemptInputSchema`
- `src/lib/silverlink/calls/call-script-builder.ts` (신규) — `buildCallScript(profile, careTask)`: 키워드 기반으로 `call_goal` 추론(약→medication_check, 식사→meal_check, 그 외 wellbeing_check) 후 opening/main_message/question 조립. 실제 LLM 호출 없음(Day5 code-first 원칙과 동일)
- `src/lib/supabase/parent-profiles-repo.ts` — `getParentProfileById(supabase, id)` 추가
- `src/lib/supabase/care-call-attempts-repo.ts` (신규) — `createCareCallAttempt`, `getOwnCareCallAttempt`, `updateCareCallAttempt`, `listCareCallAttempts`
- `src/app/api/care-calls/route.ts` (신규, GET) — 내 안부전화 시도 목록
- `src/app/api/care-calls/preview/route.ts` (신규, POST) — care_task 선택 → 스크립트 생성 → `prepared` 상태로 저장
- `src/app/api/care-calls/[attemptId]/start/route.ts` (신규, POST) — Mock 전화 실행 → `answered`로 전환
- `src/app/api/care-calls/[attemptId]/respond/route.ts` (신규, POST) — 어르신 응답 시뮬레이션(완료/도움필요/무응답) → 최종 상태 + risk_level 저장, 필요시 `care_tasks` 갱신
- `src/app/(protected)/dashboard/calls/page.tsx`, `src/components/calls/care-call-panel.tsx` (신규) — Mock UI
- `src/app/(protected)/dashboard/page.tsx` — 허브에 "안부전화(Mock)" 링크 추가

## Notes
- **Day9와의 차이(왜 SECURITY DEFINER가 필요 없는가)**: Day9의 `/r/[token]`은 실제 어르신(비로그인, 익명)이 누른다. Day11의 "Mock 전화"는 **로그인한 자녀 본인이 화면에서 어르신 응답을 시뮬레이션 버튼으로 대신 누르는 것**이라, 호출자가 이미 인증된 회원이다 — 그냥 평소처럼 RLS(`auth.uid() = owner_user_id`)로 충분하고 새 SQL 함수가 필요 없다.
- `call_script`는 실제 LLM을 호출하지 않고 결정론적 템플릿으로 생성한다(Day5 "code-first" 원칙과 동일 — 비용 발생 없는 로컬 로직으로 먼저 검증). 마스터플랜 13장의 RAG 프롬프트 설계는 추후 실제 LLM을 붙일 때를 위한 참고용으로만 남겨두고, 이번엔 구현하지 않는다.
- **`care_call_schedules`는 테이블+RLS만 만들고 관리 UI는 만들지 않는다** — 반복 일정 트리거(매일 오전 9시 등)는 실제 cron/스케줄러가 필요한데 그건 Day12 이후(Scripted IVR) 범위와 맞물려 있어, 지금 UI를 만들면 아무도 안 쓰는 빈 폼이 된다. 이번 Day는 "즉석 Mock 통화 1건"의 전체 플로우 검증에 집중한다.
- `/dashboard/calls`는 Day10에서 "테이블이 없어서" 미뤘던 페이지다 — 이번에 `care_call_attempts`가 생기므로 여기서 만든다.
- 도움 필요(`status = 'help_requested'`)는 Day10과 동일하게 호박색 배지로만 강조하고 응급 신고처럼 보이지 않게 한다.
- 회원 A/B 격리 테스트는 여전히 Day6+7 챕터의 마지막 일괄 테스트로 미룬다.
- 커밋·푸시는 사용자가 명시적으로 요청한 시점에만 수행한다.

## 작업 목록 (Tasks)

- [x] 1.0 `care_call_schedules` / `care_call_attempts` 스키마 + RLS
  - [x] 1.1 `docs/supabase-schema-member-scoped.sql`에 Day11 섹션 추가 — 두 테이블 + RLS 4정책씩
  - [x] 1.2 사용자가 Supabase SQL Editor에서 직접 실행 완료(2026-06-25)
  - [x] 1.3 실행 후 "Success" 확인됨, 오류 없음

- [x] 2.0 TypeScript 스키마 + call script builder
  - [x] 2.1 `src/lib/silverlink/calls/schema.ts`: `ATTEMPT_RESPONSE_OPTIONS` + 두 입력 스키마
  - [x] 2.2 `src/lib/silverlink/calls/call-script-builder.ts`: `inferCallGoal`(키워드 기반, `delivery/schema.ts`의 `CALL_GOAL_OPTIONS` 재사용) + `buildCallScript` + `formatCallScriptText`
  - [x] 2.3 Vitest 5건 작성 — `npx vitest run` 66/66 통과(기존 61 + 신규 5)

- [x] 3.0 repo 함수
  - [x] 3.1 `parent-profiles-repo.ts`에 `getParentProfileById(supabase, id)` 추가. `care-tasks-repo.ts`의 `CareTaskRow`/`getOwnCareTask`에 `original_request`도 같이 select하도록 확장(call_script 생성에 필요), `updateCareTaskStatus` 신설
  - [x] 3.2 `src/lib/supabase/care-call-attempts-repo.ts`: `createCareCallAttempt`, `getOwnCareCallAttempt`(RLS 0건 체크, `getOwnCareTask`와 동일 패턴), `updateCareCallAttempt`, `listCareCallAttempts`

- [x] 4.0 API 라우트
  - [x] 4.1 `POST /api/care-calls/preview`: care_task 소유권 확인 → 부모님 프로필 조회 → `buildCallScript` → `care_call_attempts` insert(`status: "prepared"`)
  - [x] 4.2 `POST /api/care-calls/[attemptId]/start`: 소유권 확인 → `prepared`가 아니면 409 → `status: "answered"`, `started_at` 기록
  - [x] 4.3 `POST /api/care-calls/[attemptId]/respond`: 액션별로 `status`/`parent_response`/`risk_level`/`ended_at` 갱신, `help_requested`/`completed`면 연결된 `care_tasks.status`도 갱신(`child_notified`는 계획에 있었지만 이번 라우트에서는 적용하지 않음 — care_tasks 갱신용 `updateCareTaskStatus`를 단순하게 유지하려고 범위를 좁혔고, Day9의 SQL 함수만큼 필드를 다 건드리진 않음. 필요해지면 추후 보강)
  - [x] 4.4 `GET /api/care-calls`: 내 안부전화 시도 목록. `npx vitest run` 66/66, `npm run build` 통과(라우트 4개 정상 생성)

- [x] 5.0 `/dashboard/calls` Mock UI
  - [x] 5.1 일정 선택 → "안부전화 미리보기 생성" → 생성된 스크립트 표시
  - [x] 5.2 "Mock 전화 실행" → 완료/도움 필요/무응답 시뮬레이션 버튼 3개 표시
  - [x] 5.3 과거 시도 목록(상태 배지, `help_requested`는 호박색 강조 문구)
  - [x] 5.4 대시보드 허브에 "안부전화(Mock)" 링크 추가

- [x] 6.0 테스트/문서화 (6.2만 1.2 SQL 실행 + 사용자 수동 확인 대기)
  - [x] 6.1 `npx vitest run` 66/66, `npm run build` 통과 확인(라우트 5개 정상 생성)
  - [x] 6.2 수동 테스트 **최종 확인 완료(2026-06-25)**: 미리보기 생성 → Mock 전화 실행 → 응답 시뮬레이션까지 오류 없이 정상 동작
  - [x] 6.3 `docs/work-log.md`에 Day 11 섹션 추가
