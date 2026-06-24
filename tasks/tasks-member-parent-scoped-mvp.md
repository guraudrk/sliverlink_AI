# Tasks: Member-Scoped Parent Profile MVP (Day 6+7)

기준 문서: `docs/PRD-member-parent-scoped-mvp.md`

## Relevant Files
- `supabase/migrations/*.sql` — `profiles`/`parent_profiles`/`care_tasks`/`message_logs` 테이블 + RLS 정책
- `src/lib/supabase/browser.ts` — 브라우저용 Supabase 클라이언트 (`@supabase/ssr`)
- `src/lib/supabase/server.ts` — 서버용 Supabase 클라이언트 (쿠키 기반 세션)
- `src/lib/supabase/env.ts` — `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` 로더 (서버 전용 경계 분리)
- `src/lib/supabase/parent-profiles-repo.ts` — `parent_profiles` 조회/등록 함수
- `middleware.ts`/`proxy.ts` — (아직 미생성) 보호 라우트 세션 검사, 4.1 ⚠️ 참고 — 현재는 `(protected)/layout.tsx`로 대체
- `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/login/page.tsx` — 인증 폼 페이지 (URL은 `/signup`, `/login`)
- `src/components/auth/signup-form.tsx`, `src/components/auth/login-form.tsx` — 인증 폼 클라이언트 컴포넌트
- `src/app/(protected)/layout.tsx` — 보호 라우트 그룹 가드 (세션 없으면 `/login` redirect)
- `src/app/(protected)/dashboard/page.tsx` — 로그인 후 허브 화면 (이메일 표시, 링크 3개, 인라인 로그아웃 Server Action)
- `src/app/page.tsx` — (아직 미변경) 로그인 여부에 따라 `/dashboard`/`/login` 리다이렉트로 변경 예정
- `src/app/(protected)/dashboard/create-task/page.tsx` — Day4 입력 폼의 후신 (`target_person_id` 기반, 향후 슬라이스)
- `src/app/(protected)/parents/page.tsx` — 부모님/어르신 목록 + 등록 폼 (향후 슬라이스)
- `src/components/task-request-form.tsx` — `target_person_id` select로 변경
- `src/lib/silverlink/schema.ts`, `target-person.ts` — 입력 스키마 breaking change
- `src/app/api/create-task/route.ts` — Supabase insert(메인) + Make 레거시 분기
- `src/lib/silverlink/env.ts` — `LEGACY_MAKE_SYNC_ENABLED` 추가
- `src/lib/silverlink/notifications/schema.ts`, `fixture.ts` — Supabase `care_tasks` 연동
- `src/app/api/notifications/prepare/route.ts`, `src/app/notifications/page.tsx` — 로그인 사용자 범위로 필터링 + 보호 라우트 적용
- `tests/e2e/auth-redirect.spec.ts`, `tests/e2e/parent-isolation.spec.ts` — 신규 E2E (가제)
- `.env.example`, `package.json` — Supabase 키/의존성 추가
- `docs/work-log.md`, `README.md`, `docs/PRD-member-parent-scoped-mvp.md` — 문서화

## Notes
- 이 챕터의 목표는 "로그인한 자녀/보호자가 자신이 등록한 부모님/어르신에게만 일정을 만들 수 있는 구조"를 만드는 것이다. Supabase를 메인 DB로 두고, `owner_user_id` 기반 RLS로 회원 간 데이터를 격리한다.
- **회원 A/B 격리 검증은 이 챕터에서 가장 중요한 안전장치**다 — RLS 정책을 만든 직후(2.0), UI 레벨(5.0), API 레벨(6.0), 알림 엔진 레벨(7.0)까지 매 단계에서 반복 확인한다.
- 기존 Make Webhook→Airtable 경로는 즉시 삭제하지 않고 `LEGACY_MAKE_SYNC_ENABLED` 플래그로 보존하는 레거시 호환 경로로 남긴다.
- 실제 SMS/카카오 알림톡 발송, 실제 부모님 개인정보 사용은 절대 하지 않는다 — 테스트 계정 + 테스트 데이터만 사용한다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용으로만 사용하고 클라이언트 번들/응답/로그/대화에 노출하지 않는다. `.env.local` 내용은 화면에 출력하지 않는다.
- 구현 진입 전 `node_modules/next/dist/docs/`에서 Next.js 16.2.9의 인증/미들웨어 관련 문서를 확인한다 (AGENTS.md 지침).
- 하위 테스크 단위로 구현 후 해당 테스크를 체크하고, 관련 테스트를 실행해 통과를 확인한다.
- 작업 하나가 끝날 때마다 이 파일에서 해당 항목의 `[ ]`를 `[x]`로 바꾼다.
- 작업 하나가 끝날 때마다 `docs/work-log.md`에 새 섹션(목표/내용/검증/변경 파일/AI 활용 팁/커밋 여부)을 추가한다.
- 커밋·푸시는 사용자가 명시적으로 요청한 시점에만 수행한다.

