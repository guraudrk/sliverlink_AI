# Tasks: Day 10 — 자녀 대시보드와 응답 모니터링

기준 문서: `docs/PRD-day8-to-mvp-master-plan.md` 6장(Day 10)

## Relevant Files
- `src/lib/supabase/care-tasks-repo.ts` — `CareTaskSummary`에 `priority`/`completed_at`/`notification_status` 추가, `listCareTasks` select 확장
- `src/lib/supabase/message-logs-repo.ts` (신규) — `listMessageLogs(supabase)`
- `src/app/api/notification-queue/route.ts` (신규) — `GET`, Day8에서 만들어두고 안 썼던 `listNotificationQueue` 노출
- `src/app/api/message-logs/route.ts` (신규) — `GET`
- `src/app/(protected)/dashboard/tasks/page.tsx` (신규) — 전체 일정 + 알림 큐 상태
- `src/app/(protected)/dashboard/responses/page.tsx` (신규) — 어르신 응답 기록(`message_logs.direction === 'parent_response'`)
- `src/app/(protected)/dashboard/parents/[parentId]/page.tsx` (신규) — 부모님 1명에 대한 일정+응답 모아보기
- `src/app/(protected)/dashboard/page.tsx` — 허브에 "오늘의 일정"/"어르신 응답 기록" 링크 2개 추가
- `src/components/parents/parent-profile-list.tsx` — 각 항목에 "현황 보기" 링크(→ `/dashboard/parents/[id]`) 추가

## Notes
- **이번 Day에서 실제로 만드는 페이지**: `/dashboard/tasks`, `/dashboard/responses`, `/dashboard/parents/[parentId]`. 마스터플랜이 언급한 `/dashboard/calls`는 **만들지 않는다** — `care_call_schedules`/`call_attempts` 테이블 자체가 아직 없어서(Day11 범위) 지금 만들면 빈 화면뿐이다. Day11에서 그 테이블과 함께 만든다.
- 도움 요청(`status = 'help_requested'`)은 주황/호박색 배지로 시각적으로만 강조한다. 빨간색 "긴급" 톤이나 응급 신고처럼 보이는 문구는 쓰지 않고, "도움 요청"이라는 중립적인 라벨 + "직접 연락해 확인해 주세요" 정도의 안내만 둔다(마스터플랜 6장의 "실제 응급 신고 기능으로 오해되지 않게" 원칙).
- `/dashboard/parents/[parentId]`는 별도의 단일 조회 API를 새로 만들지 않고, 이미 있는 `GET /api/parents`(전체 목록)/`GET /api/care-tasks`/`GET /api/message-logs`를 클라이언트에서 받아 `parent_id`로 필터링한다 — 이 단계의 데이터량(회원 한 명당 부모님 몇 명, 일정 수십 건 수준)에서는 별도 엔드포인트를 만드는 것이 과한 설계라고 판단함. 어차피 RLS가 본인 데이터만 내려주므로 보안상 문제는 없음.
- 모든 페이지는 `(protected)` 그룹에 둬서 비로그인 시 자동 `/login` 리다이렉트 + 공용 대시보드 네비게이션을 그대로 받는다.
- 회원 A/B 격리 테스트는 여전히 Day6+7 챕터의 마지막 일괄 테스트로 미룬다.
- 커밋·푸시는 사용자가 명시적으로 요청한 시점에만 수행한다.

## 작업 목록 (Tasks)

- [x] 1.0 데이터 레이어 확장
  - [x] 1.1 `care-tasks-repo.ts`: `CareTaskSummary`에 `priority`/`completed_at`/`notification_status` 추가, `listCareTasks` select 절 확장
  - [x] 1.2 `src/lib/supabase/message-logs-repo.ts` 신설: `listMessageLogs(supabase)` — 최근 100건
  - [x] 1.3 `src/app/api/notification-queue/route.ts`(GET), `src/app/api/message-logs/route.ts`(GET) 신설
  - [x] 1.4 빌드/타입 체크로 회귀 확인(기존 패턴과 동일하게 단위 테스트는 따로 안 만듦)

- [x] 2.0 `/dashboard/tasks` — 전체 일정 + 알림 상태
  - [x] 2.1 `care_tasks` + `notification_queue`를 함께 불러와 `care_task_id` 기준으로 매칭
  - [x] 2.2 일정별로 상태 배지 표시(`scheduled`/`completed`/`help_requested`/`snoozed`), `help_requested`는 호박색 강조 + 안내 문구
  - [x] 2.3 매칭된 큐가 있으면 채널/상태 배지도 같이 표시

- [x] 3.0 `/dashboard/responses` — 어르신 응답 기록
  - [x] 3.1 `message_logs` 중 `direction === 'parent_response'`만 필터링해 최신순 표시(보낸 분/응답 내용/시각)

- [x] 4.0 `/dashboard/parents/[parentId]` — 부모님별 모아보기
  - [x] 4.1 `/api/parents` 목록에서 해당 id 찾기 — 없으면(다른 회원 소유 포함) "찾을 수 없음" 표시
  - [x] 4.2 해당 `parent_id`의 `care_tasks`/`message_logs`만 필터링해 표시
  - [x] 4.3 `parent-profile-list.tsx`에 "현황 보기" 링크 추가(버튼과 별개의 `<Link>`로, 버튼 안에 링크를 중첩하지 않도록 절대 위치로 배치)

- [x] 5.0 대시보드 허브 갱신
  - [x] 5.1 `(protected)/dashboard/page.tsx`의 nav에 "오늘의 일정"(`/dashboard/tasks`)/"어르신 응답 기록"(`/dashboard/responses`) 추가

- [x] 6.0 테스트/문서화 (6.2만 사용자 수동 확인 대기)
  - [x] 6.1 `npx vitest run` 61/61, `npm run build` 통과 확인(신규 라우트 5개 정상 생성)
  - [x] 6.2 수동 테스트 **최종 확인 완료(2026-06-25)**: `/dashboard/tasks`, `/dashboard/responses`, `/dashboard/parents/[id]`(어머니 테스트 — 일정 "완료" 배지 + 응답 기록 "완료했어요"까지 정확히 연결되어 표시) 모두 정상 확인
  - [x] 6.3 `docs/work-log.md`에 Day 10 섹션 추가
