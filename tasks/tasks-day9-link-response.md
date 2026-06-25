# Tasks: Day 9 — 어르신 링크 응답 (`/r/[token]`)

기준 문서: `docs/PRD-day8-to-mvp-master-plan.md` 5장(Day 9), `tasks/tasks-day8-notification-queue.md`(Day8에서 만든 `notification_queue.response_token`/`expires_at`를 이어받음)

## Relevant Files
- `docs/supabase-schema-member-scoped.sql` — Day9 섹션 추가: `get_notification_by_token(p_token)`, `respond_to_notification(p_token, p_action)` SQL 함수(둘 다 `SECURITY DEFINER`) + `anon`/`authenticated`에 EXECUTE 권한 부여
- `src/lib/silverlink/responses/schema.ts` (신규) — `RESPONSE_ACTION_OPTIONS`, `respondActionInputSchema`(Zod)
- `src/lib/supabase/responses-repo.ts` (신규) — `getNotificationByToken`, `respondToNotification` (둘 다 `supabase.rpc()` 호출)
- `src/lib/silverlink/delivery/response-token.ts` — `getDefaultExpiresAt()` 추가(Day8에서 비워뒀던 `expires_at` 기본값)
- `src/app/api/delivery/preview/route.ts` — `expires_at` 기본값 적용(위 함수 사용)
- `src/app/api/responses/[token]/route.ts` (신규) — `GET`(상태 조회) + `POST`(응답 저장), 둘 다 **로그인 불필요**
- `src/app/r/[token]/page.tsx` (신규) — 어르신용 공개 페이지, `(protected)` 그룹 밖에 위치(로그인/네비게이션 없음)
- `tasks/tasks-day9-link-response.md`, `docs/work-log.md` — 슬라이스별 기록/체크

## Notes
- **가장 중요한 설계 결정**: 어르신은 로그인하지 않으므로 Supabase 세션이 전혀 없는 익명(anon) 상태로 `/r/[token]`에 접근한다. 지금까지 모든 테이블의 RLS는 `auth.uid() = owner_user_id`라서 익명 요청은 항상 0건으로 막힌다 — 이건 의도된 것이고, **테이블에 익명 select/update 정책을 새로 추가하지 않는다**(그러면 공개된 anon key로 누구나 전체 큐를 긁어갈 수 있게 됨). 대신 토큰을 정확히 아는 사람만 지나갈 수 있는 **`SECURITY DEFINER` SQL 함수 2개**만 anon에게 노출한다 — 함수 내부는 파라미터로 받은 토큰과 정확히 일치하는 한 행만 다루도록 작성되어 있어, RLS를 우회하면서도 익명 사용자가 다른 회원의 데이터에 닿을 길을 열어주지 않는다. (서비스 롤 키는 여전히 앱 코드에서 전혀 쓰지 않음 — 이 함수들은 DB 안에서 정의된 권한 상승이라 별개)
- `respond_to_notification`은 토큰 조회 → 만료/중복 응답 체크 → `notification_queue.status='responded'` → `care_tasks.status`를 액션에 따라 매핑(`completed`/`help_requested`/`snoozed`, `wrong_target`은 상태 변경 없음) + `child_notified=false` → `message_logs`에 `direction='parent_response'` 기록까지 한 번의 트랜잭션(plpgsql 함수)으로 처리한다.
- Day8에서 `expires_at`을 생성 시점에 채워주지 않았던 부분을 이번에 메운다 — 기본 만료 기간은 3일로 정함(마스터플랜에 구체적 기간이 명시되어 있지 않아 임의로 정한 값이라, 추후 요구사항이 생기면 쉽게 바꿀 수 있게 상수 하나로 분리).
- `/r/[token]` UI 원칙(마스터플랜 6장): 로그인 없이 접근 가능, 큰 버튼 2~3개(이번엔 4개: 완료/도움/나중에/잘못옴), 복잡한 텍스트 입력 없음.
- 회원 A/B 격리 테스트는 여전히 Day6+7 챕터의 마지막 일괄 테스트에 포함된 채로 미룬다. 이번 Day9 자체에서 새로 다루지 않는다.
- 구현 진입 전 `node_modules/next/dist/docs/`에서 관련 Next.js 16.2.9 API(동적 라우트 페이지의 `params`, `useParams` 등)를 확인한다(AGENTS.md 지침).
- 커밋·푸시는 사용자가 명시적으로 요청한 시점에만 수행한다.

