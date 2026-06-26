# SilverLink AI — 프로젝트 현황 종합 (2026-06-25 기준)

이 문서는 외부 AI(다른 챗봇)에게 보여주거나, 이후 방향을 고민할 때 참고할 수 있도록 **이 시점까지의 전체 현황을 한 파일에 모은 아카이브 문서**입니다. 코드를 직접 보지 않고도 이 문서만으로 프로젝트의 구조·진행도·남은 일을 파악할 수 있게 작성했습니다.

---

## 1. 프로젝트 한 줄 정의

SilverLink AI는 **자녀(보호자)가 웹에서 부모님(어르신)의 일정/돌봄 요청을 등록하고, 어르신은 새 앱 설치나 로그인 없이 링크 또는 (장차) 전화로 응답하며, 그 모든 기록을 자녀가 대시보드와 RAG 챗봇으로 확인할 수 있게 하는 가족 돌봄 운영체제**다.

핵심 원칙(전체 프로젝트에 일관되게 적용):
- 어르신은 절대 회원가입하지 않는다. 자녀/보호자만 계정을 가진다.
- 모든 데이터는 `owner_user_id`(+ 필요시 `parent_id`) 기준으로 회원 간 완전히 격리된다(Supabase RLS로 DB 레벨에서 강제).
- 실제 외부 발송(SMS/카카오/전화)은 항상 Mock으로 먼저 검증하고, 명시적 플래그가 켜져야만 실제로 나간다.
- `SUPABASE_SERVICE_ROLE_KEY`(만능키)는 앱 코드 어디에서도 쓰지 않는다 — anon key + RLS만으로 보안을 구성한다.

---

## 2. 전체 로드맵 — 어디까지 왔는가

| 구간 | 내용 | 상태 |
|---|---|---|
| Day 4 | 웹 입력 폼 MVP (sender/target/message → Make Webhook) | ✅ 완료 |
| Day 5 | 코드 기반 알림 준비 엔진(Make-free, Dry Run) | ✅ 완료 |
| Day 6+7 | Supabase Auth 회원가입/로그인, 부모님 프로필, care_tasks/message_logs를 메인 DB로 전환 | ✅ 완료 |
| **Day 8** | **알림 발송 큐(notification_queue) + 발송 시도 기록(delivery_attempts) + Mock Provider** | ✅ 완료 (오늘) |
| **Day 9** | **어르신 링크 응답(`/r/[token]`, 로그인 없이 응답)** | ✅ 완료 (오늘) |
| **Day 10** | **자녀 대시보드(일정/응답 모니터링)** | ✅ 완료 (오늘) |
| **Day 11** | **AI 비서 안부전화 Mock(`/dashboard/calls`)** | ✅ 완료 (오늘) |
| Day 12 | Scripted IVR 실제 전화 Provider(Twilio 등) 연동 준비 | ⏳ 미착수 |
| Day 13 | RAG-lite 챗봇(웹사이트에 부모님별 AI 비서 결합) | ⏳ 미착수 |
| Day 14 | 벡터 RAG 또는 실시간 Voice Agent 중 택1 | ⏳ 미착수 |
| Day 15 | 최소 MVP 데모 완성 + 문서화 | ⏳ 미착수 |

**전체 로드맵(Day8~15) 기준 체감 진행도: 대략 70%.** 새 기능으로 가장 묵직하게 남은 것은 RAG 챗봇(Day13) 하나이고, Day12(실제 전화)는 "코드로 못 붙이면 가이드 문서로 대체해도 된다"는 방침이 있어 비교적 가볍게 끝낼 수 있는 선택지가 있다. Day14/15는 결정/정리 위주라 가볍다.

---

## 3. 기술 스택

- **프레임워크**: Next.js 16.2.9 (App Router, Turbopack)
- **언어/UI**: TypeScript, React 19.2.4, Tailwind CSS v4
- **검증**: Zod v4
- **DB/Auth**: Supabase (`@supabase/supabase-js` ^2.108.2, `@supabase/ssr` ^0.12.0) — Postgres + Row Level Security + (Day9부터) SECURITY DEFINER SQL 함수
- **이메일**: Resend 커스텀 SMTP(Supabase Auth 메일 발송용, 무료 플랜 레이트리밋 회피)
- **테스트**: Vitest(유닛), Playwright(E2E, 일부만 작성됨)
- **레거시 연동**: Make.com Webhook → Airtable(현재는 `LEGACY_MAKE_SYNC_ENABLED` 플래그로 선택적 호출, 기본 꺼짐)