## 작업 목록 (Tasks)

- [ ] 0.0 기능 브랜치 생성
  - [ ] 0.1 `main` 기준 최신 상태 확인
  - [ ] 0.2 기능 브랜치 생성 (`feature/member-parent-scoped-mvp`)
  - [ ] 0.3 병합 방식은 사용자 결정에 따름 (Day4/5 사례 참고: 초반엔 브랜치, 이후 `main` 직접 작업 전환 가능)

- [ ] 1.0 Supabase 프로젝트/환경변수 설정
  - [ ] 1.1 Supabase 프로젝트 생성(또는 로컬 CLI) — 사용자가 직접 키 발급, 화면에 키 값 출력하지 않음
  - [ ] 1.2 `@supabase/supabase-js`, `@supabase/ssr`를 `package.json`에 추가
  - [ ] 1.3 `.env.example`에 `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/`LEGACY_MAKE_SYNC_ENABLED` 항목과 설명 주석(값은 마스킹) 추가
  - [ ] 1.4 `.env.local`에 실제 값 입력 (사용자 직접 수행, `.gitignore` 적용 재확인)
  - [ ] 1.5 `src/lib/supabase/env.ts`: 환경변수 로더 작성 — `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 모듈에서만 import되도록 구조로 보장
  - [x] 1.6 `src/lib/supabase/browser.ts`(브라우저용 `createSupabaseBrowserClient`), `src/lib/supabase/server.ts`(서버용 `createSupabaseServerClient`, `next/headers`의 `cookies()` 기반) 작성 — 둘 다 anon key만 사용, service role key 미사용. `@supabase/ssr`/`@supabase/supabase-js` 설치 완료
  - [ ] 1.7 수동 테스트: 임시 Route Handler 또는 스크립트로 `supabase.auth.getSession()`/간단 쿼리 호출이 에러 없이 동작하는지 확인
  - [ ] 1.8 `npm run build` 후 `.next/static` grep으로 `SUPABASE_SERVICE_ROLE_KEY` 값이 클라이언트 번들에 포함되지 않는지 확인 (Day4 `MAKE_WEBHOOK_URL` 검증 패턴 재사용)

- [ ] 2.0 DB 스키마 및 RLS 정책 설계·적용 (profiles/parent_profiles/care_tasks/message_logs)
  - [ ] 2.1 `supabase/migrations/` 디렉터리 생성, 마이그레이션 파일 네이밍 규칙 결정
  - [ ] 2.2 `profiles` 테이블 생성 SQL + `auth.users` insert 트리거(신규 가입 시 `profiles` 행 자동 생성) 작성
  - [ ] 2.3 `parent_profiles` 테이블 생성 SQL 작성 (PRD 8장 스키마: `display_name`/`relationship`/`phone`/`notification_preference`/`care_context`/`daily_routine`/`medication_notes`/`communication_style`)
  - [ ] 2.4 `care_tasks` 테이블 생성 SQL 작성 (PRD 12장 스키마: `owner_user_id`/`parent_id`/`target_person`/`sender_name`/`message`/`task_title`/`task_type`/`task_datetime`/`status`/`priority`/`confirmation_message`/`parent_notified`/`notification_status`/`source_channel`/`requested_at`/`today_date`)
  - [ ] 2.5 `message_logs` 테이블 생성 SQL 작성 (PRD 12장 스키마: `owner_user_id`/`parent_id`/`care_task_id`/`direction`/`channel`/`raw_message`/`status`)
  - [ ] 2.6 4개 테이블 모두 RLS 활성화 + `select`/`insert`/`update`/`delete` 정책 작성 (`parent_profiles`/`care_tasks`/`message_logs`는 `auth.uid() = owner_user_id`, `profiles`는 `auth.uid() = id`로 `select`/`update`만)
  - [ ] 2.7 마이그레이션을 Supabase 프로젝트(또는 로컬)에 적용
  - [ ] 2.8 **회원 A/B 격리 테스트 (SQL 레벨)**: 테스트 계정 2개 생성 → 각자 `parent_profiles` 1건씩 insert → A의 세션으로 B의 행을 `select` 시 0건 반환되는지 Supabase SQL editor 또는 테스트 스크립트로 확인
  - [ ] 2.9 적용된 마이그레이션을 `supabase/migrations/`에 파일로 정리해 버전 관리 (재실행 가능하게)

