# Work Log: SilverLink AI – Web Input Channel

작업(테스크/슬라이스)이 끝날 때마다 아래에 새 섹션을 추가한다. 날짜 단위(`# YYYY-MM-DD`)로 묶고, 그 안에서 최신 항목이 위로 오도록 역순으로 쌓는다.

각 항목에는 **🤖 AI 활용 팁**(이 프로젝트뿐 아니라 다른 프로젝트에서도 쓸 수 있는, AI와 협업하며 얻은 일반화 가능한 노하우)을 포함한다.
이 파일은 추후 별도 일지(다이어리) 파일로 재구성될 예정이므로, 단순 변경 목록보다 "왜 그렇게 했는지 / 무엇을 깨달았는지"가 드러나게 작성한다. 날짜 단위 묶음은 "오늘 하루치만 골라서 일지로 만들어줘" 같은 요청에 그대로 쓸 수 있도록 한 것이다.

---

# 2026-06-24

## Day 6+7 Slice 2: 회원가입/로그인 + 보호 라우트 (`(auth)`, `(protected)`)

**목표**: Supabase Auth 기반 이메일/비밀번호 회원가입·로그인을 만들고, `/dashboard`를 로그인한 사용자만 볼 수 있게 막는다.

**내용**:
- **라우트 그룹 구조**: Next.js App Router의 라우트 그룹(괄호 폴더, URL에 영향 없음)을 사용해 `src/app/(auth)/login/page.tsx`·`src/app/(auth)/signup/page.tsx`(공개), `src/app/(protected)/dashboard/page.tsx`(보호)로 분리했다. `(auth)`는 별도 레이아웃 없이 루트 레이아웃을 그대로 쓰고, `(protected)/layout.tsx`가 이 그룹 전체에 대한 인증 가드 역할을 한다.
- **인증 가드 방식 결정**: Slice 1에서 발견한 "Next.js 16 공식 문서가 `middleware.ts` 대신 `proxy.ts`를 쓴다"는 의문을 이번에 굳이 풀지 않고, 대신 공식 문서가 같이 소개하는 **"Server Component에서 직접 체크"** 패턴을 썼다 — `(protected)/layout.tsx`에서 `supabase.auth.getUser()`로 세션을 확인하고 없으면 `redirect("/login")`. 보호해야 할 페이지가 `/dashboard` 하나뿐인 지금 단계에는 이게 가장 단순하고 확실한 방법이었다. 다만 Next.js 문서 자체가 "레이아웃은 같은 레이아웃 하위 자식 라우트 이동 시 재실행되지 않을 수 있다"고 경고하므로, `/parents`·`/dashboard/create-task`가 추가되는 다음 슬라이스에서 이 한계가 실제로 문제가 되는지 다시 확인해야 한다(오픈 이슈로 남김).
- `src/components/auth/login-form.tsx`/`signup-form.tsx`: Day4 `task-request-form.tsx`의 시각 톤(Pretendard, slate/blue, rounded-3xl 카드, role="status"/"alert" 상태 배너)을 그대로 재사용했다. 디자인을 짜기 전에 "2026년 SaaS 로그인/가입 페이지 트렌드"를 검색해 참고했는데, 핵심은 "전략적 미니멀리즘"(화면의 모든 요소가 사용자의 목표에 직접 기여해야 한다, 불필요한 장식 제거) — 그래서 단일 컬럼, 넉넉한 여백, 카드 하나, 버튼 하나로 화면을 최대한 비웠다.
- `(protected)/dashboard/page.tsx`: 로그인한 사용자의 이메일을 표시하고, `/parents`·`/dashboard/create-task`·`/notifications` 3개 링크 카드를 보여준다. 로그아웃은 별도 파일을 만들지 않고, **Server Component 안에 인라인 Server Action**(`"use server"`로 함수 본문에 직접 표시)을 정의해 `<form action={logout}>`으로 연결했다 — Next.js 공식 문서가 소개하는 패턴이고, 로그아웃처럼 그 페이지에서만 쓰는 단발성 동작을 별도 `actions.ts` 파일로 빼는 것보다 더 단순했다.
- 요구사항에는 없었지만, 회원가입/로그인 폼이 의미 있게 동작하려면 로그아웃이 꼭 필요해서(로그인 후 나갈 방법이 없으면 테스트조차 할 수 없음) 이번 슬라이스에 같이 포함시켰다.

**검증**:
- `tsc --noEmit`/`eslint` 0 에러, `npm run test` 35/35(회귀 없음), `npm run build` 성공 — `/dashboard`가 `cookies()` 사용으로 자동으로 동적(ƒ) 라우트로 잡히고, `/login`/`/signup`은 정적(○)으로 잡힘.
- 임시 포트(3012)에서 Playwright 스크립트로 실제 동작 확인:
  - 비로그인 상태로 `/dashboard` 접근 → `/login`으로 redirect **확인됨**
  - 회원가입(테스트 이메일) → 성공 메시지 정상 표시 **확인됨**
  - 로그인 시도 → 400 에러로 거부, 화면에 에러 메시지 정상 표시 **확인됨** — 단, 원인을 파보니 이건 버그가 아니라 **연결된 Supabase 프로젝트가 "이메일 확인(email confirmation)"을 요구**하고 있어서, 막 가입한 미확인 계정은 로그인 자체가 정상적으로 거부된 것이었다(Supabase의 의도된 보안 동작).
  - 로그인 성공 → 대시보드 → 로그아웃까지 이어지는 "행복한 경로"는 이번엔 끝까지 확인하지 못했다 — service role key를 안 쓰기로 했으니 관리자 API로 테스트 계정을 강제 확인 처리할 수도 없었고, 테스트 이메일의 받은편지함에 접근할 수도 없었다. 사용자가 Supabase 대시보드에서 테스트 계정을 한 번 수동 확인하거나, 개발 단계에서 "Confirm email" 옵션을 꺼두면 나머지 플로우를 곧바로 이어서 검증할 수 있다.
- 처음 회원가입 테스트는 `@example.com` 도메인으로 시도했다가 Supabase가 `"Email address ... is invalid"`로 거부했다 — Supabase가 알려진 placeholder 도메인을 막아두는 것으로 보이며, `@gmail.com` 형태의 실제 존재하는 도메인(받는 사람이 실재하지 않아도 도메인 자체가 유효하면 통과)으로 바꾸자 정상적으로 가입됐다.

**변경 파일**: `src/app/(auth)/login/page.tsx`(신규), `src/app/(auth)/signup/page.tsx`(신규), `src/components/auth/login-form.tsx`(신규), `src/components/auth/signup-form.tsx`(신규), `src/app/(protected)/layout.tsx`(신규), `src/app/(protected)/dashboard/page.tsx`(신규), `tasks/tasks-member-parent-scoped-mvp.md`(3.0/4.0 갱신, 보류 항목 명시)

**🤖 AI 활용 팁**: "로그인 실패"가 화면에 보였을 때 바로 "코드가 틀렸나?"로 의심하지 않고, 에러 응답(400)과 메시지를 먼저 끝까지 읽고 원인을 추적한 게 도움이 됐다 — 이번 경우는 코드 버그가 아니라 "Supabase 프로젝트 설정(이메일 확인 필수)"이라는, 코드 밖의 원인이었다. 인증/외부 서비스 연동을 검증할 때는 "내가 통제할 수 없는 설정값"이 항상 있을 수 있다는 걸 염두에 두고, 실패를 일으킨 게 내 코드인지 그 서비스의 정책인지부터 구분하는 게 먼저다.

**커밋**: 아직 안 함 (사용자 요청 시 진행)

---

## Day 6+7 Slice 1: Supabase 클라이언트 구성 (`browser.ts`/`server.ts`)

**목표**: Next.js App Router에서 클라이언트/서버 양쪽에서 쓸 Supabase 클라이언트를 `@supabase/ssr` 기반으로 만든다. 이번 슬라이스는 "연결 통로"만 만드는 단계라 아직 회원가입/로그인/DB 연동은 없다.

**내용**:
- `@supabase/ssr`, `@supabase/supabase-js` 설치.
- `src/lib/supabase/browser.ts`: `createSupabaseBrowserClient()` — 클라이언트 컴포넌트에서 호출할 브라우저 클라이언트. `createBrowserClient(url, anonKey)`만 호출.
- `src/lib/supabase/server.ts`: `createSupabaseServerClient()` — 서버 컴포넌트/Route Handler에서 호출할 서버 클라이언트. `next/headers`의 `cookies()`(Next.js 16에서는 비동기라 `await` 필요)로 쿠키를 읽고 쓰는 `getAll`/`setAll`을 `createServerClient`에 연결.
- 두 파일 모두 **`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`만 사용하고, `SUPABASE_SERVICE_ROLE_KEY`는 어디에도 참조하지 않음** — grep으로 직접 확인.
- 구현 전 Next.js 공식 인증 가이드(`node_modules/next/dist/docs/01-app/02-guides/authentication.md`)를 확인했는데, 뜻밖의 발견이 있었다: 이 문서가 인증 가드 예시 코드에서 파일명을 **`proxy.ts`**로 쓰고 있고, "Middleware"는 "구버전(v15.5.6) 링크"로만 언급한다 — 즉 Next.js 16에서는 기존에 알던 `middleware.ts`가 `proxy.ts`라는 새 파일 컨벤션으로 바뀌었을 가능성이 높다. 이번 슬라이스는 클라이언트 생성까지만이라 영향 없지만, **다음 슬라이스(4.0 보호 라우트)에서 반드시 이 부분을 다시 확인해야 한다** — AGENTS.md가 경고한 "학습 데이터와 다른 breaking change"의 실제 사례.