---

## 4. 사용자/데이터 모델

| 구분 | 정의 | 인증 |
|---|---|---|
| 회원(자녀/보호자) | Supabase Auth로 가입·로그인 | 이메일+비밀번호 |
| 부모님/어르신 | 회원에게 속한 `parent_profiles` 레코드. 회원가입 안 함 | 없음(`/r/[token]`은 토큰으로만 접근) |

### 전체 테이블 목록 (모두 RLS 적용, `auth.uid() = owner_user_id` 기준)

| 테이블 | 만들어진 시점 | 핵심 필드 | 비고 |
|---|---|---|---|
| `parent_profiles` | Day6+7 | `display_name`, `relationship`, `phone`, `notification_preference`, `care_context`, `daily_routine`, `medication_notes`, `communication_style` | RAG/SMS/카카오 확장용 필드 미리 준비됨 |
| `care_tasks` | Day6+7 | `target_person`, `original_request`, `status`(`scheduled`/`completed`/`help_requested`/`snoozed`), `priority`, `completed_at`, `notification_status` | Make/Airtable 레거시 구조를 최대한 보존 |
| `message_logs` | Day6+7 | `direction`(`inbound`/`outbound`/`parent_response`), `sender`, `receiver`, `raw_message`, `source_channel` | 모든 채널의 메시지 기록 |
| `notification_queue` | **Day8** | `channel`(`link`/`sms`/`kakao_alimtalk`/`voice_call`/`web_push`), `response_token`, `status`(`pending`~`responded`), `expires_at`(기본 3일 TTL) | voice_call 확장 필드(`call_script`/`call_goal`/`max_attempts`) 포함 |
| `delivery_attempts` | **Day8** | `provider`(`mock`/`twilio`/`kakao_partner`/`sms_provider`/`vapi`/`retell`), `request_payload`/`response_payload`(jsonb) | Day8~11 전체에서 `mock`만 실제 사용 |
| `care_call_schedules` | **Day11** | `call_type`, `schedule_time`, `days_of_week`, `consent_status` | **테이블만 존재, 관리 UI는 아직 없음**(반복 트리거는 Day12+ 영역) |
| `care_call_attempts` | **Day11** | `status`(`prepared`~`help_requested`), `call_script`, `parent_response`, `risk_level`(`none`~`high`) | Mock 안부전화 시도 기록 |

### 익명 접근을 위한 SECURITY DEFINER 함수 (Day9에서 도입, 유일한 예외)

테이블 자체에는 익명(anon) select/update 정책을 추가하지 않았다 — 그러면 공개된 anon key로 누구나 전체 데이터를 긁어갈 수 있기 때문. 대신 "토큰을 정확히 아는 사람만 한 행에 접근 가능한" 함수 2개만 anon에 노출:
- `get_notification_by_token(p_token)`: 토큰과 일치하는 알림 1건만 반환
- `respond_to_notification(p_token, p_action)`: 만료/중복응답 체크 후 `notification_queue`/`care_tasks`/`message_logs`를 한 트랜잭션으로 갱신

---

## 5. 화면/라우트 전체 목록

| 라우트 | 목적 | 인증 |
|---|---|---|
| `/signup`, `/login` | 회원가입/로그인 | 비로그인 전용 |
| `/dashboard` | 허브(부모님 관리/일정 만들기/알림 미리보기/오늘의 일정/응답 기록/안부전화 링크 모음) | 필요 |
| `/parents` | 부모님 등록·조회·수정(같은 폼 재사용) | 필요 |
| `/dashboard/create-task` | 일정(요청) 생성 | 필요 |
| `/delivery-preview` | Day8 — 발송 큐 Mock 생성 | 필요 |
| `/dashboard/tasks` | Day10 — 전체 일정 + 큐 상태 | 필요 |
| `/dashboard/responses` | Day10 — 어르신 응답 기록 모음 | 필요 |
| `/dashboard/parents/[parentId]` | Day10 — 부모님별 일정+응답 모아보기 | 필요 |
| `/dashboard/calls` | Day11 — 안부전화 Mock | 필요 |
| `/r/[token]` | Day9 — **어르신용**, 로그인 없이 링크 응답 | **불필요(토큰 기반)** |
| `/notifications` | Day5 — 알림 준비 미리보기(아직 Supabase 미연동 레거시) | 필요 |

