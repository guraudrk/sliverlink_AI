# PRD: Day 6+7 — Auth, Parent Profile & Supabase DB Migration

## 0. 문서 정보
- 상태: Draft (가정 포함, 확정 전 — ⚠️ 표시된 항목은 tasks 단계에서 최종 확정)
- 작성일: 2026-06-25
- 범위: Supabase Auth(회원가입/로그인) 도입, 보호 라우트 적용, `parent_profiles`/`care_tasks`/`message_logs`를 Supabase 메인 DB로 구축(RLS 포함), 기존 Make Webhook→Airtable 흐름은 **레거시 호환 경로**로 보존
- 기준 문서: [`SilverLink_AI_Bidirectional_RAG_Product_Blueprint.md`](../SilverLink_AI_Bidirectional_RAG_Product_Blueprint.md) 14장 로드맵의 Day6(회원/부모님)+Day7(DB 이전)을 한 챕터로 통합
- 선행 문서: [`docs/PRD-web-input.md`](./PRD-web-input.md)(Day4), [`docs/PRD-notification-engine-code-first.md`](./PRD-notification-engine-code-first.md)(Day5)

> **Day 6+7 목표**: "누구나 쓸 수 있는 입력 폼"을 "로그인한 자녀/보호자가 자신이 등록한 부모님에게만 일정을 만들 수 있는 서비스"로 전환하고, 데이터 저장소를 Make/Airtable에서 Supabase로 옮기되 기존 경로를 끊지 않는다.

## 1. 배경 / 목적

Day4~5는 인증이 없는 단일 입력 폼이었고, `target_person`은 `"아버지 테스트"`/`"어머니 테스트"` 두 값으로 하드코딩되어 있었다. 실제 서비스가 되려면:
- 자녀/보호자가 **자기 계정**으로 로그인해야 하고,
- 자신이 등록한 **실제 부모님/어르신 레코드**만 선택할 수 있어야 하며,
- 다른 회원의 부모님 정보·일정·메시지 로그를 **절대 볼 수 없어야** 한다.

또한 지금까지 `care_tasks`/`message_logs`의 실제 저장소는 Make.com 시나리오가 만드는 Airtable이었다(이 저장소는 Webhook 호출까지만 책임). 이번 챕터에서는 Blueprint 8장의 Airtable 샘플 테이블 구조를 그대로 Supabase 스키마로 옮겨 **Supabase를 메인 DB**로 전환하고, RAG(11~13일차)·SMS/카카오 발송(8~10일차) 확장에 필요한 필드를 미리 준비해 둔다.

## 2. 핵심 흐름 (End-to-End)

```
[자녀/보호자]
  → /signup, /login (Supabase Auth)
  → /parents 에서 부모님/어르신 프로필 등록
  → /dashboard/create-task 에서 등록된 부모님을 선택해 일정(요청) 작성
        │
        ▼
[Next.js API Route]
  - 로그인 세션 확인 (없으면 401 → 클라이언트가 /login으로 리다이렉트)
  - target_person_id가 "이 로그인 사용자가 등록한 parent_profiles"인지 검증
  - Supabase care_tasks insert (owner_user_id, parent_id 포함)   ← 신규 메인 경로
  - Supabase message_logs insert (direction: "inbound")           ← 신규 메인 경로
        │
        ├─ LEGACY_MAKE_SYNC_ENABLED=true (선택) ─────────────┐
        │                                                     ▼
        │                                        [Make.com Webhook] (레거시 호환, 10장 참고)
        │                                                     ▼
        │                                        [GPT 파싱 → Airtable 기록] (기존 Day4 경로, 그대로 보존)
        ▼
[응답: { ok, taskId, ... }]
        │
        ▼
[/notifications] — Day5 due task 판단/알림 준비 로직이 이제 Supabase care_tasks를 입력으로 사용 (fixture는 테스트용으로 계속 병행)
```

이 챕터부터 **Supabase가 진실의 원천(source of truth)**이고, Make/Airtable은 "예전 경로를 당장 끄지 않기 위한 선택적 백업"으로 격하된다.

## 3. 사용자와 역할