**검증**: `tsc --noEmit`/`eslint` 0 에러, `npm run test` 35/35(회귀 없음), `npm run build` 성공(기존 4개 라우트 그대로 유지) — 새 파일이 아직 어디서도 import되지 않아서 `.env.local`에 Supabase 키가 없어도 빌드/테스트에 영향 없음을 확인.

**변경 파일**: `src/lib/supabase/browser.ts`(신규), `src/lib/supabase/server.ts`(신규), `package.json`/`package-lock.json`(`@supabase/ssr`, `@supabase/supabase-js` 추가), `tasks/tasks-member-parent-scoped-mvp.md`(1.6 체크)

**🤖 AI 활용 팁**: 새 인증/SDK 코드를 쓰기 전에 "공식 문서를 먼저 읽으라"는 규칙을 지키면, 코드를 다 쓰고 나서 막히는 게 아니라 **구현하기 전에** "어, 이 버전은 파일명이 다르네"를 미리 알게 된다. 이번엔 아직 영향 없는 슬라이스였지만, 다음 슬라이스에서 `middleware.ts`를 추측만으로 만들었다면 동작 안 하는 코드를 만들고 나서야 원인을 찾았을 것이다.

**커밋**: 아직 안 함 (사용자 요청 시 진행)

---

## Day 5: Code-first Notification Preparation Engine

**목표**: Day 5 하루 전체(Slice 1~6)를 한 번에 정리한다 — 왜 이렇게 접근했는지, 무엇을 만들었고 무엇을 일부러 안 만들었는지, 어떻게 검증했는지.

**1. 왜 Make 사용을 최소화했는가**: Make.com은 시나리오 실행(operation) 단위로 사용량이 제한/과금되는 구조라, 개발 중 같은 로직을 반복 호출하며 테스트하면 크레딧이 빠르게 소진된다. Make 시나리오 내부 분기 로직은 유닛 테스트도 못 만들고 버전 관리(diff/코드리뷰)도 안 되니, "판단"(누구에게 언제 무슨 메시지를 보낼지, `care_tasks`를 어떻게 바꿀지)은 전부 Next.js 코드로 옮겨 Vitest로 검증하고, Make는 향후 "실행"(실제 발송/실제 쓰기) 단계에만 최소한으로 남기기로 했다.

**2. 만든 것**:
- 로컬 fixture 데이터 — `data/fixtures/care-tasks.day5.json` (실제 어르신 데이터 아님, 5건: 지금 발송 대상 2건/미래 1건/이미발송 1건/완료 1건)
- due task 판단 로직 — `isDueTask(task, now)`
- outbound 메시지 후보 생성 — `buildOutboundMessage(task)`
- care_tasks update patch 미리보기 — `prepareNotification`의 `taskUpdatePatch`(`parent_notified: true`, `notification_status: "prepared"`)
- Dry Run API — `GET /api/notifications/prepare`
- 알림 준비 미리보기 UI — `/notifications` (`NotificationPreviewPanel`)

**3. 안 만든 것 (의도적으로 범위 밖)**:
- 실제 카카오톡 발송
- 실제 Airtable 업데이트(읽기/쓰기 모두)
- Make `due_task_checker` 시나리오(자동 스케줄링/실행)

**4. 테스트**:
- Vitest: 35/35 통과 (Day4 15 + Day5 20 — due-task 6 / message-builder 4 / notification-engine 7 / fixture 3)
- `npm run build`: 프로덕션 빌드 통과 (Slice 6에서 Turbopack × zod `.datetime()` 충돌 버그를 발견하고 `TARGET_PERSON_OPTIONS`를 별도 모듈로 분리해 해결한 뒤 확인됨)

**5. AI 활용 팁**:
- 외부 자동화(Make 등)의 크레딧/사용량이 제한적일 때는, 처음부터 실제 연동을 붙이지 말고 **"코드 우선 + Dry Run 하네스"**로 로직을 먼저 검증하는 게 비용도 아끼고 디버깅도 빠르다 — 실패해도 Vitest 한 줄 메시지로 바로 원인을 알 수 있고, Make 실행 이력(History)을 뒤져볼 필요가 없다.
- **순수 로직(판단/생성 함수)과 외부 어댑터(Make/Airtable/Kakao 호출)를 처음부터 분리**해두면, 나중에 어댑터만 실제 구현으로 갈아끼우면 되고, 순수 로직에 짜둔 테스트는 그대로 재사용할 수 있다. 이번에도 `isDueTask`/`buildOutboundMessage`/`prepareNotification`은 외부 호출이 전혀 없는 순수 함수라, Make/Airtable 어댑터가 나중에 들어와도 이 함수들과 테스트는 거의 안 바뀔 것으로 예상된다.

**변경 파일**: Day 5 전체 변경 파일은 위 Slice 1~6 각 항목을 참고 (`data/fixtures/care-tasks.day5.json`, `src/lib/silverlink/notifications/**`, `src/lib/silverlink/target-person.ts`, `src/app/api/notifications/prepare/route.ts`, `src/app/notifications/page.tsx`, `src/components/notification-preview-panel.tsx`, `docs/PRD-notification-engine-code-first.md`, `tasks/tasks-notification-engine.md`)

**커밋**: 이번 작업에서 진행

---

## Day 5 Slice 6: 테스트 보강 + 프로덕션 빌드 버그 발견/해결 (Turbopack × zod `.datetime()`)

**목표**: Day5에서 추가한 due task 판단/메시지 생성/알림 준비 로직의 테스트를 보강하고, `npm test`와 `npm run build`가 모두 통과하는 것을 성공 기준으로 확인한다.

**내용 1 — 테스트 보강**:
- `src/lib/silverlink/notifications/__tests__/fixture.test.ts`(신규): `loadCareTaskFixtures()`가 `data/fixtures/care-tasks.day5.json` 5건을 `careTaskSchema`로 정확히 로드하는지, `task_004`(이미 발송)/`task_005`(완료) 플래그가 의도대로 들어있는지 검증. 지금까지 fixture 자체는 간접적으로만(다른 테스트의 베이스 객체로) 검증됐는데, "JSON 파일을 누군가 잘못 고치면 어디서 깨지는가"에 대한 직접적인 안전망이 없었어서 추가.
- `src/lib/silverlink/notifications/__tests__/message-builder.test.ts`에 2케이스 추가: `confirmation_message`가 빈 문자열(`""`)일 때도 fallback이 동작하는지(스키마는 `min(1)`이라 빈 문자열을 막지만, 함수 자체는 방어적으로 동작해야 한다고 판단), 다른 `target_person`(어머니 테스트)에서도 문구가 정확히 바뀌는지.
- 결과: `npm test` 35/35 (Day4 15 + Day5 due-task 6 + message-builder 4 + notification-engine 7 + fixture 3).

**내용 2 — `npm run build` 실패 발견과 원인 추적**: 테스트는 다 통과했는데 `npm run build`(프로덕션 빌드, Turbopack)가 `ReferenceError: Cannot access 'am' before initialization`로 깨졌다. 에러 메시지가 압축된 변수명(`am`, `Module.af`)이라 코드를 직접 읽어서는 원인을 알 수 없어서, **`git stash`로 Day5 변경 전/후를 오가며 라우트와 모듈을 하나씩 빼고 다시 빌드해보는 식으로 범위를 좁혔다**:
1. Day4 커밋 시점(`git stash`로 Day5 전체 숨김)으로는 빌드 성공 → Day5에서 생긴 문제 확정.
2. `/notifications` 페이지/컴포넌트만 빼고 API 라우트는 남겨도 여전히 실패 → 문제는 API 라우트 쪽.
3. API 라우트 내용을 빈 핸들러로 바꿔도(아무 import도 없이) 성공 → "두 번째 라우트가 존재하는 것 자체"는 원인이 아님.
4. API 라우트에서 평범한 `z.object({...})`만 써도 성공 → "zod를 쓰는 것 자체"도 원인이 아님.
5. API 라우트가 `src/lib/silverlink/notifications/schema.ts`(`careTaskSchema`)를 import하면 다시 실패. 그 파일은 `target_person` enum을 만들기 위해 Day4의 `src/lib/silverlink/schema.ts`에서 `TARGET_PERSON_OPTIONS`를 가져오고 있었는데, **그 파일에는 `requested_at` 검증용 `z.string().datetime({ offset: true })`도 같이 있었다.** 결국 "두 번째 라우트가 Day4의 `.datetime()` 검증 코드를 같이 끌고 들어가는 것"이 트리거였다 — Turbopack이 두 라우트의 공통 의존성(zod의 datetime 정규식 생성 코드)을 하나의 공유 청크로 묶는데, 그 청크 내부 모듈 평가 순서에 TDZ(아직 초기화 안 된 변수 접근) 버그가 있던 것으로 보인다(zod v4 내부 구현과 Turbopack의 청크 분리 방식이 만나서 생긴 문제로 판단, 우리 비즈니스 로직의 버그는 아님).

