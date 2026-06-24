# PRD: Member-Scoped Parent Profile MVP (Day 6+7)

## 0. 문서 정보
- 상태: Draft (가정 포함, 확정 전)
- 작성일: 2026-06-25
- 범위: 회원(자녀/보호자) 인증 도입 + 부모님/어르신 프로필을 회원 계정 아래에 소유권이 명확하게 등록·관리하는 구조. Supabase를 메인 DB로 두고 RLS로 회원 간 데이터를 격리한다.
- 관련 문서: [`docs/PRD-day6-7-auth-parent-profile.md`](./PRD-day6-7-auth-parent-profile.md)(같은 챕터의 선행 분석/계획 문서), [`docs/PRD-web-input.md`](./PRD-web-input.md)(Day4), [`docs/PRD-notification-engine-code-first.md`](./PRD-notification-engine-code-first.md)(Day5)

## 1. 목적

인증 없이 누구나 쓸 수 있던 단일 입력 폼을, **로그인한 자녀/보호자가 자신이 등록한 부모님/어르신에게만 일정을 만들 수 있는 구조**로 전환한다. 동시에 `care_tasks`/`message_logs`의 실제 저장소를 Make/Airtable에서 **Supabase로 이전**하고, 회원·부모님 단위로 데이터 소유권을 DB 레벨(RLS)에서 강제한다.

## 2. 왜 회원가입/로그인이 필요한가

- 지금까지는 인증이 전혀 없어서, 누구나 폼에 들어가 임의의 메시지를 만들 수 있었다 — "이게 누구의 요청인지"를 시스템이 전혀 모른다.
- 부모님/어르신의 일정·메시지·생활 정보는 민감한 개인정보다. "누가 무엇을 볼 수 있는가"를 구분하려면 그 "누가"가 먼저 존재해야 한다 — 즉 회원 개념이 선행 조건이다.
- 장기적으로 SMS/카카오 발송, RAG 개인화로 확장될수록 데이터가 더 민감해지고 양도 많아진다. 회원 단위 격리를 처음부터 깔아두지 않으면, 나중에 실제 데이터가 쌓인 뒤에 격리를 추가하는 것이 훨씬 위험하고 비싸다.
- 회원가입/로그인은 "기능 추가"가 아니라 **이후 모든 기능(부모님 등록, 일정 생성, 알림, RAG)이 의존하는 전제 조건**이다.

## 3. 왜 부모님/어르신을 회원 계정 아래에 등록해야 하는가

- 제품 철학상 **부모님/어르신은 로그인하지 않는다.** 어르신께는 앱 설치나 로그인 없이 카카오톡/문자/전화/음성 같은 익숙한 채널로만 닿아야 한다(Blueprint 1장).
- 따라서 부모님은 "독립된 계정"이 될 수 없고, **자녀 계정에 속한 레코드**(`parent_profiles`)로만 존재해야 한다.
- 한 자녀가 아버지와 어머니를 동시에 돌보는 경우처럼, 회원 한 명이 여러 부모님을 관리할 수 있어야 한다 — 즉 `회원 : 부모님 = 1 : N` 관계로 설계한다.
- 이렇게 모델링해야 "이 일정/메시지는 누구의 부모님에 대한 것인가"가 항상 명확해지고, 그 명확함을 그대로 RLS 정책(`owner_user_id`)으로 옮겨 회원 간 데이터 격리를 구현할 수 있다.

## 4. 사용자 모델

| 구분 | 정의 | 인증 |
|---|---|---|
| **회원 (자녀/보호자)** | Supabase Auth로 가입·로그인하는 주체. 부모님/어르신을 대신해 일정을 입력하고 알림을 관리 | 이메일+비밀번호 로그인 |
| **부모님/어르신** | 회원의 관리 대상자. **회원가입하지 않음**, `parent_profiles` 레코드로만 존재 | 없음(계정 자체가 없음) |

- 회원 1명 : 부모님 N명 (1:N)
- **회원 A는 회원 B의 부모님 정보·일정·메시지 로그를 절대 조회할 수 없다** — 애플리케이션 로직이 아니라 DB 레벨(RLS)에서 강제한다.

## 5. 구현 범위

- Supabase Auth 회원가입/로그인/로그아웃
- 보호 라우트(비로그인 시 `/login` 리다이렉트) — 입력 폼, 부모님 관리, 알림 미리보기 전부 포함
- `profiles`/`parent_profiles` 테이블 + RLS
- 부모님/어르신 등록·목록 UI (`/parents`, 입력 폼과 분리된 별도 페이지)
- 웹 입력창의 `target_person`(자유 텍스트) → `target_person_id`(등록된 부모님 select)로 전환
- `care_tasks`/`message_logs`를 Supabase 테이블로 설계·적용(RLS 포함), 기존 Make Webhook→Airtable 경로는 **레거시 호환 경로**로 보존(플래그로 on/off)
- RAG 확장용 필드, SMS/카카오 확장용 필드를 `parent_profiles`에 미리 준비(로직 구현은 범위 밖)

