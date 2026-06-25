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

- [ ] 2.0 DB 스키마 및 RLS 정책 설계·적용 (profiles/parent_profiles/care_tasks/message_logs) — `parent_profiles` 부분만 완료, 아래 참고
  - [x] 2.1 (변경) `supabase/migrations/` 대신 `docs/supabase-schema-member-scoped.sql` 단일 파일로 진행 — 2026-06-25 작업지시서(workplan)가 이 경로를 지정함. 추후 마이그레이션 파일 체계가 필요해지면 그때 분리
  - [ ] 2.2 `profiles` 테이블 생성 SQL + `auth.users` insert 트리거 — 아직 미작성(이번 슬라이스 범위 아님)
  - [x] 2.3 `parent_profiles` 테이블 생성 SQL 작성 — PRD 8장 기준(`relationship`/`notification_preference default 'none'`) + `kakao_identifier`/`memo` 필드 추가(사용자 확인). `docs/supabase-schema-member-scoped.sql`에 작성 완료
  - [x] 2.4 `care_tasks` 테이블 생성 SQL 작성 — PRD 12장이 아닌 **오늘 작업지시서(workplan) 기준**으로 진행(사용자 확인): `original_request`/`parsed_summary`/`needs_confirmation`/`child_notified`/`memo` 등 기존 Airtable 구조를 보존하는 형태. `docs/supabase-schema-member-scoped.sql`에 작성, PRD는 추후 이 스키마로 갱신 필요(미완)
  - [x] 2.5 `message_logs` 테이블 생성 SQL 작성 — 같은 이유로 workplan 기준(`sender`/`receiver`/`ai_parsed_json`/`error_message` 등). `docs/supabase-schema-member-scoped.sql`에 작성
  - [x] 2.6 `parent_profiles`/`care_tasks`/`message_logs` 3개 테이블 모두 RLS 활성화 + select/insert/update/delete own 정책 4개씩 작성 완료 (`profiles` 테이블은 아직 미생성이라 보류)
  - [x] 2.7 사용자가 Supabase SQL Editor에서 직접 실행 — parent_profiles는 Slice 3에서, care_tasks/message_logs는 이번에 "Success. No rows returned"로 확인됨 (2026-06-25)
  - [x] 2.8 **회원 A/B 격리 테스트 (SQL 레벨, 1차)**: 3개 테이블 모두 anon key(비로그인) 상태로 select(0건, 에러 없음 → 테이블 존재 확인) + insert(`42501 row-level security policy violation` → RLS 차단 확인)로 1차 검증 완료. 실제 계정 A/B 간 격리 테스트는 로그인이 풀리면 마저 진행
  - [ ] 2.9 (해당 없음) — 마이그레이션 디렉터리 체계를 안 쓰기로 했으므로 보류

- [x] 3.0 Supabase Auth 회원가입/로그인/로그아웃 구현 (3.4/3.5는 보류, 아래 참고)
  - [x] 3.1 `src/app/(auth)/signup/page.tsx`(경로를 `(auth)` 라우트 그룹으로 확정, URL은 동일하게 `/signup`) + `src/components/auth/signup-form.tsx`: 이메일/비밀번호 회원가입 폼 (Day4 디자인 톤 — Pretendard, slate/blue — 재사용), 2025/26 트렌드 리서치(전략적 미니멀리즘, 단일 컬럼·넉넉한 여백) 반영
  - [x] 3.2 `src/app/(auth)/login/page.tsx` + `src/components/auth/login-form.tsx`: 이메일/비밀번호 로그인 폼
  - [x] 3.3 로그아웃: 별도 파일 대신 `(protected)/dashboard/page.tsx` 안에 인라인 Server Action(`"use server"`)으로 구현 — `supabase.auth.signOut()` 후 `/login`으로 redirect
  - [ ] 3.4 회원가입 성공 시 `profiles` 행이 트리거로 생성되는지 확인 — **보류**: 2.0(DB 스키마/트리거)이 아직 구현되지 않아 `profiles` 테이블 자체가 없음. `auth.users`에는 정상적으로 계정이 생성됨(Supabase Auth 자체 기능)
  - [ ] 3.5 Vitest 유닛 테스트 — **보류**: 이번 슬라이스 지시에 포함되지 않아 작성하지 않음(HTML `required`/`type="email"`/`minLength`로 최소 검증만 적용). 필요 시 별도 슬라이스에서 Zod 스키마+테스트로 보강
  - [x] 3.6 수동 테스트: 회원가입 → 로그인 → 대시보드 → 로그아웃 전체 플로우 **최종 확인 완료(2026-06-25)**. 처음엔 Supabase 무료 플랜의 이메일 확인 요구사항과 인증 메일 발송 레이트리밋에 막혀 며칠에 걸쳐 보류됐었는데, **Resend 커스텀 SMTP를 연결**한 뒤 실제 본인 이메일(`djwls9614@gmail.com`)로 가입 → 확인 메일 클릭 → 로그인 → 대시보드(이메일 표시 확인)까지 실제 브라우저로 끝까지 검증됨. 단, Resend가 아직 샌드박스 발신 도메인(`onboarding@resend.dev`)이라 본인 계정 외 임의 이메일로는 발송이 막혀있음 — 실제 다양한 회원 가입을 받으려면 커스텀 도메인 인증이 먼저 필요(8.8에 백로그로 기록)