- **회원가입하는 사람 = 자녀/보호자뿐이다.** 부모님/어르신은 회원가입하지 않는다.
- 부모님/어르신은 자녀/보호자 계정 아래에 속한 **`parent_profiles` 레코드**로만 존재한다(로그인 계정 없음).
- **데이터 격리 원칙**: 회원 A는 회원 B의 `parent_profiles`/`care_tasks`/`message_logs`를 절대 조회할 수 없다 — 이는 애플리케이션 로직이 아니라 **Supabase RLS(6장)로 DB 레벨에서 강제**한다.
- 역할(role) 구분은 이번 범위에서는 단일 역할(`caregiver`)만 존재한다. `profiles.role` 컬럼은 두되, 관리자 등 추가 역할은 향후 확장으로 분리한다.

## 4. 라우트 구조

| 라우트 | 보호 여부 | 설명 |
|---|---|---|
| `/` | 공개 | 로그인 상태면 `/dashboard`로, 비로그인이면 `/login`으로 리다이렉트 |
| `/login` | 공개 | 로그인 폼 |
| `/signup` | 공개 | 회원가입 폼 |
| `/dashboard` | **보호** | 로그인 후 허브 화면 — 부모님 등록 현황, 빠른 링크(`/parents`, `/dashboard/create-task`, `/notifications`) |
| `/dashboard/create-task` | **보호** | Day4 입력 폼의 후신. 로그인 사용자의 `parent_profiles`로만 대상자 선택 |
| `/parents` | **보호** | 부모님/어르신 목록 + 등록 폼 (8장) |
| `/notifications` | **보호** | Day5 알림 준비 미리보기 — Supabase `care_tasks` 기반으로 동작 (fixture는 테스트 환경에서 계속 사용) |
| `/delivery-preview` | **보호** (Day8+ 구현 예정) | `notification_queue`/`delivery_attempts` 미리보기용 예약 라우트. 이번 챕터에서는 빈 placeholder만 두거나 생성하지 않음(19장 참고) |

비로그인 사용자가 보호 라우트에 접근하면 **`/login`으로 리다이렉트**한다(요구사항 그대로).

> ⚠️ Next.js 16.2.9의 미들웨어/인증 가드 구현 방식은 `node_modules/next/dist/docs/`에서 공식 문서를 확인한 뒤 tasks 단계에서 구체적인 구현(미들웨어 vs 레이아웃 단의 서버 컴포넌트 가드)을 확정한다(AGENTS.md 지침).

## 5. 데이터 모델 (Supabase)

Blueprint 8장의 Airtable 샘플 구조를 최대한 그대로 옮기고, Day4/Day5에서 이미 검증된 필드(`source_channel`/`requested_at`/`today_date`/`notification_status`/`parent_notified`)를 합쳤다.

### 5.1 `profiles` (자녀/보호자 — `auth.users` 미러)

```sql
profiles (
  id            uuid primary key references auth.users(id),
  email         text not null,
  role          text not null default 'caregiver',
  created_at    timestamptz not null default now()
)
```
> ⚠️ Supabase Auth는 `auth.users`를 직접 노출하지 않으므로, 클라이언트에서 안전하게 조회 가능한 `profiles` 테이블을 둔다. `auth.users` insert 시 트리거로 `profiles` 행을 자동 생성하는 방식을 tasks 단계에서 설계한다.

### 5.2 `parent_profiles` (부모님/어르신 — 회원가입 없음)

```sql
parent_profiles (
  id                     uuid primary key default gen_random_uuid(),
  owner_user_id          uuid not null references auth.users(id),
  display_name           text not null,           -- 예: "아버지", "어머니", 실명 등 자녀가 정한 호칭
  relationship           text,                     -- 예: "아버지"/"어머니"/"기타" (자유 입력 또는 enum, tasks에서 확정)
  phone                  text,                     -- SMS/카카오 확장용 (8번 요구사항)
  notification_preference text default 'none',     -- 'sms' | 'kakao' | 'none' 등 (8번 요구사항)
  care_context           text,                     -- RAG 확장용 (7번 요구사항)
  daily_routine          text,                     -- RAG 확장용
  medication_notes       text,                     -- RAG 확장용
  communication_style    text,                     -- RAG 확장용
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
)
```

### 5.3 `care_tasks`