**해결**: `TARGET_PERSON_OPTIONS`를 `src/lib/silverlink/target-person.ts`라는 그 값만 담긴 단독 모듈로 분리했다. `src/lib/silverlink/schema.ts`는 거기서 값을 가져와 그대로 재수출(`export { TARGET_PERSON_OPTIONS }`)해서 기존 사용처(`task-request-form.tsx` 등)는 코드를 한 글자도 안 고쳐도 되게 했고, `notifications/schema.ts`는 `target-person.ts`를 직접 가져오도록 바꿨다. 이제 두 라우트의 공유 그래프에 `.datetime()` 코드가 더 이상 섞이지 않아 빌드가 통과한다.

**검증**: `npm run build` 성공(`/`, `/notifications` 정적 / `/api/create-task`, `/api/notifications/prepare` 동적으로 라우트 목록에 정상 표시), `tsc --noEmit`/`eslint .` 0 에러, `npm test` 재실행 35/35(회귀 없음).

**변경 파일**: `src/lib/silverlink/notifications/__tests__/fixture.test.ts`(신규), `src/lib/silverlink/notifications/__tests__/message-builder.test.ts`(2케이스 추가), `src/lib/silverlink/target-person.ts`(신규), `src/lib/silverlink/schema.ts`(`TARGET_PERSON_OPTIONS`를 재수출로 변경), `src/lib/silverlink/notifications/schema.ts`(import 경로를 `target-person.ts`로 변경), `tasks/tasks-notification-engine.md`(6.0 갱신)

**🤖 AI 활용 팁**: "테스트는 통과하는데 빌드는 실패한다"는 신호는 매우 중요하다 — Vitest는 각 모듈을 개별적으로(혹은 가벼운 번들링으로) 실행하지만, `next build`는 전체 앱을 실제 배포 형태로 번들링하면서 "어떤 모듈을 누구와 공유 청크로 묶을지"까지 결정한다. 그래서 "단위 테스트만으로는 절대 못 잡는, 번들링 단계에서만 드러나는 버그"가 따로 존재한다. 이번처럼 에러 메시지가 압축된 변수명이라 단서가 거의 없을 때는, 코드를 추측하지 말고 **"있던 걸 하나씩 빼면서 재현 여부를 확인"**하는 이분 탐색(bisection)이 가장 빠르다 — `git stash`(전체 되돌리기)와 파일을 임시로 다른 곳으로 옮기는 방법을 섞어서, "정확히 무엇이 있어야 재현되는가"를 5번의 빌드로 좁혔다. 이런 상황에서는 "왜 이게 안 되지"를 코드 리딩으로 풀려고 하기보다, 빠르게 반복 가능한 최소 재현 환경을 먼저 만드는 게 시간을 아낀다.

**커밋**: 아직 안 함 (사용자 요청 시 진행)

---

## Day 5 Slice 5: 알림 준비 미리보기 UI 구현 (`/notifications`)

**목표**: Slice 4에서 만든 Dry Run API를 사람이 클릭해서 직접 눈으로 확인할 수 있는 화면을 만든다. "Dry Run/Preview"라는 게 화면에서도 명확히 드러나야 하고, 발송/적용 버튼은 아예 없어야 한다.

**내용**:
- `src/app/notifications/page.tsx` + `src/components/notification-preview-panel.tsx`: Day4 `page.tsx`/`task-request-form.tsx`의 레이아웃·색상(`slate-50` 배경, `blue-600` 버튼, `rounded-3xl`/`ring-slate-200` 카드)을 그대로 재사용해 같은 제품의 화면처럼 보이게 했다.
- API 응답(`GET /api/notifications/prepare`)에는 원래 `task_title`이 없었는데, UI에서 "업무 제목을 보여줘"라는 요구사항이 있어 `prepareNotification`의 반환 타입에 `taskTitle` 필드를 추가했다 — PRD/이전 슬라이스 설계 시점에는 "UI가 정확히 뭘 보여줄지"까지 확정하지 않았어서, UI를 만들면서 API 쪽 스키마가 한 번 더 손을 봐야 했다. UI 요구사항이 API 응답 설계에 거꾸로 영향을 주는 흔한 패턴.
- 상단에 amber 색상 고정 배너로 "Dry Run / Preview 모드, 실제 발송/저장 없음"을 항상 보이게 했다(버튼을 누르기 전에도 보임) — "결과가 나온 뒤에야 미리보기라고 알려주면 늦다"고 판단해서 로딩 전부터 노출.
- 응답 JSON을 그대로 `<pre>`로 보여주는 대신(Day4의 응답 미리보기 패턴), 카드 형태로 가공해서 보여줬다 — 이 화면은 보호자/관리자가 "누구한테 무슨 말이 나갈지"를 직관적으로 확인하는 용도라, 원본 JSON보다 사람이 읽기 편한 표현이 더 적합하다고 판단(Day4의 디버깅용 `<pre>`와 이 화면의 목적이 다름).
- 발송/적용 버튼은 처음부터 만들지 않았다 — "버튼을 비활성화해서 못 누르게" 하는 게 아니라 "그 기능 자체가 코드에 존재하지 않게" 만드는 쪽이 더 안전하다고 판단(실수로 활성화될 여지 자체를 차단).

**검증**: `tsc --noEmit`/`eslint` 0 에러, `npm run test` 30/30(타입 변경에 따라 `notification-engine.test.ts`의 `toEqual` 기대값에 `taskTitle` 추가). 임시 포트(3011)에서 dev 서버를 띄우고 Playwright로 실제 브라우저 시나리오를 검증 — 배너 노출 확인 → 버튼 클릭 → "총 2건의 알림 후보를 찾았어요" 표시 → 카드 제목/메시지/배지 정상 → 페이지가 발생시킨 네트워크 요청 중 `localhost:3011`(자기 자신) 외 외부 호출이 0건임을 코드로 직접 확인(`page.on("request", ...)`로 전체 요청 수집).

**변경 파일**: `src/app/notifications/page.tsx`(신규), `src/components/notification-preview-panel.tsx`(신규), `src/lib/silverlink/notifications/notification-engine.ts`(`taskTitle` 필드 추가), `src/lib/silverlink/notifications/__tests__/notification-engine.test.ts`(기대값 갱신), `tasks/tasks-notification-engine.md`(5.0 체크 완료)

**🤖 AI 활용 팁**: "실제 외부 호출이 없는지 확인해줘"를 사람이 네트워크 탭을 눈으로 보는 대신, Playwright의 `page.on("request", ...)`로 그 페이지가 브라우저에서 실제로 발생시킨 모든 요청 URL을 코드로 수집해서 "이 목록에 우리 서버 말고 다른 도메인이 있는지"를 자동으로 확인했다. 이렇게 하면 "안전하다고 말은 했는데 실제로 확인은 안 한" 상태를 피할 수 있고, 나중에 진짜 Kakao/Airtable 연동이 들어왔을 때도 같은 검증 코드를 재사용해서 "의도한 호출만 나가는지" 회귀 테스트로 쓸 수 있다.

**커밋**: 아직 안 함 (사용자 요청 시 진행)

---

## Day 5 Slice 4: Dry Run API Route 구현 (`GET /api/notifications/prepare`)

**목표**: 지금까지 만든 fixture(1.0)·due 판단(2.0)·알림 준비(3.0) 로직을 브라우저/HTTP 클라이언트에서 호출할 수 있는 API로 묶는다. 이 단계에서도 Make/Airtable 호출이나 실제 발송은 절대 없다.

**내용**:
- `src/lib/silverlink/notifications/fixture.ts`: `data/fixtures/care-tasks.day5.json`을 `resolveJsonModule`(이미 `tsconfig.json`에 활성화돼 있던 옵션)로 직접 `import`하고, `careTaskSchema.array().parse()`로 검증해 타입이 보장된 `CareTask[]`를 반환하는 `loadCareTaskFixtures()`를 만들었다. `fs.readFileSync`로 직접 읽는 방법도 있었지만, 이 fixture는 빌드 시점에 고정된 테스트 데이터라 정적 import가 더 단순하고 타입 안전하다고 판단.
- `src/app/api/notifications/prepare/route.ts`: `GET` 핸들러에서 `loadCareTaskFixtures()` → `prepareNotifications(tasks, new Date())` → `{ ok: true, dryRun: true, count, candidates }` 응답. Day4 `create-task/route.ts`의 `jsonResponse` 헬퍼(charset=utf-8 명시)를 그대로 복사해 재사용 — 아직 두 라우트뿐이라 공유 유틸로 추출하진 않았다(YAGNI, 세 번째 라우트가 생기면 그때 묶는 게 낫다고 판단).
- Next.js 공식 문서(`15-route-handlers.md`)를 먼저 확인한 결과, `GET` Route Handler는 기본적으로 캐시되지 않고 매 요청마다 새로 실행된다는 걸 확인했다 — 이 라우트는 `new Date()`로 "지금"을 매번 새로 계산해야 하므로 별도 설정 없이도 의도대로 동작한다.