## 작업 목록 (Tasks)

- [x] 1.0 SQL 함수 작성 (`get_notification_by_token`, `respond_to_notification`)
  - [x] 1.1 `docs/supabase-schema-member-scoped.sql`에 Day9 섹션 추가 — 두 함수 + `revoke all ... from public` + `grant execute ... to anon, authenticated`
  - [x] 1.2 사용자가 Supabase SQL Editor에서 직접 실행 완료(2026-06-25)
  - [x] 1.3 실행 후 "Success" 확인됨

- [x] 2.0 TypeScript 스키마 + repo 함수
  - [x] 2.1 `src/lib/silverlink/responses/schema.ts`: `RESPONSE_ACTION_OPTIONS`(`completed`/`need_help`/`remind_later`/`wrong_target`) + `respondActionInputSchema`
  - [x] 2.2 `src/lib/supabase/responses-repo.ts`: `getNotificationByToken(supabase, token)`(rpc 호출, 0건이면 null), `respondToNotification(supabase, token, action)`(rpc 호출, jsonb 결과 그대로 반환)
  - [x] 2.3 `src/lib/silverlink/delivery/response-token.ts`에 `getDefaultExpiresAt()`(3일 TTL) 추가, `/api/delivery/preview/route.ts`에서 `input.expires_at`이 없을 때 기본값으로 사용
  - [x] 2.4 Vitest 3건 작성 — `npx vitest run` 61/61 통과(기존 58 + 신규 3)

- [x] 3.0 `/api/responses/[token]` 구현
  - [x] 3.1 `GET`: 토큰으로 조회 → 없으면 404 `not_found` → 있으면 `isExpired`/`isResponded` 계산해서 함께 반환(로그인 불필요)
  - [x] 3.2 `POST`: body 검증(Zod) → `respondToNotification` 호출 → 함수가 반환한 `ok`/`error`(`not_found`/`expired`/`already_responded`/`invalid_action`)에 따라 적절한 상태 코드로 응답

- [x] 4.0 `/r/[token]` 공개 페이지
  - [x] 4.1 `src/app/r/[token]/page.tsx`: `(protected)` 그룹 밖, 로그인 가드/네비게이션 없음(`useParams` 사용, Next.js 16에서도 현행 API로 문서 확인됨)
  - [x] 4.2 로딩 → 메시지 내용 + 4개 버튼(완료/도움 필요/나중에/잘못 옴) 표시 → 클릭 시 POST → "전달됐어요" 완료 화면
  - [x] 4.3 `not_found`/`expired`/`already_responded`/`error` 상태에 맞는 안내 문구 표시(복잡한 텍스트 입력 없이, 버튼/안내 문구 중심)

- [x] 5.0 테스트/문서화 (5.3만 사용자 수동 확인 대기)
  - [x] 5.1 `npx vitest run` 61/61 통과
  - [x] 5.2 `npm run build` 통과 확인(`/api/responses/[token]`, `/r/[token]` 라우트 정상 생성)
  - [x] 5.3 수동 테스트 **최종 확인 완료(2026-06-25)**: `/delivery-preview`에서 만든 큐의 `response_token`으로 `/r/[token]` 접속 → 응답 클릭 → Supabase Table Editor에서 `notification_queue.status`/`care_tasks.status`/`message_logs` 갱신까지 사용자가 직접 확인
  - [x] 5.4 `docs/work-log.md`에 Day 9 섹션 추가