```sql
care_tasks (
  id                  uuid primary key default gen_random_uuid(),
  owner_user_id       uuid not null references auth.users(id),
  parent_id           uuid not null references parent_profiles(id),
  target_person       text not null,        -- Make 레거시 호환용 텍스트 스냅샷 (parent_profiles.display_name 복제, 10장 참고)
  sender_name         text not null,        -- ⚠️ 로그인 사용자 이메일에서 서버가 파생 (클라이언트 입력 아님, 9장 참고)
  message              text not null,        -- Day4 원본 요청 메시지
  task_title           text,                 -- Day5/Blueprint 호환 (없으면 message 앞부분으로 생성, tasks에서 규칙 확정)
  task_type            text,                 -- medication/meal_check/exercise/hospital_visit 등 (Day5 fixture와 동일 어휘)
  task_datetime        timestamptz,          -- 알림 기준 시각 (Day5 task_datetime과 동일 역할)
  status               text not null default 'scheduled', -- scheduled | completed
  priority             text default 'medium',             -- low | medium | high
  confirmation_message text,                 -- outbound 메시지 초안 (Day5 buildOutboundMessage 결과 저장 가능)
  parent_notified      boolean not null default false,
  notification_status  text not null default 'none',      -- none | prepared | sent
  source_channel       text not null default 'web',
  requested_at         timestamptz not null default now(),
  today_date           date not null default current_date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
)
```

> ⚠️ `target_person`(텍스트)과 `parent_id`(FK)가 같은 의미를 두 형태로 들고 있는 게 중복으로 보일 수 있지만, **의도적 중복**이다 — `parent_id`는 Supabase 내부 관계용, `target_person`은 Make 시나리오가 지금 그대로 기대하는 필드명/형식을 깨지 않기 위한 레거시 호환용 스냅샷이다(10장).

### 5.4 `message_logs`

```sql
message_logs (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  parent_id     uuid not null references parent_profiles(id),
  care_task_id  uuid references care_tasks(id),
  direction     text not null,           -- inbound | outbound
  channel       text not null,           -- web | system | kakao | sms (Day5 outboundLogCandidate.source_channel과 어휘 통일)
  raw_message   text not null,
  status        text not null default 'logged',
  created_at    timestamptz not null default now()
)
```

### 5.5 향후 테이블 (이번 범위 아님, 20장 참고)
`notification_queue`, `delivery_attempts`, `response_events`, `rag_documents`, `rag_chunks` — Blueprint 8장에 정의되어 있으나 Day8 이후(배송 어댑터/RAG) 작업이므로 이번 챕터에서는 테이블을 만들지 않는다.

## 6. RLS(Row Level Security) 정책 설계

네 테이블(`profiles`, `parent_profiles`, `care_tasks`, `message_logs`) 모두 RLS를 활성화하고, **모든 테이블에 `owner_user_id`를 직접 두어** 조인 없이 단순하게 검사한다.

```sql
-- 공통 패턴 (테이블마다 반복)
alter table parent_profiles enable row level security;

create policy "owner can select own parent_profiles"
  on parent_profiles for select
  using (auth.uid() = owner_user_id);

create policy "owner can insert own parent_profiles"
  on parent_profiles for insert
  with check (auth.uid() = owner_user_id);

create policy "owner can update own parent_profiles"
  on parent_profiles for update
  using (auth.uid() = owner_user_id);

create policy "owner can delete own parent_profiles"
  on parent_profiles for delete
  using (auth.uid() = owner_user_id);
```

`care_tasks`/`message_logs`도 동일한 4개 정책(`select`/`insert`/`update`/`delete`)을 `owner_user_id` 기준으로 적용한다. `profiles`는 `auth.uid() = id` 기준으로 `select`/`update`만 허용(삭제/임의 insert 불가 — insert는 트리거가 담당).

> ⚠️ `care_tasks`/`message_logs`의 insert 시 `parent_id`가 **해당 `owner_user_id` 소유의 `parent_profiles`인지**까지는 RLS의 단순 `owner_user_id` 검사만으론 보장되지 않는다(다른 사람 parent_id를 자기 owner_user_id로 끼워넣는 시나리오). 이건 API Route 서버 코드에서 "parent_id가 로그인 사용자 소유인지" 한 번 더 검증하는 방식으로 막는다(9장).

## 7. 인증 흐름

- **회원가입(`/signup`)**: 이메일/비밀번호 기반 Supabase Auth 가입. 가입 성공 시 `profiles` 행 자동 생성(트리거).
- **로그인(`/login`)**: 이메일/비밀번호 로그인. 성공 시 `/dashboard`로 이동.
- **로그아웃**: 대시보드 등에 로그아웃 버튼, 세션 종료 후 `/login`으로 이동.
- **세션 확인/리다이렉트**: 보호 라우트(4장)는 서버에서 세션 유무를 확인하고, 없으면 `/login`으로 리다이렉트. 로그인 후 원래 가려던 페이지로 되돌아가는 기능은 ⚠️ 이번 범위에서는 보류(단순히 `/dashboard`로 보내는 것으로 충분).

