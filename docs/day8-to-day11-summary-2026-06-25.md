# 2026-06-25 작업 요약 — Day 8~11 (알림 큐 → 링크 응답 → 대시보드 → 안부전화 Mock)

이 문서는 2026-06-25 하루 동안 진행한 Day 8~11 작업을 외부 공유/아카이브용으로 한 파일에 정리한 것이다. 각 Day는 PRD(`docs/PRD-day8-to-mvp-master-plan.md`) → tasks 파일(`tasks/tasks-day{N}-*.md`) → "Go" → Slice 단위 구현 → 사용자 수동 검증 → 커밋/푸시 순서로 진행했다.

---

## Day 8 — Notification Queue & Delivery Adapter (`/delivery-preview`)

### 목표
알림을 실제로 보내지 않고, 먼저 "보낼 메시지 대기열"(`notification_queue`)과 "발송 시도 기록"(`delivery_attempts`)을 만든다.

### 만든 것
- **테이블 2개 + RLS**: `notification_queue`(채널/메시지/토큰/상태/만료시각 + voice_call 확장 필드), `delivery_attempts`(provider/요청·응답 payload/상태) — 둘 다 기존 테이블과 동일한 `auth.uid() = owner_user_id` 4정책 패턴
- **`MockDeliveryProvider`**: 실제 네트워크 호출이 전혀 없는 가짜 발송기. `DeliveryProvider` 인터페이스를 정의해 추후 실제 Twilio/카카오 Provider로 교체 가능하게 설계
- **`POST /api/delivery/preview`**: 로그인 필수 → `care_task_id` 소유권 검증(RLS 0건 체크) → 큐 insert → Mock 발송 → 시도 insert
- **`/delivery-preview` 페이지**: 일정 선택 → 채널 선택(`link`/`sms`/`kakao_alimtalk`/`voice_call`/`web_push`) → "미리보기 생성"

### 설계 변경(계획 대비)
- tasks 파일은 `isOwnCareTask`(boolean)를 가정했지만, 라우트가 parent_id를 바로 써야 해서 `getOwnCareTask`가 행 자체(또는 null)를 반환하도록 변경 — 쿼리 한 번을 아꼈다.
- 실제 SMS/카카오/전화 Provider와 그 on/off 플래그(`ENABLE_REAL_CALLS` 류)는 이번에 만들지 않았다 — 아직 쓸 곳이 없어서 Day12로 미뤘다.

### 검증
`npx vitest run` 58/58(신규 12건), `npm run build` 통과. 실제 로그인 후 `/delivery-preview`에서 생성 → Supabase Table Editor에서 `notification_queue`/`delivery_attempts` 저장 확인까지 완료.

### 변경 파일
`docs/PRD-day8-to-mvp-master-plan.md`, `tasks/tasks-day8-notification-queue.md`, `docs/supabase-schema-member-scoped.sql`, `src/lib/silverlink/delivery/*`, `src/lib/supabase/notification-queue-repo.ts`/`delivery-attempts-repo.ts`, `src/lib/supabase/care-tasks-repo.ts`, `src/app/api/delivery/preview/route.ts`, `src/app/api/care-tasks/route.ts`, `src/app/(protected)/delivery-preview/page.tsx`, `src/components/delivery/delivery-preview-form.tsx`

### 커밋
`09f2050` "Implement Day 8: notification_queue/delivery_attempts + MockDeliveryProvider"

---

## Day 9 — 어르신 링크 응답 (`/r/[token]`)

### 목표
Day8의 `response_token`으로, 어르신이 로그인 없이 실제로 응답할 수 있는 화면과 API를 만든다.

### 가장 중요한 설계 결정 — SECURITY DEFINER 함수
어르신은 회원가입을 안 하므로 `/r/[token]`은 Supabase 세션이 전혀 없는 **익명(anon)** 상태로 접근한다. 기존 RLS(`auth.uid() = owner_user_id`)는 익명에게 항상 막히는데, 익명에게 새 select 정책을 열어주면 공개된 anon key로 누구나 전체 큐를 긁어갈 수 있는 구멍이 생긴다.