**검증**: `tsc --noEmit`/`eslint` 0 에러, `npm run test` 30/30 통과(회귀 없음). 임시로 `npm run dev -- --port 3010`을 띄우고 `curl http://localhost:3010/api/notifications/prepare`로 직접 호출 — 응답이 `count:2`, `task_001`/`task_002`만 후보로 포함되고 `task_003`(미래)/`task_004`(이미발송)/`task_005`(완료)는 빠진 것을 확인. 호출 시점이 한국 시각 오후라 Slice 2/3의 테스트(`FIXED_NOW`=09:00)에서는 `task_002`가 제외였는데 실제 호출에서는 포함된 것도 확인 — "기준 시각이 달라지면 결과가 달라지는" 의도된 동작이 실제로도 똑같이 재현됨.

**변경 파일**: `src/lib/silverlink/notifications/fixture.ts`(신규), `src/app/api/notifications/prepare/route.ts`(신규), `tasks/tasks-notification-engine.md`(4.0 체크 완료, Relevant Files 보강)

**🤖 AI 활용 팁**: 새 라우트를 만들기 전에 "이거 캐시되면 어떻게 되지?"를 먼저 공식 문서로 확인해두면, 나중에 "어 왜 결과가 안 바뀌지?" 하는 디버깅을 미리 차단할 수 있다. AGENTS.md가 강제한 "구현 전 공식 문서 확인" 규칙이 이번엔 실질적인 버그(정적 캐싱으로 due task가 갱신 안 되는 문제)를 예방했다.

**커밋**: 아직 안 함 (사용자 요청 시 진행)

---

## Day 5 Slice 3: 알림 준비 엔진 구현 (`buildOutboundMessage`, `prepareNotification(s)`)

**목표**: due task 1건을 "어르신께 보낼 메시지 초안"과 "care_tasks에 적용할 patch 미리보기"로 변환하는 로직을 구현한다. 여기까지도 Make/Airtable 호출은 없고, 실제 발송이 아니라 "준비(prepared)" 상태까지만 만든다.

**내용**:
- `src/lib/silverlink/notifications/message-builder.ts`: `buildOutboundMessage(task)` — `confirmation_message`가 있으면 그대로 쓰고, 없으면 `"{target_person}, {task_title} 확인해주세요."` 형태로 fallback 문구를 만든다. 이를 위해 `careTaskSchema.confirmation_message`를 필수에서 `optional()`로 바꿨다 — 실제로 GPT가 모든 task에 대해 확인 문구를 만들어주지 않을 수도 있다는 걸 감안한 변경.
- `src/lib/silverlink/notifications/notification-engine.ts`: `prepareNotification(task, now)` — 내부에서 `isDueTask`를 다시 호출해 due가 아니면 `null`을 반환한다(중복 코드처럼 보이지만, "이 함수에 어떤 task를 넘기든 안전하다"는 보장을 함수 자신이 갖게 하는 게 호출하는 쪽에서 매번 due 체크를 깜빡할 위험보다 낫다고 판단). due면 `outboundLogCandidate`(`status:"prepared"`)와 `taskUpdatePatch`(`notification_status:"prepared"`)를 만든다 — 두 군데 모두 `"prepared"`로만 표시하고 `"sent"`는 절대 쓰지 않는다(실제 발송 전이라는 걸 코드 레벨에서도 명확히 구분). `last_notification_at`은 새로 시간 포맷팅 코드를 만들지 않고 Day4의 `getRequestedAt(now)`를 그대로 재사용해 Asia/Seoul `+09:00` ISO 문자열로 통일했다.
- `prepareNotifications(tasks, now)`: 여러 task에 `prepareNotification`을 적용하고 `null`(미래/완료/이미발송)을 필터링해 due task 후보만 남긴다.

**검증**: `npm run test` 30/30 통과(message-builder 2케이스, notification-engine 7케이스 신규), `tsc --noEmit`/`eslint` 0 에러. 이번에도 vitest 첫 실행은 "Cannot read properties of undefined (reading 'config')"로 콜드 스타트 플레이크가 발생했고 재실행하면 통과함(Slice 2와 동일 현상, 코드 문제 아님 — 반복 확인됨).

**변경 파일**: `src/lib/silverlink/notifications/message-builder.ts`(신규), `src/lib/silverlink/notifications/notification-engine.ts`(신규), `src/lib/silverlink/notifications/schema.ts`(`confirmation_message` optional로 수정), `src/lib/silverlink/notifications/__tests__/message-builder.test.ts`(신규), `src/lib/silverlink/notifications/__tests__/notification-engine.test.ts`(신규), `tasks/tasks-notification-engine.md`(1.0/3.0 체크 완료, Relevant Files 실제 경로로 정리)

**🤖 AI 활용 팁**: 처음 PRD를 쓸 때 가정한 함수/필드명(`buildPatchPreview`, `notified_at`, `reason`)과, 나중에 사용자가 구체적인 프롬프트로 준 실제 스펙(`prepareNotification`, `taskUpdatePatch.last_notification_at`)이 또 달랐다. 이번엔 PRD를 억지로 고치지 않고 "실제 요구사항이 PRD보다 더 구체적이고 최신이면 실제 요구사항을 따른다"는 우선순위를 그대로 적용했다 — PRD는 방향을 맞추는 문서이지, 나중에 바뀌면 안 되는 계약서가 아니라는 걸 Day5에서 두 번째로 확인.

**커밋**: 아직 안 함 (사용자 요청 시 진행)

---

## Day 5 Slice 2: due task 판단 로직 구현 (`isDueTask`)

**목표**: "due task 판단" 로직을 Make/Airtable 없이 코드 + 로컬 fixture만으로 구현하고 Vitest로 검증한다 (`docs/PRD-notification-engine-code-first.md` 3~6장).

**내용**:
- `src/lib/silverlink/notifications/schema.ts`: `careTaskSchema`/`CareTask` 타입을 PRD 5장의 추상적 가정이 아니라, 실제로 만든 `data/fixtures/care-tasks.day5.json`의 필드(`task_title`, `task_datetime`, `notification_status` 등)에 맞춰 정의. `target_person`은 Day4 `schema.ts`의 `TARGET_PERSON_OPTIONS`를 그대로 재사용해 "아버지 테스트"/"어머니 테스트" 두 값만 허용하도록 통일.
- `src/lib/silverlink/notifications/due-task.ts`: `isDueTask(task, now)` 구현 — `status === "scheduled"`, `parent_notified === false`, `task_datetime` 존재, `task_datetime <= now` 4가지를 모두 만족해야 true. `task_datetime`이 ISO 8601(+09:00 offset)이라 `new Date()`로 절대 시각 비교만 하면 되고, Day4 `time.ts`처럼 서버 타임존을 신경 쓸 필요가 없었다 — "문자열을 만들 때"와 "이미 만들어진 시각을 비교할 때"는 타임존 안전장치가 필요한 지점이 다르다는 걸 다시 확인.
- `due-task.ts`: 여러 task를 한 번에 걸러 정렬하는 `findDueTasks` 목록 함수는 이번 슬라이스에서 만들지 않았다 — 사용자가 "due task detection only"로 범위를 명시했고, 단일 판단 함수(`isDueTask`)만으로 4가지 조건을 전부 테스트할 수 있어 목록 처리는 다음 슬라이스(outbound 메시지 생성과 묶일 가능성)로 미뤘다 (YAGNI).

**검증**: `npm run test` 21/21 통과(신규 6케이스 포함: 이전/같음 → due, completed/이미발송/미래/누락 → 제외), `tsc --noEmit`/`eslint` 0 에러. 첫 실행 시 vitest가 "Cannot read properties of undefined (reading 'config')"로 3개 파일 모두 실패했는데, 재실행하니 전부 통과함 — vitest v4 콜드 스타트 시 발생하는 일시적 현상으로 판단(코드 문제 아님).

**변경 파일**: `src/lib/silverlink/notifications/schema.ts`(신규), `src/lib/silverlink/notifications/due-task.ts`(신규), `src/lib/silverlink/notifications/__tests__/due-task.test.ts`(신규), `tasks/tasks-notification-engine.md`(2.0 체크 완료)