## 6. 구현하지 않을 범위

- 실제 SMS 발송, 실제 카카오 알림톡 발송 (필드만 준비)
- 실제 부모님/어르신 개인정보 사용 (테스트 계정 + 테스트 데이터만)
- `notification_queue`/`delivery_attempts`/`response_events`/`rag_documents`/`rag_chunks` 등 향후 테이블 (Day8+)
- 관리자 등 멀티 역할(role) 분기 로직
- `/parents/[id]` 상세·수정 페이지 (향후 확장)
- `/delivery-preview` 실제 구현 (라우트 존재만 인지)
- 사용자 승인 없는 대규모 리팩토링, 사용자 승인 없는 `git push`

## 7. Supabase Auth 구조

- `@supabase/supabase-js` + `@supabase/ssr`로 Next.js App Router 세션을 서버/클라이언트 양쪽에서 처리
- **회원가입(`/signup`)**: 이메일/비밀번호. 가입 성공 시 트리거로 `profiles` 행 자동 생성
- **로그인(`/login`)**: 이메일/비밀번호. 성공 시 `/dashboard`로 이동
- **로그아웃**: 세션 종료 후 `/login`으로 이동
- **세션 확인**: 보호 라우트마다 서버에서 세션 유무 확인 → 없으면 `/login`으로 리다이렉트 (미들웨어 또는 레이아웃 단 서버 가드, ⚠️ Next.js 16.2.9 공식 문서 확인 후 tasks 단계에서 방식 확정 — AGENTS.md 지침)
- ⚠️ 로그인 후 원래 가려던 페이지로 되돌리는 기능은 이번 범위에서 보류, 단순히 `/dashboard`로 이동

## 8. parent_profiles 데이터 모델

```sql
parent_profiles (
  id                      uuid primary key default gen_random_uuid(),
  owner_user_id           uuid not null references auth.users(id),
  display_name            text not null,            -- 자녀가 정한 호칭 (예: "아버지", 실명 등)
  relationship            text,                      -- 예: "아버지"/"어머니"/"기타"
  phone                    text,                      -- 14장: SMS/카카오 확장용
  notification_preference text default 'none',       -- 14장: 'sms' | 'kakao' | 'none'
  care_context             text,                      -- 13장: RAG 확장용
  daily_routine            text,                      -- 13장: RAG 확장용
  medication_notes         text,                      -- 13장: RAG 확장용
  communication_style      text,                      -- 13장: RAG 확장용
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
)
```

`display_name`만 필수, 나머지는 선택 입력 — 항목이 많으므로 입력 폼(`/dashboard/create-task`)과 분리된 별도 페이지(`/parents`)에서 관리한다.

## 9. owner_user_id 기반 데이터 소유권

- `parent_profiles`/`care_tasks`/`message_logs` **모든 테이블에 `owner_user_id`를 직접 둔다** — 조인 없이 단순 `auth.uid() = owner_user_id` 검사로 RLS를 구성할 수 있게 하기 위함.
- `profiles`는 `id`가 곧 `auth.users.id`이므로 별도 `owner_user_id`가 필요 없다(`auth.uid() = id`로 검사).
- ⚠️ **RLS의 한계**: `owner_user_id` 단일 검사만으로는 "남의 `parent_id`를 자기 `owner_user_id`로 끼워 넣어 `care_tasks`를 만드는" 시나리오까지는 못 막는다. 이건 API Route 서버 코드에서 "`parent_id`가 실제로 로그인 사용자 소유의 `parent_profiles`인지"를 한 번 더 조회·검증하는 방식으로 보완한다.

## 10. RLS 정책