해결책: **"토큰과 정확히 일치하는 한 건만 다루는 SQL 함수(`SECURITY DEFINER`) 2개"**만 만들어 anon에 실행 권한만 열었다. 서비스 롤 키는 전혀 쓰지 않았다 — 이 함수들은 DB 안에서 정의된, 토큰 하나로 범위가 좁혀진 권한 상승이라 별개다.

### 만든 것
- `get_notification_by_token(token)`: 토큰과 일치하는 알림 1건만 반환
- `respond_to_notification(token, action)`: 만료/중복응답 체크 → `notification_queue.status='responded'` → `care_tasks.status`를 액션별로 매핑(완료/도움필요/나중에, `wrong_target`은 상태 안 바꿈) + `child_notified=false` → `message_logs`에 `direction='parent_response'` 기록까지 한 트랜잭션
- `GET/POST /api/responses/[token]`(로그인 불필요), `/r/[token]` 공개 페이지(`(protected)` 그룹 밖, 버튼 4개: 완료했어요/도움이 필요해요/나중에 다시 알려주세요/잘못 온 알림이에요)
- Day8에서 비워뒀던 `notification_queue.expires_at` 기본값(3일 TTL) 보강

### 검증
`npx vitest run` 61/61, `npm run build` 통과. 실제로 `/delivery-preview`에서 큐 생성 → 그 토큰으로 `/r/[token]` 접속 → 응답 클릭 → 세 테이블 모두 정확히 갱신되는 것까지 확인.

### AI 활용 팁
"로그인 안 한 사용자가 특정 데이터 한 건에만 접근해야 한다"는 요구사항이 나오면, RLS 정책을 느슨하게 풀어주는 대신 SECURITY DEFINER 함수로 "권한 상승의 범위를 함수 시그니처 안에 가두는" 패턴을 쓰면, 공개 anon key의 위험을 키우지 않으면서도 매직링크형 기능을 안전하게 구현할 수 있다.

### 변경 파일
`docs/supabase-schema-member-scoped.sql`, `tasks/tasks-day9-link-response.md`, `src/lib/silverlink/responses/*`, `src/lib/silverlink/delivery/response-token.ts`, `src/lib/supabase/responses-repo.ts`, `src/app/api/delivery/preview/route.ts`, `src/app/api/responses/[token]/route.ts`, `src/app/r/[token]/page.tsx`

### 커밋
`b4c70fc` "Implement Day 9: anonymous /r/[token] link response for elders"

---

## Day 10 — 자녀 대시보드와 응답 모니터링

### 목표
Day8(큐)/Day9(응답)로 쌓인 데이터를 자녀가 한눈에 볼 수 있는 화면으로 모은다.

### 만든 것
- `/dashboard/tasks`: 전체 일정 + 매칭되는 `notification_queue` 채널/상태 배지. `help_requested`는 **호박색 배지 + "직접 연락해 확인해 주세요" 문구**로만 강조(응급 신고처럼 보이지 않게)
- `/dashboard/responses`: `message_logs` 중 `direction === 'parent_response'`만 모은 최신순 응답 기록
- `/dashboard/parents/[parentId]`: 부모님 한 분의 일정+응답을 모아보는 화면. `/parents` 목록 각 항목에 "현황 보기" 링크를 추가해 진입
- 새 `GET /api/notification-queue`, `GET /api/message-logs`(둘 다 로그인 필수). `listNotificationQueue`는 Day8에서 만들어두고 안 썼던 함수를 이번에 처음 사용
- 대시보드 허브에 위 두 화면 링크 추가