---

## 6. 안전/보안 관련 누적 규칙 (절대 어기지 않은 것들)

- `.env.local` 내용을 화면에 출력하지 않음
- `SUPABASE_SERVICE_ROLE_KEY`는 앱 코드에서 import조차 안 함
- 실제 SMS/카카오/전화 발송 없음 — 전부 `MockDeliveryProvider`(Day8)와 키워드 기반 결정론적 스크립트 생성기(Day11)로만 검증, 실제 LLM/외부 API 호출 0건
- 외부 서비스를 건드리는 테스트(curl 등) 전에는 항상 관련 env 플래그(`SILVERLINK_DRY_RUN`, `LEGACY_MAKE_SYNC_ENABLED`)를 그 턴에 직접 확인 — Day5에서 이 규칙을 안 지켜 실제 Make 시나리오가 1회 잘못 실행된 사고가 있었고, 그 이후 항상 지킴
- 익명 사용자가 닿을 수 있는 새 기능(Day9)에서는 RLS를 느슨하게 푸는 대신 SECURITY DEFINER 함수로 권한 상승 범위를 좁힘

---

## 7. 아직 안 한 것 / 남은 일 (우선순위 순)

1. **회원 A/B 데이터 격리 "실제" 검증** — Day6+7부터 미뤄온 항목. RLS로 구조적으로는 막혀 있지만, 실제 계정 두 개로 직접 격리를 확인한 적은 아직 없음. "모든 기능을 다 만들고 마지막에 한 번에 하자"는 결정이 아직 실행되지 않은 상태. (Supabase Dashboard → Authentication → Users → "Add user"로 두 번째 확인된 계정을 만들어 진행할 계획)
2. **Day 13 — RAG-lite 챗봇** (가장 묵직하게 남은 새 기능): 부모님별 `care_context`/`daily_routine`/`medication_notes`/`care_tasks`/`message_logs`/`call_attempts`를 검색해 답하는 챗봇. owner_user_id+parent_id 필터를 DB 쿼리 레벨에서 강제해야 함(OWASP LLM Top 10 — 프롬프트 인젝션/데이터 유출 대응).
3. **Day 12 — 실제 전화 Provider 연동 준비**: Twilio Voice(또는 대체 API)로 실제 전화를 걸 수 있는 구조 준비. `ENABLE_REAL_CALLS=false`가 기본값. 코드로 직접 못 붙이면 가이드 문서(`docs/voice-call-provider-*.md`)로 대체 가능.
4. **Day 14 — 벡터 RAG 또는 Voice Agent 선택**: RAG-lite가 잘 동작하면 `pgvector`로 확장할지, 전화 쪽이 더 중요하면 실시간 Voice Agent(Twilio/Vapi/Retell/OpenAI Realtime)로 갈지 결정.
5. **Day 15 — 최소 MVP 데모**: 12단계 데모 시나리오(로그인 → 부모님 등록 → 일정 생성 → 큐 생성 → 링크 응답 → 대시보드 반영 → 안부전화 Mock → RAG 챗봇 요약)를 끝까지 시연 가능하게 정리.
6. **(실제 런칭 전 필수, 급하지 않음) Resend 커스텀 도메인 인증**: 현재 Resend가 샌드박스 발신 주소(`onboarding@resend.dev`)라 본인 계정 이메일로만 회원가입 확인 메일이 간다. 실제 다양한 사용자를 받으려면 커스텀 도메인 인증이 먼저 필요.
7. (마이너) Day5 알림 준비 엔진의 Supabase 연동 — `/notifications` 페이지가 아직 fixture 기반이라 실제 회원의 Supabase `care_tasks`를 보지 않음.

---

## 8. 알려진 설계상 트레이드오프 (의도적 결정, 버그 아님)

- `/dashboard/parents/[parentId]`는 전용 단일 조회 API 없이 기존 목록 API들을 클라이언트에서 필터링 — 현재 데이터량에서는 합리적 선택이라 판단.
- `care_call_schedules`는 테이블만 있고 관리 UI 없음 — 반복 트리거에 실제 스케줄러가 필요해 Day12+ 영역과 맞물림.
- `care_tasks.target_person`(자유 텍스트 스냅샷)과 `parent_profiles`(정식 레코드)가 같은 사람을 가리키는 이중 구조 — Make/Airtable 레거시 호환을 위해 의도적으로 유지.