- [x] 3.0 Supabase Auth 회원가입/로그인/로그아웃 구현 (3.4/3.5는 보류, 아래 참고)
  - [x] 3.1 `src/app/(auth)/signup/page.tsx`(경로를 `(auth)` 라우트 그룹으로 확정, URL은 동일하게 `/signup`) + `src/components/auth/signup-form.tsx`: 이메일/비밀번호 회원가입 폼 (Day4 디자인 톤 — Pretendard, slate/blue — 재사용), 2025/26 트렌드 리서치(전략적 미니멀리즘, 단일 컬럼·넉넉한 여백) 반영
  - [x] 3.2 `src/app/(auth)/login/page.tsx` + `src/components/auth/login-form.tsx`: 이메일/비밀번호 로그인 폼
  - [x] 3.3 로그아웃: 별도 파일 대신 `(protected)/dashboard/page.tsx` 안에 인라인 Server Action(`"use server"`)으로 구현 — `supabase.auth.signOut()` 후 `/login`으로 redirect
  - [ ] 3.4 회원가입 성공 시 `profiles` 행이 트리거로 생성되는지 확인 — **보류**: 2.0(DB 스키마/트리거)이 아직 구현되지 않아 `profiles` 테이블 자체가 없음. `auth.users`에는 정상적으로 계정이 생성됨(Supabase Auth 자체 기능)
  - [ ] 3.5 Vitest 유닛 테스트 — **보류**: 이번 슬라이스 지시에 포함되지 않아 작성하지 않음(HTML `required`/`type="email"`/`minLength`로 최소 검증만 적용). 필요 시 별도 슬라이스에서 Zod 스키마+테스트로 보강
  - [x] 3.6 수동 테스트(Playwright 스크립트, 임시 포트): 회원가입 → 로그인 시도까지 확인. **확인된 것**: 회원가입 성공 메시지 정상 표시, 비로그인 `/dashboard` 접근 시 `/login` redirect 정상. **확인 못 한 것**: 로그인 성공 → 대시보드 → 로그아웃 전체 플로우 — 연결된 Supabase 프로젝트가 "이메일 확인(email confirmation)"을 요구해서, 테스트 계정이 미확인 상태로는 로그인 자체가 거부됨(`signInWithPassword` 400, 정상적인 보안 동작이며 코드 버그 아님). service role key를 쓰지 않기로 했으므로 관리자 API로 강제 확인 처리도 하지 않았음 — 사용자가 Supabase 대시보드에서 테스트 계정을 수동 확인하거나 "Confirm email" 옵션을 끄면 나머지 플로우를 이어서 검증 가능