### 의도적으로 안 만든 것
마스터플랜이 언급한 `/dashboard/calls`는 만들지 않음 — `care_call_schedules`/`call_attempts` 테이블이 아직 없어서(Day11 범위) 지금 만들면 빈 화면. `/dashboard/parents/[parentId]`도 전용 단일 조회 API 없이 기존 목록 API를 클라이언트에서 필터링(현재 데이터량에서는 전용 엔드포인트가 과한 설계라 판단, RLS가 이미 보안을 보장).

### 사용자가 헤맨 점
`/dashboard/parents/[parentId]`는 동적 라우트라 `parentId` 없이 `/dashboard/parents`로만 접속하면 404가 뜬다(상위 경로에 별도 index 페이지를 안 만들었기 때문 — 의도된 동작). 처음엔 "[id]는 어디서 찾아?"라고 물었고, 직접 URL에 ID를 넣어보려다 404를 본 뒤에야 "`/parents` 목록의 각 항목에 있는 '현황 보기' 링크를 클릭해야 한다"는 진입 경로를 안내받아 정상적으로 화면을 봤다. → **동적 라우트 페이지를 만들 때는 "이 페이지에 어떻게 도달하는가"(진입 링크)를 같이 만들어 두지 않으면, 기능은 정상이어도 사용자가 못 찾아서 막힌 것처럼 보일 수 있다**는 교훈.

### 검증
`npx vitest run` 61/61, `npm run build` 통과(신규 라우트 5개). 세 화면 모두 정상 동작 확인. 특히 `/dashboard/parents/[id]`에서 "어머니 테스트" 분의 일정이 "완료" 배지로, 그 아래 응답 기록에 Day9에서 누른 "완료했어요"가 정확히 연결되어 표시되는 것까지 확인 — Day9 데이터가 Day10 대시보드로 제대로 흘러들어온다는 것을 보여준 케이스.

### AI 활용 팁
새 대시보드 화면을 만들 때 "전용 API를 매번 새로 만들 것인가, 이미 있는 목록 API를 클라이언트에서 필터링할 것인가"는 데이터량과 RLS 여부로 빠르게 결정할 수 있다 — 회원당 데이터가 적고 RLS가 이미 격리를 보장하면, 전용 엔드포인트 없이 기존 목록을 재사용하는 쪽이 더 적은 코드로 같은 안전성을 낸다.

### 변경 파일
`tasks/tasks-day10-child-dashboard.md`, `src/lib/supabase/care-tasks-repo.ts`, `src/lib/supabase/message-logs-repo.ts`, `src/app/api/notification-queue/route.ts`, `src/app/api/message-logs/route.ts`, `src/app/(protected)/dashboard/tasks/page.tsx`, `src/app/(protected)/dashboard/responses/page.tsx`, `src/app/(protected)/dashboard/parents/[parentId]/page.tsx`, `src/app/(protected)/dashboard/page.tsx`, `src/components/parents/parent-profile-list.tsx`

### 커밋
`a6d4af4` "Implement Day 10: child dashboard for tasks, responses, and per-parent view"

---

## Day 11 — AI 비서 안부전화 Mock MVP (`/dashboard/calls`)

### 목표
실제 전화를 걸기 전에, "일정 기반 통화 스크립트 생성 → 전화 → 어르신 응답 → 일정 상태 반영"의 전체 흐름을 웹 안에서 Mock으로 검증한다.

### Day9와의 핵심 차이
Day9의 `/r/[token]`은 실제 어르신(익명)이 누르는 화면이라 SECURITY DEFINER 함수가 필요했다. Day11의 "Mock 전화"는 **로그인한 자녀 본인이 화면에서 어르신 응답을 대신 시뮬레이션 버튼으로 누르는 것**이라, 호출자가 이미 인증된 회원이다. 그래서 새 SQL 함수 없이 기존과 같은 일반 RLS만으로 충분했다 — 같은 "어르신 응답"이라는 주제여도 누가 실제로 클릭하느냐에 따라 보안 설계가 완전히 달라진다는 것을 보여준 케이스.