- [ ] 4.0 보호 라우트(인증 가드) 구현 (부분 완료 — 아래 참고)
  - [x] 4.1 `node_modules/next/dist/docs/01-app/02-guides/authentication.md` 확인 (AGENTS.md 지침) — **중요한 발견**: 이 문서의 예시 파일명이 `middleware.ts`가 아니라 `proxy.ts`로 바뀌어 있음(`middleware.ts`는 구버전 v15.5.6 링크로만 언급). Next.js 16에서 전역 가드 파일 컨벤션이 바뀌었을 가능성이 높음(Slice 1 work-log에 기록)
  - [x] 4.2 전역 `middleware.ts`/`proxy.ts` 대신 **라우트 그룹 레이아웃 가드**로 구현: `src/app/(protected)/layout.tsx`에서 `supabase.auth.getUser()` 확인 후 없으면 `redirect("/login")` — 공식 문서의 "Server Components 인증 체크" 패턴을 채택. ⚠️ 이 방식은 Next.js 문서가 직접 경고하는 한계가 있음: 같은 레이아웃 하위에서 자식 라우트끼리 이동할 때는 레이아웃이 재실행되지 않을 수 있어, 보호 라우트가 `/parents`/`/dashboard/create-task`로 늘어나면 페이지별 추가 체크나 전역 `proxy.ts`가 다시 필요해질 수 있음(오픈 이슈로 유지)
  - [x] 4.3 보호 라우트 적용 범위 — 이번 슬라이스에서는 `/dashboard`만 `(protected)` 그룹에 포함. `/parents`/`/dashboard/create-task`는 아직 페이지 자체가 없고(5.0/6.0에서 생성 예정, 생성 시 같은 그룹에 배치), `/notifications`는 Day5 경로 그대로 **아직 비보호 상태**(Supabase 연동 슬라이스인 7.0에서 함께 이전 예정)
  - [ ] 4.4 `src/app/page.tsx`를 로그인 여부에 따라 `/dashboard`/`/login`으로 리다이렉트하도록 변경 — 이번 슬라이스 파일 목록에 없어 보류, `/`는 여전히 Day4 입력 폼
  - [ ] 4.5 Playwright E2E(`tests/e2e/auth-redirect.spec.ts`) — 이번엔 임시 스크립트로 수동 검증만 하고 정식 스펙 파일은 만들지 않음(8.0 테스트 보강 단계에서 정식화 예정). 수동 검증 결과: 비로그인 `/dashboard` 접근 시 `/login` redirect **확인됨**
  - [ ] 4.6 로그인 상태에서는 보호 라우트에 정상 접근되는지 확인 (회귀 없음, 같은 E2E 파일에 포함)