**🤖 AI 활용 팁**: PRD를 쓸 때 가정했던 데이터 모델(`due_at`, `category`)과, 사용자가 나중에 직접 준 실제 fixture 필드명(`task_datetime`, `task_type`)이 달랐다. PRD는 "방향을 맞추는 문서"이고 실제 스키마는 fixture가 나온 시점에 다시 확정하는 게 자연스럽다 — PRD 초안의 필드명에 억지로 맞추기보다, 실제 데이터가 나오면 그걸 기준으로 타입을 다시 쓰는 편이 코드와 문서의 불일치를 줄인다.

**커밋**: 아직 안 함 (사용자 요청 시 진행)

---

## 개념 정리: `isDueTask`의 4단계 판단 로직

**계기**: Slice 2 구현 직후, `isDueTask`가 정확히 어떤 순서로 어떤 기준을 보는지 자세히 설명해달라는 요청이 있어 정리해둠.

```ts
export function isDueTask(task: CareTask, now: Date): boolean {
  if (task.status !== "scheduled") return false;
  if (task.parent_notified) return false;
  if (!task.task_datetime) return false;

  return new Date(task.task_datetime) <= now;
}
```

4개의 체크리스트를 위에서부터 순서대로 통과해야 `true`가 나온다(하나라도 걸리면 즉시 `false`로 종료 — early return).

1. **`status !== "scheduled"` → 탈락.** 이미 `"completed"`(끝난 일)면 다시 알릴 필요가 없다.
2. **`parent_notified` → 탈락.** 이미 한 번 알림을 보냈다는 뜻. 같은 일로 두 번 알리면 중복 발송이 되므로 이 플래그가 1차 방어선 역할을 한다.
3. **`task_datetime` 없음 → 탈락.** "언제 알려야 하는지" 자체가 없으면 비교할 기준이 없으니 안전하게 제외.
4. **`task_datetime <= now`.** 앞 3개를 통과했을 때만 시간을 비교한다. `task_datetime`이 `+09:00` offset이 포함된 ISO 문자열이라 `new Date(...)`로 변환하면 서버의 로컬 타임존과 무관하게 항상 같은 절대 시각으로 비교된다 — `time.ts`가 "지금 몇 시인지 문자열을 만드는" 역할인 것과 달리, 여기는 "이미 만들어진 두 시각을 비교만 하는" 역할이라 타임존 보정이 필요한 지점이 다르다.

`data/fixtures/care-tasks.day5.json`의 5개 항목을 `now = 2026-06-24 09:00 KST`로 대입하면: `task_001`(복약, 09:00)만 4조건을 모두 통과해 `true`, `task_002`(점심확인, 12:00)는 아직 시간이 안 돼 `false`, `task_003`(산책, 내일)은 미래라 `false`, `task_004`는 ②에서, `task_005`는 ①에서 바로 탈락한다.

**🤖 AI 활용 팁**: "구현해줘"만 요청하면 코드만 받고 끝나는데, 구현 직후에 "이 로직 자세히 설명해줘"라고 한 번 더 물어보면 AI가 자기가 쓴 분기 순서(early return 순서, 경계값 처리 등)를 다시 점검하면서 설명하게 된다. 이 과정에서 "왜 ③이 ④보다 먼저 체크되어야 하는지" 같은, 코드만 보고는 바로 안 보이는 설계 의도가 드러난다. 코드 리뷰 대신 "설명시키기"로 검증하는 것도 방법이다.

---

## README/PRD 문서화 정리 + 숨어있던 `.gitignore` 버그 발견 (task 6.0 마무리)

**목표**: 지금까지 구현한 내용을 기준으로 `README.md`를 정리하고, `docs/PRD-web-input.md`에 구현 완료/다음 단계 범위를 명시한다.

**내용**:
- `README.md` 전면 재작성: 프로젝트 개요, 완성된 기능, 기술스택, 아키텍처 흐름, 실행 방법, 환경변수, Dry Run 모드 설명, 실제 Make Webhook 연결 절차, 테스트 방법, 아직 구현하지 않은 기능, 향후 구현 계획.
- `docs/PRD-web-input.md`: "구현 완료 범위" / "다음 단계로 분리한 범위" 섹션 추가, 10장(DoD) 체크리스트 전체 체크, 11장(리스크) 중 해결된 항목 표시.
- "완성된 기능" 목록에 Make Webhook 연동·GPT 파싱·Airtable 기록까지 포함했는데, 이 부분은 **이 저장소가 직접 구현한 게 아니라 Make.com 시나리오에서 동작**하는 부분이다. README/PRD 양쪽에 "이 저장소의 코드 범위는 어디까지인지"를 명시적으로 적어둠 — 안 그러면 이 저장소만 보는 사람이 "GPT 호출 코드가 어디 있지?"하고 헷갈릴 수 있다.

**발견한 버그**: `.env.example`이 `.gitignore`의 `.env*` 규칙에 걸려 **한 번도 git에 커밋된 적이 없었다.** README가 "`.env.example`을 복사해서 시작하라"고 안내하는데, 정작 그 파일이 저장소에 없으면 새로 합류하는 사람이 따라 할 수 없는 상황이었다. `.gitignore`에 `!.env.example` 예외를 추가해 해결.

**검증**: `tsc --noEmit`/`eslint .`(0 에러)/`npm run test`(15/15)/`npm run build` 모두 통과. (`SILVERLINK_DRY_RUN`이 실제 연동 확인을 위해 `false` + 실제 webhook URL로 설정되어 있는 상태라, 폼을 실제로 제출하는 E2E 테스트는 이번엔 의도적으로 돌리지 않음 — 운영 자동화를 의도치 않게 트리거하지 않기 위함.)

**변경 파일**: `README.md`, `docs/PRD-web-input.md`, `.env.example`(신규로 git 추적 시작), `.gitignore`, `tasks/tasks-web-input.md`(0.0~6.0 전체 체크 완료)

**AI 활용 팁**: "문서를 현재 상태에 맞게 정리해줘"라고 요청하면, AI가 단순히 글만 다시 쓰는 게 아니라 그 과정에서 "이 문서가 안내하는 대로 따라 하면 실제로 되는가"까지 검증하게 된다. 이번에도 README를 쓰다가 `.env.example`이 깨져 있었다는 걸 발견했다. 문서화를 "그냥 글쓰기"로 취급하지 말고 "문서에 적은 절차가 실제로 동작하는지 같이 확인해달라"고 명시하면 이런 숨은 버그를 덤으로 잡을 수 있다.

**커밋**: 이번 작업에서 진행

---

## 개념 정리: "E2E 테스트"가 뭔지 (Slice 4를 처음 접하고)

**계기**: Slice 4에서 처음으로 Playwright E2E 테스트를 만들었는데, 이런 방식의 테스트가 처음이라 개념부터 정리해둠. (이 항목은 코드 변경이 아니라 "지금까지 만든 게 정확히 뭔지" 복습용 — 다른 프로젝트에서도 똑같이 쓰일 개념이라 일지에도 남길 가치가 있음.)

### 자동화 테스트란?
사람이 매번 브라우저를 열고 손으로 클릭해서 "잘 되나?" 확인하는 대신, 그 과정을 코드로 적어두고 컴퓨터가 대신 클릭/입력/확인을 해주는 것. 한 번 만들어두면 코드를 고칠 때마다 몇 초 안에 "이전에 되던 게 여전히 되는지" 자동으로 재확인할 수 있다 (이걸 "회귀(regression) 테스트"라고 부름 — 새 기능을 추가하다가 옛날 기능을 망가뜨리는 걸 잡아냄).

### 이 프로젝트에 있는 두 종류의 테스트
| | 단위 테스트 (Vitest) | E2E 테스트 (Playwright) |
|---|---|---|
| 무엇을 확인하나 | 함수 하나(`buildSilverLinkPayload` 등)가 입력에 맞는 출력을 내는지 | **진짜 브라우저**로 화면을 열고, 사람처럼 입력하고 클릭해서, 화면에 뭐가 보이는지 |
| 속도 | 매우 빠름 (ms 단위, 15개가 0.3초) | 상대적으로 느림 (1개당 약 1초, 화면을 실제로 그려야 하니까) |
| 이 프로젝트 위치 | `src/lib/silverlink/__tests__/*.test.ts` | `tests/e2e/create-task.spec.ts` |
| 실행 명령 | `npm run test` | `npm run test:e2e` |
| 비유 | 자동차의 엔진 부품 하나만 뽑아서 시험대에 올려보는 것 | 실제로 차에 타서 시동 걸고 운전해보는 것 |

**E2E**는 "End-to-End"(처음부터 끝까지)의 줄임말 — "사용자가 페이지를 열고 → 입력하고 → 제출하고 → 결과를 본다"는 전체 흐름을 실제 브라우저로 검증한다는 뜻. 이번 슬라이스 목표였던 "브라우저에서 메시지를 제출한 뒤 Dry Run 성공 결과를 보는 흐름"이 바로 E2E 테스트가 해야 하는 일이었음.