### 만든 것
- `care_call_schedules`/`care_call_attempts` 테이블 + RLS(`care_call_schedules`는 테이블만, 관리 UI는 없음 — 이유는 아래)
- **`buildCallScript`**: 실제 LLM을 호출하지 않는 키워드 기반 스크립트 생성기. `약`/`복약`/`혈압`/`당뇨` → `medication_check`, `식사`/`밥`/`끼니` → `meal_check`, 그 외 → `wellbeing_check`로 분류 후 opening/main_message/question 조립 (Day5/Day8과 같은 "code-first" 원칙 — 비용 없는 로컬 로직으로 먼저 전체 플로우 검증)
- `POST /api/care-calls/preview`(스크립트 생성+attempt 저장) → `POST /api/care-calls/[id]/start`(Mock 전화 실행, `answered`로 전환) → `POST /api/care-calls/[id]/respond`(완료/도움필요/무응답 중 하나로 마무리, 연결된 `care_tasks.status`도 갱신)
- `/dashboard/calls`: 일정 선택 → 미리보기 생성 → Mock 전화 실행 → 응답 시뮬레이션 → 지난 기록 목록(도움 요청은 Day10과 동일하게 호박색 강조)

### 의도적으로 안 만든 것
`care_call_schedules` 관리 UI(반복 일정 설정 화면) — 실제 cron/스케줄러가 필요한데 그건 Day12 이후(Scripted IVR) 범위와 맞물려 있어, 지금 만들면 아무도 안 쓰는 빈 폼이 된다.

### 검증
`npx vitest run` 66/66(신규 5건), `npm run build` 통과(라우트 5개). 실제 수동 테스트도 SQL 실행부터 미리보기 생성 → Mock 전화 실행 → 응답 시뮬레이션까지 **오류 없이** 한 번에 정상 동작.

### AI 활용 팁
"어르신이 응답한다"처럼 표면적으로 같은 기능이라도, 실제로 그 클릭을 누가 하는지(익명 외부인 vs 로그인한 본인이 대신 시뮬레이션)에 따라 필요한 보안 메커니즘이 완전히 달라질 수 있다. 새 기능을 설계할 때 "이 요청을 실제로 누가 보내는가"를 먼저 명확히 하면 과한 보안장치를 미리 걷어낼 수 있다.

### 변경 파일
`docs/supabase-schema-member-scoped.sql`, `tasks/tasks-day11-care-call-mock.md`, `src/lib/silverlink/calls/*`, `src/lib/supabase/parent-profiles-repo.ts`, `src/lib/supabase/care-tasks-repo.ts`, `src/lib/supabase/care-call-attempts-repo.ts`, `src/app/api/care-calls/*`, `src/app/(protected)/dashboard/calls/page.tsx`, `src/components/calls/care-call-panel.tsx`, `src/app/(protected)/dashboard/page.tsx`

### 커밋
`0421811` "Implement Day 11: AI care-call Mock MVP via /dashboard/calls"

---

## 하루 전체 통계

- 총 4개 Day(8~9~10~11), 4개 PRD 기준 tasks 파일, 4번의 커밋+푸시
- 테스트: 58 → 61 → 61 → 66건으로 증가, 전부 그린
- 새 테이블 4개(`notification_queue`, `delivery_attempts`, `care_call_schedules`, `care_call_attempts`), SECURITY DEFINER 함수 2개
- 새 페이지 6개(`/delivery-preview`, `/dashboard/tasks`, `/dashboard/responses`, `/dashboard/parents/[parentId]`, `/dashboard/calls`, `/r/[token]`)
- 실제 외부 API 호출(SMS/카카오/전화/LLM) **0건** — 전부 결정론적 Mock/템플릿 로직으로 검증
- 사용자가 직접 SQL을 실행한 횟수: 3회(Day8, Day9, Day11), 매번 사용자가 직접 Supabase SQL Editor에서 실행
- 헤맨 점 1건(Day10, 동적 라우트 진입 경로 혼란) — work-log에 교훈으로 기록