- [ ] 4.0 보호 라우트(인증 가드) 구현 (부분 완료 — 아래 참고)
  - [x] 4.1 `node_modules/next/dist/docs/01-app/02-guides/authentication.md` 확인 (AGENTS.md 지침) — **중요한 발견**: 이 문서의 예시 파일명이 `middleware.ts`가 아니라 `proxy.ts`로 바뀌어 있음(`middleware.ts`는 구버전 v15.5.6 링크로만 언급). Next.js 16에서 전역 가드 파일 컨벤션이 바뀌었을 가능성이 높음(Slice 1 work-log에 기록)
  - [x] 4.2 전역 `middleware.ts`/`proxy.ts` 대신 **라우트 그룹 레이아웃 가드**로 구현: `src/app/(protected)/layout.tsx`에서 `supabase.auth.getUser()` 확인 후 없으면 `redirect("/login")` — 공식 문서의 "Server Components 인증 체크" 패턴을 채택. ⚠️ 이 방식은 Next.js 문서가 직접 경고하는 한계가 있음: 같은 레이아웃 하위에서 자식 라우트끼리 이동할 때는 레이아웃이 재실행되지 않을 수 있어, 보호 라우트가 `/parents`/`/dashboard/create-task`로 늘어나면 페이지별 추가 체크나 전역 `proxy.ts`가 다시 필요해질 수 있음(오픈 이슈로 유지)
  - [x] 4.3 보호 라우트 적용 범위 — 이번 슬라이스에서는 `/dashboard`만 `(protected)` 그룹에 포함. `/parents`/`/dashboard/create-task`는 아직 페이지 자체가 없고(5.0/6.0에서 생성 예정, 생성 시 같은 그룹에 배치), `/notifications`는 Day5 경로 그대로 **아직 비보호 상태**(Supabase 연동 슬라이스인 7.0에서 함께 이전 예정)
  - [ ] 4.4 `src/app/page.tsx`를 로그인 여부에 따라 `/dashboard`/`/login`으로 리다이렉트하도록 변경 — 이번 슬라이스 파일 목록에 없어 보류, `/`는 여전히 Day4 입력 폼
  - [ ] 4.5 Playwright E2E(`tests/e2e/auth-redirect.spec.ts`) — 이번엔 임시 스크립트로 수동 검증만 하고 정식 스펙 파일은 만들지 않음(8.0 테스트 보강 단계에서 정식화 예정). 수동 검증 결과: 비로그인 `/dashboard` 접근 시 `/login` redirect **확인됨**
  - [ ] 4.6 로그인 상태에서는 보호 라우트에 정상 접근되는지 확인 (회귀 없음, 같은 E2E 파일에 포함)

- [ ] 5.0 부모님/어르신 프로필 관리(`/parents`) 구현
  - [ ] 5.1 `src/lib/supabase/parent-profiles-repo.ts`: `listParentProfiles()`, `createParentProfile(input)` 등 데이터 접근 함수
  - [ ] 5.2 `parentProfileInputSchema`(Zod) 작성 — `display_name` 필수, 나머지(`relationship`/`phone`/`notification_preference`/`care_context`/`daily_routine`/`medication_notes`/`communication_style`)는 선택
  - [ ] 5.3 `src/app/parents/page.tsx`: 목록 + 등록 폼 UI (Day4/5 디자인 톤 재사용)
  - [ ] 5.4 등록 폼 제출 → Supabase insert → 목록 갱신 흐름 연결
  - [ ] 5.5 Vitest: `parentProfileInputSchema` 검증(필수값 누락 시 실패 등)
  - [ ] 5.6 **회원 A/B 격리 테스트 (UI 레벨, `tests/e2e/parent-isolation.spec.ts`)**: 계정 A로 부모님 등록 → 로그아웃 → 계정 B로 로그인해 `/parents` 접근 시 A의 부모님이 보이지 않는지 확인
  - [ ] 5.7 수동 테스트: 브라우저에서 직접 등록/목록 확인