```sql
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

`care_tasks`/`message_logs`도 동일한 4종 정책(`select`/`insert`/`update`/`delete`)을 `owner_user_id` 기준으로 적용한다. `profiles`는 `auth.uid() = id` 기준 `select`/`update`만 허용(삭제·임의 insert 불가).

## 11. 웹 입력창 변경사항

**클라이언트가 보내는 입력** (Day4 `taskRequestInputSchema`를 대체, breaking change):
```ts
{
  target_person_id: string;  // 로그인 사용자의 parent_profiles.id 중 하나 (자유 텍스트 아님, select로 선택)
  message: string;
}
```

**서버가 부가/검증하는 값**:
- 로그인 세션에서 `owner_user_id` 추출
- `target_person_id`가 이 `owner_user_id` 소유의 `parent_profiles`인지 검증 (아니면 403)
- 검증된 `parent_profiles.display_name`을 `target_person`(텍스트) 스냅샷으로 변환 — Make 레거시 호환용(12장)
- `sender_name`은 ⚠️ 더 이상 클라이언트 자유 입력이 아니라, 로그인 사용자의 이메일에서 서버가 파생 (스푸핑 방지)
- `source_channel`/`requested_at`/`today_date`는 Day4와 동일하게 서버가 생성

**부모님 미등록 시 처리**: 로그인 사용자에게 등록된 `parent_profiles`가 하나도 없으면, 입력 폼 대신 "먼저 부모님/어르신을 등록해 주세요" 안내와 `/parents` 링크를 보여준다.

## 12. care_tasks/message_logs 확장 계획

Supabase를 메인 DB로 두고, 기존 Make Webhook→Airtable 경로는 **레거시 호환 경로**로 보존한다(즉시 삭제하지 않음).

```sql
care_tasks (
  id                   uuid primary key default gen_random_uuid(),
  owner_user_id        uuid not null references auth.users(id),
  parent_id            uuid not null references parent_profiles(id),
  target_person        text not null,        -- Make 레거시 호환용 텍스트 스냅샷
  sender_name          text not null,        -- 서버가 로그인 사용자 정보로 파생
  message               text not null,
  task_title            text,
  task_type             text,
  task_datetime         timestamptz,
  status                text not null default 'scheduled',  -- scheduled | completed
  priority              text default 'medium',
  confirmation_message  text,
  parent_notified       boolean not null default false,
  notification_status   text not null default 'none',       -- none | prepared | sent
  source_channel        text not null default 'web',
  requested_at          timestamptz not null default now(),
  today_date            date not null default current_date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

message_logs (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  parent_id     uuid not null references parent_profiles(id),
  care_task_id  uuid references care_tasks(id),
  direction     text not null,          -- inbound | outbound
  channel       text not null,          -- web | system | kakao | sms
  raw_message   text not null,
  status        text not null default 'logged',
  created_at    timestamptz not null default now()
);
```

- 처리 순서: 검증 → Supabase `care_tasks` insert(메인) → Supabase `message_logs` insert(`direction: "inbound"`, 메인) → (선택) Make Webhook 레거시 동기화 → 응답.
- 새 환경변수 `LEGACY_MAKE_SYNC_ENABLED`(기본값 `false`)로 Make 호출 여부를 제어한다. `true`로 켜면 기존과 동일한 payload(`sender_name`/`target_person`/`message`/`source_channel`/`requested_at`/`today_date`)로 Make Webhook을 그대로 호출한다.
- ⚠️ `LEGACY_MAKE_SYNC_ENABLED=true`에서 Make 호출이 실패해도, Supabase insert(메인)는 이미 성공했으므로 사용자 응답을 막지 않고 로그만 남기는 방향을 제안 — tasks 단계에서 확정.

## 13. RAG 확장 필드

`parent_profiles`에 다음 필드를 미리 둔다(8장 스키마에 포함됨, RAG 로직 자체는 이번 범위 밖):
- `care_context` — 성향/관계/주의사항 등 자유 텍스트
- `daily_routine` — 기상/식사/복약/운동/병원 일정 등
- `medication_notes` — 복약 관련 메모
- `communication_style` — 선호하는 말투/대화 스타일

## 14. SMS/카카오 알림톡 확장 필드

`parent_profiles`에 다음 필드를 미리 둔다(실제 발송 로직·API 연동은 이번 범위 밖):
- `phone` — 발송 대상 전화번호
- `notification_preference` — 선호 채널(`'sms' | 'kakao' | 'none'` 등, 정확한 enum은 Day8~10에서 확정)

## 15. 테스트 시나리오

1. 비로그인 상태로 보호 라우트(`/dashboard`, `/dashboard/create-task`, `/parents`, `/notifications`) 접근 시 `/login`으로 리다이렉트되는가
2. 회원가입 → 로그인 → 부모님 등록 → 일정 생성까지 전체 플로우가 정상 동작하는가
3. 테스트 계정 2개(회원 A, B)로 교차 확인 시, 서로의 `parent_profiles`/`care_tasks`/`message_logs`가 전혀 보이지 않는가 (RLS 검증)
4. 등록된 부모님이 없는 회원이 `/dashboard/create-task`에 접근하면 안내 문구와 `/parents` 링크가 보이는가
5. 일정 생성 시 Supabase `care_tasks`/`message_logs`에 `owner_user_id`/`parent_id`가 정확히 채워져 insert되는가
6. `LEGACY_MAKE_SYNC_ENABLED=false`(기본값) 상태에서 Make/Airtable로 어떤 네트워크 요청도 나가지 않는가
7. `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트 번들/응답에 노출되지 않는가
8. `npm run test`/`npm run build`가 모두 통과하는가 (Day4/5의 기존 테스트가 breaking change로 깨졌다면 같은 슬라이스에서 함께 갱신)