### Playwright는 정확히 뭘 하는가?
Playwright가 실제 Chrome 브라우저(화면 없이 백그라운드로 띄우는 "헤드리스(headless)" 모드)를 코드로 직접 조작한다. `playwright.config.ts`의 `webServer` 설정 덕분에, 테스트 실행 시 우리 앱(`npm run dev`)이 안 켜져 있으면 자동으로 켜주고, 이미 켜져 있으면 그걸 그대로 재사용한다.

### "셀렉터"(요소를 찾는 방법) — role/label/text 기반이란?
화면에서 "전달하기 버튼"을 찾을 때, 두 가지 방식이 있다:
1. **기술적인 꼬리표로 찾기**: `<button data-testid="submit-btn">`처럼 테스트만을 위한 숨겨진 표식을 미리 박아두고 그걸로 찾기.
2. **사람이 보는 방식으로 찾기**: 화면에 보이는 글자("전달하기"), 버튼이라는 역할(role), 라벨("전하실 말씀")로 찾기 — 이번에 쓴 방식.

2번 방식의 장점: 실제 사용자(또는 화면 읽어주는 보조기기)가 화면을 인식하는 방식과 똑같아서, "버튼처럼 보이지만 진짜 버튼 역할이 아닌" 것 같은 실수도 같이 잡아준다. 그래서 이번 요구사항에서도 "가능하면 role/label/text, 필요할 때만 data-testid"라고 한 것 — 이번 폼은 라벨이 잘 갖춰져 있어서 꼬리표 없이도 다 찾을 수 있었음.

### 5개 테스트가 실제로 확인한 것
1. 페이지 로드 — 제목/제목글/기본 입력값이 제대로 보이는가
2. 정상 제출 — 메시지 쓰고 버튼 누르면 초록 성공 메시지가 뜨는가
3. 빈 메시지 제출 — 서버에 보내기도 전에 화면에서 막고 에러를 보여주는가
4·5. 결과 미리보기 — 서버가 진짜로 `source_channel: "web"`, 우리가 고른 `target_person`/`message`를 그대로 돌려주는가

**AI 활용 팁**: 새로운 도구/개념(이번엔 E2E 테스트)을 처음 도입할 때는, "구현해줘"만 시키고 끝내지 말고 "이게 정확히 뭘 하는 건지 쉬운 말로 설명해줘"를 같이 요청하면 좋다. 코드는 동작해도 본인이 그 코드가 뭘 보장하는지 모르면, 나중에 테스트가 실패했을 때 "이게 왜 실패했는지", "고쳐도 되는 건지 테스트를 잘못 만든 건지" 판단하기 어렵다.

**변경 파일**: 없음 (개념 설명만, 코드 변경 없음)

**커밋**: 대상 없음 (기록용 — 코드 변경이 없어 커밋할 diff가 없음)

---

## Slice 4: Playwright E2E 테스트 구현 (task 1.3, 5.0)

**목표**: 브라우저에서 사용자가 웹 입력창을 열고 메시지를 제출한 뒤 Dry Run 성공 결과를 보는 흐름을 E2E로 검증한다.

**내용**:
- `playwright.config.ts`(신규): `testDir: "./tests/e2e"`로 Vitest와 영역 분리, `baseURL: "http://localhost:3000"`, `webServer`로 dev 서버가 떠 있으면 재사용하고 없으면 `npm run dev`를 자동 기동하도록 설정.
- `tests/e2e/create-task.spec.ts`(신규): 5개 테스트 케이스 작성 — ① 페이지 로드(타이틀/헤딩/기본값/필드 존재), ② 정상 입력 제출 시 성공 메시지, ③ 빈 `message` 제출 시 클라이언트 검증 에러, ④ payload preview에 `source_channel: "web"` 노출, ⑤ payload preview에 `target_person`/`message` 노출. 전부 `role`/`label`/`text` 기반 셀렉터만 사용, `data-testid`는 추가하지 않음(요구사항대로 — 폼이 label/role을 이미 잘 갖추고 있어서 필요 없었음).
- 의존성: `@playwright/test`가 실제로는 설치돼 있지 않았다는 걸 이번에 발견 — 기존 `playwright` 패키지는 브라우저 자동화 라이브러리일 뿐, 테스트 러너(`test`/`expect` API)는 별도 패키지(`@playwright/test`)가 필요했음. 설치 후 두 패키지 버전이 1.61.1로 자동 정렬됨.

**막혔던 부분 1 — `npx playwright test`가 Vitest 테스트를 집어삼킴**: `@playwright/test`도 없고 `playwright.config.ts`도 없는 상태에서 `playwright test`를 실행하니, testDir 기본 탐색 범위가 너무 넓어서 `src/lib/silverlink/__tests__/*.test.ts`(Vitest용)까지 읽다가 "Vitest cannot be imported in a CommonJS module" 에러로 깨졌다. `testDir`를 명시하는 게 단순히 "정리"가 아니라 실제로 필요한 설정이었음.

**막혔던 부분 2 — `getByRole("alert", { name: ... })`가 못 찾음**: 빈 message 제출 시 보이는 에러(`<p role="alert">`)를 이름으로 찾으려 했는데, Next.js가 내부적으로 항상 렌더링하는 라우트 안내 요소(`#__next-route-announcer__`)도 `role="alert"`라서 1차로는 "strict mode violation"(요소 2개 매칭), `name` 옵션으로 좁혀도 원인 불명으로 매칭 실패. `getByRole("alert").filter({ hasText: "..." })`로 바꾸니 바로 해결 — accessible name 계산 대신 단순 텍스트 포함 여부로 필터링하는 쪽이 더 안정적이었다.

**검증**:
- `npm run test:e2e` 5/5 통과 — dev 서버가 이미 떠 있을 때(재사용)와 완전히 꺼져 있을 때(`webServer`가 자동 기동, ~4.8s) 둘 다 확인.
- `tsc --noEmit`/`eslint .`(0 에러)/`npm run test`(Vitest, 15/15, 영향 없음)/`npm run build` 모두 통과.
- `.gitignore`에 `test-results`/`playwright-report`/`blob-report` 추가 — Playwright 실행 결과물이 저장소에 섞여 들어가지 않도록.

**변경 파일**: `playwright.config.ts`(신규), `tests/e2e/create-task.spec.ts`, `package.json`/`package-lock.json`(`@playwright/test` 추가), `.gitignore`, `tasks/tasks-web-input.md`(체크박스 갱신)

**AI 활용 팁**: "설치되어 있다고 알려진 패키지"도 실제로 import/실행해서 확인하기 전까지는 믿지 않는 게 안전하다 — `playwright`가 devDependency에 있다고 해서 `@playwright/test`(테스트 러너)까지 갖춰진 건 아니었다. 또한 셀렉터가 "존재하긴 하는데 못 찾는" 상황을 만나면, 의미적으로 더 엄격한 옵션(`name`, accessible-name 매칭)보다 더 관대한 옵션(`filter({ hasText })`, 텍스트 포함)으로 한 단계 낮춰보는 게 디버깅 시간을 아껴준다.

**커밋**: 아직 안 함

---

## 성능 테스트: Pretendard 폰트 전송량 실측

**계기**: "성능 테스트는 어떻게 하나"라는 질문에 방법론만 설명하는 대신, 방금 추가한 Pretendard 폰트가 실제로 얼마나 무거운지 그 자리에서 측정해서 숫자로 보여줌.

**방법**: Playwright로 dev 서버에 접속한 뒤, 브라우저의 Navigation Timing API(`performance.getEntriesByType('navigation')`)와 Resource Timing API(`performance.getEntriesByType('resource')`)를 `page.evaluate()`로 읽어 로드 시각, 전체 리소스 전송량, 리소스별(특히 폰트) 전송량을 집계. Lighthouse 같은 풀 오디트 도구 없이도, "지금 이 페이지가 실제로 몇 KB를 받는가"는 이 정도로 충분히 확인 가능.

**결과**:
- 페이지 전체 전송량 약 2,861KB 중 `PretendardVariable.woff2` 단독이 2,010KB (전체의 약 70%)
- DOMContentLoaded 약 59ms, Load 약 220ms (로컬 dev 기준 — 폰트는 `font-display: swap`이라 텍스트 렌더링을 막지는 않음)

**판단**: weight별 정적 파일(Regular/SemiBold/Bold...)로 바꾸면 오히려 더 커짐 — 한글 폰트는 weight 1개당 전체 한글 글리프(1만 1천여 자)를 다시 포함하므로, weight 수만큼 용량이 곱연산됨. 지금 쓰는 Variable 폰트(모든 weight를 1개 파일에 포함)가 이미 더 효율적인 선택. 진짜로 줄이려면 유니코드 레인지 기반 동적 서브셋(자주 쓰는 한글 음절만 우선 로드)이 필요한데, 이건 `next/font/local`의 기본 API 밖이라 추가 작업이 필요함. 이번 MVP는 내부용 채널(자녀/관리자 한정 접근)이고 폰트는 브라우저가 캐싱하므로 최초 1회만 비용이 발생 — 지금 단계에서는 수용 가능한 트레이드오프로 판단하고 보류. 트래픽이 늘거나 모바일 데이터 환경이 중요해지면 서브셋 적용을 권장.