- [ ] 5.0 부모님/어르신 프로필 관리(`/parents`) 구현 (대부분 완료, 5.6/5.7 보류 — 아래 참고)
  - [x] 5.1 `src/lib/supabase/parent-profiles-repo.ts`: `listParentProfiles(supabase)`, `createParentProfile(supabase, ownerUserId, input)` 작성. `owner_user_id`는 함수 시그니처상 항상 서버가 별도 인자로 넘기는 구조로 강제(클라이언트가 보낸 값이 섞일 수 없음)
  - [x] 5.2 `parentProfileInputSchema`(Zod) 작성 — `display_name` 필수, 나머지(`relationship`/`phone`/`notification_preference`/`care_context`/`daily_routine`/`medication_notes`/`communication_style`/`memo`)는 선택. `notification_preference`는 `none`/`sms`/`kakao` enum
  - [x] 5.3 `src/app/(protected)/parents/page.tsx` + `src/components/parents/parent-profile-form.tsx`/`parent-profile-list.tsx`: 목록 + 등록 폼 UI (Day4/5 디자인 톤 재사용, `(protected)` 그룹이라 비로그인 시 자동 `/login` redirect)
  - [x] 5.4 등록 폼 제출 → `POST /api/parents` → Supabase insert → 목록 state에 새 항목 prepend
  - [x] 5.5 Vitest: `parentProfileInputSchema` 검증 7건 (정상 입력/선택 필드 생략/`display_name` 누락·공백/허용 안 된 `notification_preference`/클라이언트가 보낸 `owner_user_id` 무시됨) — `npm test` 42/42 통과
  - [ ] 5.6 **회원 A/B 격리 테스트 (UI 레벨, `tests/e2e/parent-isolation.spec.ts`)** — **보류**: 실제 로그인 세션이 필요한데, Slice 2에서 기록한 것과 같은 이유(Supabase 무료 플랜 이메일 확인/레이트리밋)로 확인된 테스트 계정을 아직 못 만듦. 로그인이 풀리면 5.7과 함께 진행
  - [x] 5.7 수동 테스트 **최종 확인 완료(2026-06-25)**: 비로그인 상태(`GET/POST /api/parents` 401, `/parents` 접속 시 307 `/login` redirect)뿐 아니라, 실제 로그인 후 "아버지 테스트" 등록 → 목록에 표시 → Supabase `parent_profiles`에 `owner_user_id`가 본인 계정으로 정확히 들어간 것까지 사용자가 직접 Table Editor에서 확인함
  - [x] 5.8 (추가, 사용자 요청) 부모님 정보 수정 기능: PRD 6장에서 "향후 확장"으로 미뤄뒀던 `/parents/[id]` 수정 페이지를 **별도 페이지 없이** 구현 — `updateParentProfile` 리포지토리 함수 + `PATCH /api/parents/[id]/route.ts`(소유권은 RLS의 update policy가 0건 갱신으로 자연히 막음) + `ParentProfileForm`을 create/edit 겸용으로 일반화(`mode`/`profile`/`onCancelEdit` props) + `ParentProfileList` 항목을 클릭 가능하게 변경. `/parents` 목록에서 항목 클릭 → 같은 폼이 그 데이터로 채워지고 PATCH로 저장
  - [x] 5.9 (추가, 사용자 요청) 등록 성공 시 잠깐 메시지를 보여준 뒤 `/dashboard`로 자동 이동(`setTimeout` 1.2초) — "등록 후 그 자리에 머무는 게 어색하다"는 피드백 반영. 수정 성공 시에는 페이지 이동 없이 `/parents`에 그대로 머무름(여러 건을 잇따라 고칠 수 있게)
  - [x] 5.10 (추가, 사용자 요청) 모든 보호 화면에서 대시보드로 돌아갈 수 있는 공용 상단 바(`src/components/app/dashboard-nav-bar.tsx`) 추가 — `(protected)/layout.tsx` 한 곳에 넣어 `/dashboard`/`/parents`/`/dashboard/create-task`에 자동 적용, 아직 보호 그룹 밖인 `/notifications`에는 페이지에 직접 추가