## 8. 부모님 프로필 관리 (`/parents`)

- **목록**: 로그인 사용자의 `parent_profiles`만 카드/리스트로 표시.
- **등록 폼**: `display_name`(필수), `relationship`, `phone`, `notification_preference`, `care_context`, `daily_routine`, `medication_notes`, `communication_style`(전부 선택 입력 가능, `display_name`만 필수) — 항목이 많으므로 입력 폼과 분리된 별도 페이지로 둔다(사용자 결정).
- **수정/상세**: 이번 범위는 등록+목록까지. `/parents/[id]`(상세/수정)는 ⚠️ 향후 확장으로 분리(20장) — 단, 데이터 모델은 `id` 기반이라 추가가 쉬움.
- **`/dashboard/create-task`와의 연결**: 등록된 `parent_profiles`가 하나도 없으면, 입력 폼 대신 "먼저 부모님/어르신을 등록해 주세요" 안내와 `/parents` 링크를 보여준다(요구사항 그대로).

## 9. 일정 생성 폼 변경 (`/dashboard/create-task`)

**클라이언트가 보내는 입력** (Day4의 `taskRequestInputSchema`를 대체):
```ts
{
  target_person_id: string;  // 로그인 사용자의 parent_profiles.id 중 하나 (select로 선택, 더 이상 자유 텍스트 아님)
  message: string;
}
```

**서버가 부가/검증하는 값** (클라이언트가 보낼 수 없음 — Day4의 신뢰 경계 원칙을 그대로 유지):
- 로그인 세션에서 `owner_user_id` 추출
- `target_person_id`가 **이 `owner_user_id` 소유의 `parent_profiles`인지** 조회로 검증 (아니면 403)
- 검증된 `parent_profiles.display_name` → `target_person`(텍스트) 스냅샷 생성 (Make 레거시 호환, 5.3 참고)
- `sender_name` ⚠️은 `profiles.email`(또는 `auth.users.email`)에서 서버가 파생 — 클라이언트가 더 이상 자유 입력하지 않음(Day4까지는 자유 텍스트였으나, 이제 실제 로그인 사용자가 있으므로 스푸핑 방지)
- `source_channel`/`requested_at`/`today_date`는 Day4와 동일하게 서버가 생성

**처리 순서**: 검증 → Supabase `care_tasks` insert(메인) → Supabase `message_logs` insert(`direction: "inbound"`, 메인) → (선택) Make Webhook 레거시 동기화(10장) → 응답.

`sender_name`이 더 이상 자유 텍스트가 아니게 되면서 Day4 스키마(`taskRequestInputSchema`)는 이번 챕터에서 **breaking change**가 된다 — 기존 폼/테스트는 tasks 단계에서 함께 갱신한다.

## 10. Make/Airtable 레거시 통합 (과도기 호환)

- Day4에서 만든 `src/lib/silverlink/make-client.ts`(`sendToMakeWebhook`)와 `MAKE_WEBHOOK_URL`/`SILVERLINK_DRY_RUN`은 **삭제하지 않는다.**
- 새 환경변수 `LEGACY_MAKE_SYNC_ENABLED`(기본값 `false`)를 추가한다 — Supabase가 메인이 된 이후에는 기본적으로 Make를 호출하지 않되, 필요 시(Airtable 쪽 데이터를 계속 미러링하고 싶을 때) `true`로 켜면 기존과 동일한 payload(`sender_name`/`target_person`/`message`/`source_channel`/`requested_at`/`today_date`)로 Make Webhook을 그대로 호출한다.
- 이 흐름은 README/work-log에 "**레거시 호환 경로(legacy integration)**"로 명시적으로 문서화한다 — 새로 합류하는 사람이 "왜 Make 코드가 아직 있지?"라고 헷갈리지 않도록.
- ⚠️ `LEGACY_MAKE_SYNC_ENABLED=true`일 때 Supabase insert가 성공하고 Make 호출이 실패하면 어떻게 할지(전체 실패 처리 vs 경고만 남기고 계속)는 tasks 단계에서 확정한다. 기본 방향은 "Supabase 쓰기가 메인이므로, 레거시 동기화 실패는 로그만 남기고 사용자 응답은 막지 않는다"로 제안한다.