**AI 활용 팁**: "성능을 어떻게 테스트하느냐"는 질문에는 방법만 듣기보다, AI에게 "방법 알려주고 지금 이 프로젝트에 직접 한번 돌려봐"라고 요청하는 게 훨씬 실용적이다. 추상적 설명보다 실측 숫자가 훨씬 빨리 의사결정으로 이어지고, 그 과정에서 직접 요청하지 않은 잠재적 문제(이번엔 2MB 폰트)를 덤으로 발견하는 경우가 많다. 다만 측정값은 "지금 환경(로컬 dev, 캐시 없음)" 기준이라는 점을 함께 기록해둬야, 나중에 프로덕션 수치와 헷갈리지 않는다.

**변경 파일**: 없음 (측정만 수행, 코드 변경 없음)

**커밋**: 대상 없음 (기록용 — 코드 변경이 없어 커밋할 diff가 없음)

---

## Slice 3 후속 수정: 폼 톤을 4050세대 대상 "보기 편하고 세련된" 톤으로 재조정

**계기**: 사용자가 Slice 3의 "실버케어 따뜻한 톤"(stone/amber 팔레트)을 보고, 이 페이지의 실제 사용자는 어르신이 아니라 **자녀/관리자(4050세대)**이므로 "보기 편하면서도 세련된" 인상이 더 중요하다고 피드백.