- [ ] 6.0 웹 입력창 전환 및 care_tasks/message_logs Supabase 연동 (+ Make 레거시 호환)
  - [ ] 6.1 `src/lib/silverlink/schema.ts`: `taskRequestInputSchema`를 `target_person_id`(uuid) 기반으로 변경 (breaking change)
  - [ ] 6.2 `src/lib/silverlink/target-person.ts`의 하드코딩 `TARGET_PERSON_OPTIONS` 배열 제거 여부 결정 및 정리(완전 제거 또는 레거시 표시용으로 유지)
  - [ ] 6.3 `src/app/dashboard/create-task/page.tsx` + 폼 컴포넌트: `target_person_id` select를 로그인 사용자의 `parent_profiles`로 채움, 부모님 없을 때 "먼저 등록해 주세요" 안내 + `/parents` 링크
  - [ ] 6.4 `src/app/api/create-task/route.ts`: `target_person_id` 소유권 검증(타인 소유면 403) → `target_person` 텍스트 파생 → `sender_name` 서버 파생(로그인 사용자 이메일) → Supabase `care_tasks`/`message_logs`(`direction:"inbound"`) insert(메인 경로)
  - [ ] 6.5 `src/lib/silverlink/env.ts`: `LEGACY_MAKE_SYNC_ENABLED`(기본 `false`) 추가, `route.ts`에서 `true`일 때만 기존 `sendToMakeWebhook` 호출하도록 분기
  - [ ] 6.6 깨진 기존 테스트 갱신: `schema.test.ts`/`payload.test.ts`(또는 대체)와 `tests/e2e/create-task.spec.ts`를 새 입력 구조(`target_person_id`)에 맞춰 수정
  - [ ] 6.7 신규 Vitest: 새 스키마 검증, `target_person_id` 소유권 검증 로직(순수 함수로 분리 가능하면 분리) 테스트
  - [ ] 6.8 **회원 A/B 격리 테스트 (API 레벨)**: 계정 A 세션으로 계정 B의 `parent_profiles.id`를 `target_person_id`에 직접 넣어 요청 시 403으로 거부되는지 확인 (RLS 우회 시나리오 방어 검증)
  - [ ] 6.9 수동 테스트: `LEGACY_MAKE_SYNC_ENABLED=false`에서 Make로 어떤 요청도 안 나가는지(코드 리뷰/네트워크 확인), `true`로 켰을 때만 기존과 동일하게 Make Webhook이 호출되는지 확인

- [ ] 7.0 Day5 알림 준비 엔진의 Supabase 연동
  - [ ] 7.1 `src/lib/silverlink/notifications/schema.ts`(`CareTask`)를 Supabase `care_tasks` 행 구조에 맞춰 조정 또는 매핑 함수 추가
  - [ ] 7.2 Supabase에서 로그인 사용자(`owner_user_id`)의 `care_tasks`를 조회하는 함수 추가 — 기존 `fixture.ts`는 유닛 테스트용으로 계속 유지
  - [ ] 7.3 `src/app/api/notifications/prepare/route.ts`: 로그인 세션의 `owner_user_id`로 필터링된 Supabase `care_tasks`를 사용하도록 변경
  - [ ] 7.4 `src/app/notifications/page.tsx`가 4.0의 보호 라우트 적용을 받는지 확인 (회귀 없음)
  - [ ] 7.5 `isDueTask`/`buildOutboundMessage`/`prepareNotification` 등 기존 순수 함수는 변경 없이 그대로 재사용되는지 확인
  - [ ] 7.6 Vitest: Supabase 행 → `CareTask` 매핑 함수 테스트
  - [ ] 7.7 **회원 A/B 격리 테스트**: 계정 A로 알림 준비 API 호출 시 결과에 계정 B의 `care_tasks`가 절대 섞이지 않는지 확인

- [ ] 8.0 테스트 보강과 문서화
  - [ ] 8.1 `npm run test` 전체 통과 확인 (Day4+5+6+7 전체 누적)
  - [ ] 8.2 `npm run test:e2e` 전체 통과 확인 (신규 인증/RLS/리다이렉트 E2E 포함)
  - [ ] 8.3 `npm run build` 통과 확인 + `SUPABASE_SERVICE_ROLE_KEY` 번들 비노출 재확인
  - [ ] 8.4 `docs/work-log.md`에 챕터 전체 요약 + 슬라이스별 기록 추가
  - [ ] 8.5 `README.md` 갱신: 인증/Supabase/부모님 프로필/레거시 Make 경로 설명 추가
  - [ ] 8.6 `docs/PRD-member-parent-scoped-mvp.md`에 "구현 완료 범위"/"다음 단계로 분리한 범위" 섹션 추가
  - [ ] 8.7 향후 백로그 정리: `notification_queue`/`delivery_attempts`/`response_events`/`rag_documents`/`rag_chunks`, `/parents/[id]`, `/delivery-preview`, 멀티 역할(role)