## 11. 환경 변수

| 변수 | 용도 | 노출 범위 | 기본값 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 클라이언트 공개 가능(Supabase 설계상 anon key와 함께 공개되어도 안전) | 없음(필수) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 클라이언트 공개(RLS로 보호됨) | 없음(필수) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 관리자 키(트리거/마이그레이션 등) | **서버 전용, 절대 클라이언트 번들/응답에 노출 금지** | 없음(필수) |
| `LEGACY_MAKE_SYNC_ENABLED` | Make Webhook 레거시 동기화 on/off | 서버 전용 | `false` |
| `MAKE_WEBHOOK_URL` / `SILVERLINK_DRY_RUN` | (기존, Day4) Make Webhook 호출 | 서버 전용 | 기존과 동일 |

`.env.example`에 위 신규 변수를 마스킹된 형태로 추가한다(Day4에서 `.env.example`이 `.gitignore`에 걸려 누락됐던 사고를 반복하지 않도록 재확인).

## 12. 보안 요구사항

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 모듈에서만 import하고, 클라이언트 컴포넌트/API 응답/로그에 절대 포함하지 않는다.
- 모든 `parent_profiles`/`care_tasks`/`message_logs` 접근은 RLS로 1차 방어, API Route에서 `parent_id` 소유권을 2차로 검증한다(6장 ⚠️ 참고).
- `.env.local`은 기존과 동일하게 Git에 절대 커밋하지 않고, 내용을 대화/로그에 출력하지 않는다.
- 이번 챕터의 모든 검증·테스트는 **실제 부모님 개인정보가 아닌 테스트 계정 + 테스트 데이터**로만 수행한다.
- 실제 SMS/카카오 알림톡 발송은 이번 챕터에서 절대 호출하지 않는다(필드만 준비).

## 13. 비기능 요구사항

- **데이터 격리**: 회원 간 데이터 비침투(RLS로 보장, E2E 테스트로 회귀 검증 — 16장).
- **하위 호환**: Day4/Day5에서 만든 순수 함수(`isDueTask`/`buildOutboundMessage`/`prepareNotification`)는 입력 타입만 Supabase `care_tasks` 행에 맞게 조정하고, 로직 자체는 재사용한다(Day5 work-log의 "순수 로직과 외부 어댑터 분리" 원칙 그대로 적용).
- **마이그레이션 가시성**: Supabase 마이그레이션 SQL은 파일로 저장해 버전 관리한다(`supabase/migrations/` 등, tasks 단계에서 디렉터리 확정).

## 14. 기술 스택 추가 사항

- `@supabase/supabase-js`, `@supabase/ssr`(Next.js App Router 세션 처리용) 신규 설치
- Next.js 16.2.9의 인증/미들웨어 관련 공식 문서를 구현 전 확인(AGENTS.md 지침, 4장 ⚠️ 참고)

## 15. 테스트 계획

- **유닛(Vitest)**: 입력 스키마(9장의 새 스키마) 검증, `parent_id` 소유권 검증 로직(순수 함수로 분리 가능하면 분리), Day5 알림 로직이 Supabase 행 타입으로도 동일하게 동작하는지.
- **E2E(Playwright)**: 비로그인 시 보호 라우트 접근 → `/login` 리다이렉트 확인, 회원가입→로그인→부모님 등록→일정 생성까지의 전체 플로우, 회원 A가 회원 B의 데이터를 볼 수 없는지(테스트 계정 2개로 교차 확인).
- 모든 테스트는 **실제 Supabase 테스트 프로젝트(또는 로컬 Supabase) + 테스트 계정**으로 동작, 실제 SMS/카카오/Make 호출 없이 수행한다(`LEGACY_MAKE_SYNC_ENABLED=false` 기준).

## 16. Day 6+7 구현 범위

- Supabase Auth 회원가입/로그인/로그아웃
- 보호 라우트(미들웨어 또는 서버 가드) + 비로그인 시 `/login` 리다이렉트
- `profiles`/`parent_profiles`/`care_tasks`/`message_logs` 테이블 + RLS
- `/parents` 목록/등록 페이지
- `/dashboard`, `/dashboard/create-task`(Day4 폼의 후신) 페이지
- 입력 스키마를 `target_person_id` 기반으로 전환, `target_person` 텍스트는 서버가 파생해 레거시 호환 유지
- `LEGACY_MAKE_SYNC_ENABLED` 플래그로 Make Webhook 레거시 경로 보존
- Day5 알림 준비 로직이 Supabase `care_tasks`를 입력으로 받을 수 있도록 타입/연결 조정