- [ ] 6.0 웹 입력창 전환 및 care_tasks/message_logs Supabase 연동 (+ Make 레거시 호환) — UI 전환(Slice 5)만 완료, Supabase 저장 연동은 Slice 6/7로 남음
  - [x] 6.1 `src/lib/silverlink/schema.ts`: `taskRequestInputSchema`에 `target_person_id`(uuid, 필수) 추가, `target_person`은 고정 enum에서 자유 텍스트(선택된 프로필의 `display_name`)로 변경 (breaking change)
  - [x] 6.2 `src/lib/silverlink/target-person.ts`의 `TARGET_PERSON_OPTIONS` — **레거시 유지로 결정**: 입력 폼(`task-request-form.tsx`)은 더 이상 참조하지 않지만, Day5 `src/lib/silverlink/notifications/schema.ts`의 `CareTask.target_person` enum이 아직 이 배열에 의존하고 있어 완전 제거하면 Day5가 깨짐. Day5/7 알림 엔진의 Supabase 연동(7.0) 때 같이 정리할 예정
  - [x] 6.3 `src/app/(protected)/dashboard/create-task/page.tsx`(경로 보정: `(protected)` 그룹) + `task-request-form.tsx`: `/api/parents`를 호출해 로그인 사용자의 `parent_profiles`로 드롭다운을 채움(label: `표시이름 (관계)`, value: profile id). 부모님이 없으면 "먼저 부모님/어르신을 등록해 주세요" 안내 + `/parents` 링크 표시
  - [x] (추가) `src/app/page.tsx`: 입력 폼이 로그인 필요 구조로 바뀌면서 공개 페이지로 둘 수 없어, 로그인 여부에 따라 `/dashboard`/`/login`으로 리다이렉트하도록 변경 (4.4에서 보류했던 항목이 이번에 자연스럽게 해결됨)
  - [x] 6.4 `src/app/api/create-task/route.ts`: 로그인 필수(401) → `target_person_id` 소유권 검증(RLS로 0건이면 403 `parent_not_found`) → `care_tasks` insert → `message_logs`(`direction:"inbound"`) insert(메인 경로). **`sender_name` 서버 파생(이메일)은 이번엔 안 함** — 오늘 작업지시서 8장 요구사항엔 없던 tasks 파일의 추가 아이디어였고, `sender_name`은 여전히 클라이언트가 적은 자유 텍스트로 유지(Day4와 동일)
  - [x] 6.5 `src/lib/silverlink/env.ts`: `LEGACY_MAKE_SYNC_ENABLED`(기본 `false`) 추가(PRD 12장 명칭 유지, 오늘 작업지시서의 `SILVERLINK_USE_MAKE_LEGACY`라는 다른 이름은 기존 문서와의 일관성을 위해 채택하지 않음). `route.ts`에서 `true`일 때만 `sendToMakeWebhook` 호출, Make 실패해도 Supabase 저장은 이미 끝난 뒤라 응답은 막지 않음. `.env.example`에 Supabase 키 3종(1.3에서 미완으로 남아있던 것)도 같이 채워넣음
  - [x] 6.6 깨진 기존 테스트 갱신: `schema.test.ts`/`payload.test.ts`를 `target_person_id`(uuid)+자유 텍스트 `target_person` 구조로 수정, `tests/e2e/create-task.spec.ts`는 `/dashboard/create-task`가 로그인을 요구하므로 비로그인 리다이렉트 가드 1건으로 재작성(로그인 필요한 happy path는 5.7과 동일한 이유로 보류) — `npm test` 43/43, `npm run build` 통과
  - [x] 6.7 신규 Vitest(`care-tasks-repo.test.ts`): `isOwnParentProfile`을 스텁 Supabase 클라이언트로 테스트(행 있으면 true/0건이면 false/쿼리 에러면 throw) — `npm test` 46/46
  - [ ] 6.8 **회원 A/B 격리 테스트 (API 레벨)** — **보류**: 실제 로그인 세션 2개가 필요한데 Slice 2부터 이어진 Supabase 이메일 확인/레이트리밋 문제로 아직 확인된 테스트 계정이 없음. 로그인이 풀리면 한 번에 몰아서 확인
  - [x] 6.9 수동 테스트: 비로그인 `POST /api/create-task` → 401(`curl`) 확인. 실제 로그인 후 `/dashboard/create-task`에서 부모님 선택 → 메시지 제출 → 응답 정상 → **Supabase `care_tasks`/`message_logs`에 정확히 저장된 것까지 사용자가 직접 Table Editor에서 최종 확인 완료(2026-06-25)**: `owner_user_id`/`parent_id`/`target_person`/`original_request`/`status`/`priority`(care_tasks), `owner_user_id`/`parent_id`/`direction`/`sender`/`receiver`/`raw_message`/`source_channel`(message_logs) 전부 일치. `LEGACY_MAKE_SYNC_ENABLED`를 설정하지 않아 기본값(`false`)으로 테스트된 것이라, `=true`일 때 Make도 같이 호출되는지는 **아직 미확인**(필요시 별도 확인)
  - [x] (메모) Slice 5 중 `/api/create-task`를 새 payload 구조로 `curl` 스모크 테스트하다 `SILVERLINK_DRY_RUN=false` 상태를 미확인하고 호출해, 실제 Make 시나리오 1회 실행(OpenAI 호출 1건 + Airtable 쓰기 시도, 가짜 target 때문에 422로 실패해 데이터는 안 남음)이 발생한 안전사고가 있었다 — work-log.md에 상세 기록, 메모리에도 반영함. Slice 6에서 `LEGACY_MAKE_SYNC_ENABLED`/dry-run 흐름을 다시 손볼 때 이 사고를 고려해 기본값을 더 안전하게 설계할 것

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
  - [ ] 8.8 **🚨 실제 런칭 전 필수**: Resend SMTP가 지금 샌드박스 발신 주소(`onboarding@resend.dev`)라 본인 계정 이메일로만 발송 가능 — 실제 회원들의 다양한 이메일로 가입 확인 메일이 가게 하려면 Resend에서 **커스텀 도메인 인증**(DNS에 TXT/CNAME 추가) 먼저 완료하고, Supabase SMTP Settings의 Sender email을 그 도메인 주소로 교체해야 함. 미완료 상태로 런칭하면 본인 외 사용자는 회원가입 자체가 막힘
  - [ ] 8.9 **🚨 이번 챕터(Day6+7)의 모든 기능 구현이 끝나면 반드시**: 회원 A/B 데이터 격리 테스트(2.8/5.6/6.8)를 마무리할 것 — 사용자가 "기능부터 다 만들고 마지막에 한 번에 하자"고 명시적으로 결정함(2026-06-25). Supabase Dashboard → Authentication → Users → "Add user"로 이메일 확인 없이 두 번째 테스트 계정을 만들어서 진행 예정