**리서치**: Pretendard 폰트는 Apple 시스템 폰트 느낌을 재현해 가독성과 심미성이 모두 높다는 평가를 받으며, 2024년부터 대한민국 정부 범정부 UI/UX 디자인 시스템의 기본 서체(Pretendard GOV)로 채택될 만큼 한국 웹/앱 디자인의 사실상 표준이 됨 — [나무위키: Pretendard](https://namu.wiki/w/Pretendard), [GitHub: orioncactus/pretendard](https://github.com/orioncactus/pretendard). 40대 이상 사용자는 UI에서 '신뢰'와 '안정감'을 중시한다는 경향도 확인 — [10대가 게임할 때 60대는 '계산'…세대별 앱 사용 '제각각'](https://v.daum.net/v/20260331161701374).

**변경**:
- 폰트: `next/font/google`의 Geist Sans → `pretendard`(npm) 패키지의 Variable 폰트를 `next/font/local`로 자체 호스팅 (`weight: "45 920"`, CDN 의존 없이 빌드에 포함). Geist Mono는 JSON 미리보기용으로 유지.
- 색상: 따뜻한 중성색(`stone`)+오렌지(`amber`) → 차분한 한색 계열(`slate`)+신뢰감 있는 블루(`blue-600/700`, 국내 핀테크/서비스 앱에서 흔히 쓰는 "토스 블루" 계열 톤)로 전면 교체. 성공/실패는 기존 `emerald`/`rose` 유지.
- `globals.css`의 다크모드 대응 블록 제거 — 페이지가 명시적 라이트 톤(`slate-50`)으로 고정되어 있어, 어설픈 다크모드 대응이 오히려 불일치를 유발하므로 제거.
- `metadata`(title/description)를 boilerplate("Create Next App")에서 실제 서비스명으로 교체.

**시각 검증 방법**: Playwright(`chromium`, 이미 devDependency로 설치돼 있어 별도 설치 없이 사용 가능)로 dev 서버를 스크린샷 — 폼 기본 상태, 제출 후 성공 배너 + 최근 요청 목록 + 응답 미리보기까지 한 화면에서 시각적으로 확인. 결과: Pretendard 렌더링 깨끗함, blue/slate 조합이 의도한 대로 차분하고 신뢰감 있는 인상.

**검증**: `tsc --noEmit`/`eslint .`(0 에러)/`vitest run`(15/15)/`npm run build`(로컬 폰트 정상 로드) 모두 통과.

**변경 파일**: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/components/task-request-form.tsx`, `package.json`/`package-lock.json`(`pretendard` 의존성 추가)

**AI 활용 팁**: 타깃 사용자를 구체적으로 짚어주면("시니어"가 아니라 "시니어의 자녀인 4050세대") AI가 완전히 다른 디자인 방향을 제시한다. "톤을 바꿔줘"보다 "어떤 사용자가 어떤 인상을 받았으면 좋겠는지"를 말해주는 게 훨씬 효과적이었다. 또한 AI에게 직접 스크린샷을 찍어 보여달라고 요청하면, 텍스트로 디자인을 설명받는 것보다 피드백 루프가 훨씬 빨라진다(이미 Playwright가 설치돼 있다면 추가 설치 없이 바로 가능).

**커밋**: `b7bfbea`

---

## Slice 3: 웹 입력 폼 UI 구현 (task 4.0)

**목표**: PowerShell 없이 브라우저에서 직접 요청을 입력할 수 있는 자녀/관리자용 웹 입력 폼 UI 구현.

**내용**:
- `src/components/task-request-form.tsx` (client component, 신규 작성):
  - 입력 필드: `sender_name`(텍스트, 기본값 "자녀 테스트"), `target_person`(select, `schema.ts`의 `TARGET_PERSON_OPTIONS`를 그대로 재사용해 옵션 중복 정의 방지), `message`(textarea)
  - 제출 시 `fetch("/api/create-task", { method: "POST", ... })`로 3개 필드만 전송 (서버가 `source_channel`/`requested_at`/`today_date`를 부가)
  - `message`가 빈 값이면 프론트에서 제출 차단 + 인라인 에러
  - 제출 중 버튼 비활성화("전달하는 중...")
  - 성공/실패 상태를 색상 + 아이콘 + 텍스트로 함께 표시(색상 단독 의존 지양 — 접근성 리서치 반영)
  - 응답 전체(JSON)를 화면 하단에 `<pre>`로 미리보기
  - 최근 성공 요청 3개를 `localStorage`에 저장 — `useSyncExternalStore`로 구현 (아래 "기술적으로 흥미로웠던 부분" 참조)
- `src/app/page.tsx`: 기존 create-next-app 보일러플레이트 제거, 페이지 타이틀/설명 + `<TaskRequestForm />` 렌더링으로 교체

**UI 톤 리서치** (요구사항 10 — "따뜻하고 깔끔한 실버케어 톤"): 2026년 UI/UX 트렌드와 시니어 접근성 가이드를 웹 검색으로 확인.
- 2026년 트렌드: 쨍한 화이트보다 sand/stone/oatmeal 같은 따뜻한 중성색 계열, 디자인을 "정서적 케어의 수단"으로 보는 흐름 — [UI Color Trends to Watch in 2026](https://updivision.com/blog/post/ui-color-trends-to-watch-in-2026), [The Modern Color Palette: UI/UX Color Trends That Define 2026](https://recursion.software/blog/ui-color-trends-2026)
- 시니어 접근성: 큰 글씨, 충분한 명도 대비, 터치 영역 최소 48px, 상태 표현 시 색상에만 의존하지 말고 아이콘을 함께 — [UX Design for Seniors: Examples and Tips](https://www.eleken.co/blog-posts/examples-of-ux-design-for-seniors), [Elder-Friendly UI: Designing Accessible Digital Interfaces](https://www.aufaitux.com/blog/designing-elder-friendly-ui-interfaces/)
- 한국어 자료: 고대비, 색상 외 아이콘 병행, 접근성은 "선택이 아닌 필수" — [고령화 시대 시니어 사용자를 위한 디자인](https://ditoday.com/%EA%B3%A0%EB%A0%B9%ED%99%94-%EC%8B%9C%EB%8C%80%EC%97%90-%EB%96%A0%EC%98%A4%EB%A5%B4%EB%8A%94-%EC%83%88%EB%A1%9C%EC%9A%B4-%ED%83%80%EA%B9%83-%EC%8B%9C%EB%8B%88%EC%96%B4-%EC%82%AC%EC%9A%A9/)
- 적용: Tailwind 기본 팔레트 중 `stone`(따뜻한 중성색)을 배경/텍스트로, `amber-700`을 주요 액션 버튼(흰 텍스트와 AA 대비 확보)으로, `emerald`/`rose`를 성공/실패에 사용. 입력 필드는 `text-lg` + `py-3` 이상으로 터치 영역과 가독성 확보. 새 의존성(아이콘 라이브러리 등) 추가 없이 인라인 SVG로 체크/경고 아이콘 구현.

**기술적으로 흥미로웠던 부분**: `useEffect`에서 `setState`를 직접 호출해 localStorage를 읽는 1차 구현이 `eslint-plugin-react-hooks@7`의 신규 규칙 `set-state-in-effect`에 걸림. 단순 `eslint-disable` 대신, localStorage를 진짜 "외부 스토어"로 보고 `useSyncExternalStore`로 재구현 — 같은 탭에서 쓴 변경은 `storage` 이벤트가 안 뜨므로, `writeRecentRequest()`가 직접 리스너를 깨우는 방식으로 보완.

**검증**: `tsc --noEmit`/`eslint .`(0 에러)/`vitest run`(15/15, 변경 없음)/`npm run build` 모두 통과. dev 서버(`localhost:3000`)에 떠 있는 HTML을 curl로 확인해 한글 문구·기본값·select 옵션이 모두 정상 렌더링됨을 확인. 빌드된 `.next/static`·`.next/dev/static`에 webhook URL/변수명이 여전히 없음을 재확인.

**브라우저 확인**: `npm run dev` 후 `http://localhost:3000`에서 폼 동작 확인 가능 (사용자가 직접 시각적으로 확인 필요 — 자동화 도구로는 HTML 렌더링까지만 검증함).

**변경 파일**: `src/components/task-request-form.tsx`(신규), `src/app/page.tsx`, `tasks/tasks-web-input.md`(체크박스 갱신)

**AI 활용 팁**: "따뜻함", "세련됨" 같은 주관적인 톤 요구사항은 AI에게 "최신 트렌드를 검색해서 근거를 대줘"라고 명시하면, 감으로 고른 색이 아니라 출처가 있는 결정이 나온다(나중에 왜 그 색을 골랐는지 설명하기도 쉬워짐). 또한 AI가 작업 중 예상 못한 린트/타입 에러를 만났을 때, 곧바로 우회(disable)하지 말고 "왜 이 규칙이 생겼는지 이해하고 정석으로 풀어달라"고 요구하면 코드 품질이 한 단계 올라간다.

**커밋**: `b7bfbea`

---

## Slice 2 검증: 4개 항목 오류 점검 후 커밋

**목표**: Slice 2(POST /api/create-task) 구현이 끝난 뒤, 아래 4가지에 오류가 없는지 확인하고 문제 없으면 지금까지 작업을 커밋.

**점검 항목 및 결과**:
1. `message`가 비어 있으면 400 반환 — 다른 필드는 정상값으로 두고 단독 테스트, `too_small` 이슈로 400 확인. **문제 없음**.
2. `target_person`이 허용값이 아니면 400 반환 — 다른 필드는 정상값으로 두고 단독 테스트, `invalid_value` 이슈로 400 확인. **문제 없음**.
3. `SILVERLINK_DRY_RUN=true`이면 Make 미호출 — `make-client.ts`에서 `dryRun` 분기가 `fetch` 호출보다 먼저 실행되어 구조적으로 호출 불가함을 코드로 확인 + 실제 `.env.local`(DRY_RUN=true) 서버로 호출해 `{ ok:true, dryRun:true, payload }` 응답 재확인. **문제 없음**.
4. `MAKE_WEBHOOK_URL`이 프론트에 노출되지 않음 — `NEXT_PUBLIC_` 접두사 미사용, `env.ts`/`make-client.ts`는 `route.ts`(서버 전용 API Route)에서만 import, `"use client"` 컴포넌트 자체가 아직 없음, 빌드된 `.next/static`·`.next/dev/static`(브라우저로 서빙되는 정적 자산)을 grep해도 webhook URL 문자열/변수명이 전혀 없음. **문제 없음**.

**결론**: 4개 항목 모두 오류 없음 확인 → Slice 2 변경사항 전체를 커밋.

**AI 활용 팁**: 구현이 끝났다는 보고를 받자마자 바로 커밋하지 말고, 체크리스트(이번엔 4개 항목)를 명시적으로 주고 "이거 통과하면 커밋해"라고 시키면 AI가 빠짐없이 자가 검증하고, 그 결과가 로그로 남아 나중에 추적하기도 좋다.

**커밋**: 검증 대상 코드(`route.ts`/`env.ts`/`make-client.ts`/`vitest.config.ts`)는 `06be733`에 이미 포함되어 있었고, 이 검증 기록 자체는 `2a7a8cc`("Log Slice 2 verification...")로 커밋됨.

---

## Slice 2 후속 수정: API 응답 charset 누락으로 한글 깨짐

**증상**: 사용자가 Windows PowerShell `Invoke-RestMethod`로 `/api/create-task`를 호출했을 때 응답의 한글(`sender_name`, `target_person`, `message` 등)이 `ê¹ìë` 식으로 깨져서 출력됨.

**원인**: `NextResponse.json()`이 기본적으로 `Content-Type: application/json`만 설정하고 `charset`을 명시하지 않음. curl/브라우저는 charset이 없어도 JSON을 UTF-8로 간주하지만, Windows PowerShell 5.1의 `Invoke-RestMethod`/`Invoke-WebRequest`는 charset이 없으면 UTF-8이 아닌 인코딩(주로 ISO-8859-1)으로 응답 본문을 디코딩해 한글이 mojibake로 깨짐. 서버 버그는 아니지만 클라이언트 호환성을 위해 명시하는 것이 맞음.

**수정**: `src/app/api/create-task/route.ts`에 `jsonResponse()` 헬퍼를 추가해 모든 응답에 `Content-Type: application/json; charset=utf-8`을 명시. `NextResponse.json()` 대신 표준 `Response`를 직접 사용.

**검증**: `tsc --noEmit`/`eslint`/`vitest run`(15/15)/`npm run build` 모두 통과. `curl -i`로 응답 헤더에 `charset=utf-8`이 포함됨을 확인.

**변경 파일**: `src/app/api/create-task/route.ts`

**AI 활용 팁**: 버그를 보고할 때 "PowerShell에서 한글이 깨진다"처럼 증상과 사용한 도구(어떤 클라이언트, 어떤 명령)를 구체적으로 말해주면, AI가 "서버 버그"와 "클라이언트의 인코딩 추정 방식 차이"를 구분해서 진단할 수 있다. 증상만 보고 서버 코드를 의심 없이 고치기 시작하면 헛다리를 짚기 쉽다.

**커밋**: `06be733`

---

## Slice 2: POST /api/create-task Route Handler + Make Webhook 클라이언트 (task 3.0, 일부 1.4/1.6)

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

**AI 활용 팁**: 외부 연동(웹훅 등)이 있는 기능은 처음부터 "Dry Run 모드"를 요구사항에 넣으면, AI와 함께 빠르게 반복 작업하면서도 실제 운영 시스템을 건드릴 걱정이 없다. 진짜 호출이 필요한 실패 케이스(URL 없음, 타임아웃 등)는 별도 포트의 임시 서버 + 가짜/빈 URL로 격리하도록 명시하면, 테스트 중 실수로 운영 webhook을 건드리는 사고를 막을 수 있다.

**커밋**: `06be733`

---

## 빌드/테스트 에러 수정

**내용**: `tasks-web-input.md`의 특정 테스크는 아니고, 현재 코드베이스 점검 중 발견한 에러 2건 수정.

1. **Vitest가 Playwright e2e 스펙을 잘못 실행**
   - 증상: `npx vitest run` 시 `tests/e2e/create-task.spec.ts`(Playwright용 빈 placeholder)를 vitest 기본 글롭이 집어서 "No test suite found" 실패.
   - 수정: `vitest.config.ts` 신규 생성, `include: ["src/**/*.test.ts", "src/**/*.test.tsx"]`, `exclude: ["node_modules", "tests/e2e/**"]`로 범위 분리.
2. **`npm run build` 타입체크 실패**
   - 증상: `src/app/api/create-task/route.ts`가 빈 파일(0바이트)이라 Next.js 16.2.9 typed-routes 검증기가 "is not a module"로 빌드 실패.
   - 수정: 최소 placeholder(`export {}` + "task 3.0 구현 전" 주석)로 모듈화. 실제 핸들러 로직은 아직 구현하지 않음 (task 3.0에서 진행).

**검증**: `tsc --noEmit` 통과, `eslint .` 통과, `vitest run` 15/15 통과, `npm run build` 성공.

**변경 파일**: `vitest.config.ts`(신규), `src/app/api/create-task/route.ts`

**AI 활용 팁**: "기능 구현해줘"만 시키면 놓치기 쉬운 "하네스 자체의 결함"(테스트 러너 설정, 빌드 설정 등)은 "에러 있는지 확인해줘"처럼 열린 질문을 주기적으로 던져야 드러난다. 기능 요청과 별개로, 가끔 전체 점검을 시키는 습관이 누적된 잡버그를 줄여준다.

**커밋**: `06be733`

---

# 2026-06-23

## Slice 1: 입력 스키마와 payload 생성 로직 구현 (tasks 2.0, 5.1–5.2)

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

**AI 활용 팁**: PRD/태스크 문서를 먼저 만들게 하고 "Go라고 입력하면 다음 단계로 넘어가겠다" 같은 명시적 체크포인트를 두면, AI가 한꺼번에 너무 많은 걸 구현해버리는 걸 막고 매 단계마다 방향을 확인할 수 있다. 슬라이스(Slice) 단위로 "이번에 수정/생성할 파일 목록"을 프롬프트에 못박아주는 것도 범위가 새는 걸 막는 데 효과적이었다.

**커밋**: `a4dab07` (브랜치 `feature/web-input-channel`)