## 17. Day 6+7에서 하지 않을 것

- 실제 SMS 발송, 실제 카카오 알림톡 발송(필드만 준비)
- 실제 부모님 개인정보 사용(테스트 데이터만)
- `notification_queue`/`delivery_attempts`/`response_events`/`rag_documents`/`rag_chunks` 테이블 생성(Day8+)
- `/delivery-preview` 페이지 실제 구현(라우트만 인지, 19장)
- `/parents/[id]` 상세/수정 페이지(향후 확장)
- 관리자 등 멀티 역할(`role`) 분기 로직
- 승인 없는 대규모 리팩토링, 승인 없는 git push

## 18. 성공 기준 (Definition of Done)

- [ ] 회원가입 → 로그인 → 로그아웃 전체 플로우 동작
- [ ] 비로그인 상태로 `/dashboard`, `/dashboard/create-task`, `/parents`, `/notifications` 접근 시 `/login`으로 리다이렉트
- [ ] `/parents`에서 부모님 등록 → 목록에 즉시 반영
- [ ] `/dashboard/create-task`의 대상자 select가 로그인 사용자의 `parent_profiles`만 보여줌(타인 데이터 미노출)
- [ ] 부모님이 없는 상태에서 `/dashboard/create-task` 접근 시 "먼저 등록해 주세요" 안내 + `/parents` 링크 표시
- [ ] 일정 생성 시 Supabase `care_tasks`/`message_logs`에 정상 insert (`owner_user_id`/`parent_id` 포함)
- [ ] 테스트 계정 2개로 교차 확인 시 서로의 데이터가 전혀 보이지 않음(RLS 검증)
- [ ] `LEGACY_MAKE_SYNC_ENABLED=false`(기본값) 상태에서 Make/Airtable로 어떤 요청도 나가지 않음
- [ ] `npm run test`/`npm run build` 통과
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트 번들/응답에 노출되지 않음(번들 grep으로 확인)

## 19. 리스크 / 오픈 이슈

1. `sender_name` 파생 방식(`profiles.email` 그대로 vs 별도 `display_name` 컬럼 추가) — tasks 단계에서 확정 필요.
2. `care_tasks.parent_id` 소유권 검증을 RLS만으로는 완전히 막을 수 없는 케이스(6장 ⚠️) — API 서버 검증 로직 설계 필요.
3. `LEGACY_MAKE_SYNC_ENABLED=true`일 때 Make 호출 실패 처리 정책(10장 ⚠️) — 기본 제안(로그만, 응답 차단 안 함)을 확정할지 논의 필요.
4. 로컬 개발 시 실제 Supabase 클라우드 프로젝트를 쓸지, Supabase CLI 로컬 스택을 쓸지 — 비용/속도 트레이드오프, tasks 단계에서 결정.
5. Day5 fixture(`data/fixtures/care-tasks.day5.json`) 기반 테스트를 이번에 완전히 Supabase 테스트 데이터로 대체할지, 유닛 테스트는 fixture를 계속 쓰고 E2E만 실제 Supabase를 쓸지 — 절충안 필요.

## 20. 향후 계획 (Day 8+, 이번 범위 아님)

- `notification_queue`/`delivery_attempts`/Mock·SMS·Kakao `Provider` 인터페이스 도입(Blueprint 6장 Delivery Adapter 전략)
- 실제 SMS 1건 테스트 발송(Day9), 카카오 알림톡 템플릿 준비(Day10)
- `response_events`로 어르신의 "완료"/"도움 필요" 응답 처리
- `rag_documents`/`rag_chunks` 기반 부모님 프로필 개인화 RAG(Day11~13)
- `/parents/[id]` 상세/수정, `/delivery-preview` 실제 구현
- 관리자 등 추가 역할(role) 분기

## 21. 다음 단계

이 PRD를 기준으로 `tasks/tasks-day6-7-auth-parent-profile.md`의 상위 테스크를 작성한다(사용자가 "Go"라고 하면 하위 테스크로 분해).
