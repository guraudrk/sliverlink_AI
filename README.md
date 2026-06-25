# SilverLink AI — Web Input Channel

## 1. 프로젝트 개요

SilverLink AI는 자녀·관리자가 어르신(대상자)에게 전달할 요청이나 안부 메시지를 입력하면, AI가 이를 해석해 케어 업무(`care_tasks`)와 메시지 로그(`message_logs`)로 자동 정리해주는 서비스입니다.

이 저장소는 그 첫 입력 채널인 **웹 입력 폼**을 구현합니다. 자세한 제품 요구사항은 [`docs/PRD-web-input.md`](docs/PRD-web-input.md), 작업 단위 진행 기록은 [`docs/work-log.md`](docs/work-log.md)를 참고하세요.

> **Day 4 목표**: 웹 입력 채널 MVP 완성. 어르신께 알림을 발송하는 단계(카카오톡 발송, 완료 응답 처리 등)는 다음 단계 백로그로 분리되어 있습니다 (10장 참고).

## 2. 현재 완성된 기능

> ⚠️ **Day 6+7부터 입력 흐름이 크게 바뀌었습니다.** 아래는 Day4 시점 기록이고, 현재 실제 동작은 13장을 함께 참고하세요 — `/`는 더 이상 공개 입력 폼이 아니라 로그인 여부에 따른 리다이렉트 진입점이며, 입력 폼은 `/dashboard/create-task`(로그인 필요)로 이동했습니다.

- Next.js 기반 웹 입력창 (Day4 시점: `/`, Day6+7부터: `/dashboard/create-task`)
- `sender_name`(보내는 분), `target_person_id`(로그인 회원이 등록한 부모님 중 선택), `message`(전하실 말씀) 입력
- `/api/create-task` 서버 API Route
- Zod 기반 입력 검증 (클라이언트·서버 공용 스키마)
- Dry Run 모드(Make 경로에 한정, 13장 참고)
- 실제 Make Webhook 연동(Day6+7부터 `LEGACY_MAKE_SYNC_ENABLED` 플래그로 선택적 호출, 기본 꺼짐)
- GPT 파싱 자동화와 연결(Make 시나리오 쪽)
- Supabase `care_tasks`/`message_logs` 저장(Day6+7부터 메인 경로, 13장 참고)

> ℹ️ **이 저장소의 코드 범위는 "웹 입력 → 검증 → Supabase 저장(+ 선택적 Make Webhook 호출)"까지입니다.** Make Webhook 호출 이후 단계(GPT 파싱, Airtable 기록)는 **Make.com 시나리오에서 구성**되어 동작하며, 이 Next.js 앱이 직접 GPT나 Airtable API를 호출하지 않습니다. 자세한 경계는 4장/13장을 참고하세요.

## 3. 기술 스택

- **프레임워크**: Next.js 16.2.9 (App Router, Turbopack)
- **언어/UI**: TypeScript, React 19, Tailwind CSS v4
- **폰트**: Pretendard (`next/font/local`로 자체 호스팅)
- **검증**: Zod
- **테스트**: Vitest(유닛), Playwright(E2E)
- **연동**: Make.com Webhook (서버 사이드 전용 호출)

## 4. 아키텍처 흐름

```
[브라우저: 웹 입력 폼]
  sender_name / target_person / message 입력
        │ POST
        ▼
[Next.js API Route: /api/create-task]   ← 이 저장소가 구현하는 범위
  Zod로 입력 검증
  source_channel="web" / requested_at / today_date 부가
        │
        ├─ SILVERLINK_DRY_RUN=true  → 실제 호출 없이 payload만 응답
        │
        ▼ SILVERLINK_DRY_RUN=false
[Make.com Webhook]                       ← 여기서부터는 Make.com 시나리오
        ▼
[GPT 파싱: 메시지 해석/구조화]
        ▼
[Airtable care_tasks 생성]
        ▼
[Airtable message_logs inbound 기록]
```

`source_channel`은 입력 채널을 식별하는 필드로, 현재는 항상 `"web"`이 고정값으로 들어갑니다. 추후 카카오톡 등 다른 채널이 추가되면 같은 `/api/create-task` 파이프라인을 재사용하면서 `source_channel` 값만 바뀌는 구조를 염두에 두고 설계되어 있습니다.

## 5. 실행 방법

```bash
npm install
cp .env.example .env.local   # 값을 채워 넣기 (6장 참고)
npm run dev
```

브라우저에서 http://localhost:3000 을 열면, 로그인 상태에 따라 `/dashboard` 또는 `/login`으로 자동 이동합니다(Day6+7부터, 13장 참고). 회원가입은 `/signup`에서 진행하며, Supabase 프로젝트의 URL/anon key를 `.env.local`에 먼저 채워야 정상 동작합니다.

## 6. 환경변수 설명

| 변수 | 설명 | 노출 범위 | 기본값 |
|---|---|---|---|
| `MAKE_WEBHOOK_URL` | Make.com Webhook 엔드포인트 | **서버 전용** — API Route(`route.ts`)에서만 읽고, 클라이언트 코드/응답 어디에도 포함되지 않음 | 없음 (필수) |
| `SILVERLINK_DRY_RUN` | 실제 Webhook 호출 여부 | 서버 전용 | `true` (`"false"` 문자열만 false로 처리) |
| `LEGACY_MAKE_SYNC_ENABLED` | Supabase 저장 후 레거시 Make Webhook도 같이 호출할지 여부(Day6+7) | 서버 전용 | `false` (`"true"` 문자열만 true로 처리) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL(Day6+7) | 클라이언트에 노출됨(공개 가능한 값) | 없음 (필수) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key — RLS로 접근이 제한됨(Day6+7) | 클라이언트에 노출됨(공개 가능한 값) | 없음 (필수) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | **현재 앱 코드에서는 사용하지 않음** — RLS를 우회하는 키라 보관만 하고 호출하지 않는 것이 원칙 | 없음 (선택) |

- `.env.local`은 `.gitignore`의 `.env*` 규칙으로 **Git에 절대 업로드되지 않습니다.** 실제 값은 로컬에만 보관하세요.
- `.env.example`은 값이 마스킹된 템플릿입니다. 처음 셋업할 때 이 파일을 복사해서 시작하세요.

## 7. Dry Run 모드 설명

`SILVERLINK_DRY_RUN`은 기본값이 `true`인 **안전 스위치**입니다.

- **`true`(기본값)**: `/api/create-task`가 입력을 검증하고 payload를 만들지만, 실제로 Make Webhook에 네트워크 요청을 보내지 않습니다. 대신 서버 콘솔에 `[silverlink] DRY_RUN: skipping Make webhook call` 로그와 함께 payload를 출력하고, 응답으로 `{ ok: true, dryRun: true, payload: {...} }`를 돌려줍니다.
- **`false`**: 실제로 `MAKE_WEBHOOK_URL`에 POST 요청을 보냅니다. 이 경우 Make.com 시나리오가 트리거되어 GPT 파싱 → Airtable 기록까지 실제로 일어납니다.

개발·테스트 중에는 항상 `true`로 두는 것을 권장합니다. 실제 연동을 확인해야 할 때만 8장의 절차대로 잠깐 `false`로 바꿔서 사용하세요.

## 8. 실제 Make Webhook 연결 방법

1. Make.com에서 시나리오의 Webhook URL을 발급받습니다.
2. `.env.local`의 `MAKE_WEBHOOK_URL`에 해당 URL을 입력합니다.
3. 실제 연동을 확인할 때만 `SILVERLINK_DRY_RUN=false`로 변경합니다.
4. 개발 서버를 재시작합니다(`npm run dev`는 `.env.local` 변경 시 재시작이 필요합니다).
5. 웹 폼에서 메시지를 제출합니다 — 정상이라면 Make.com 시나리오 실행 이력(History)에 새 항목이 생기고, 이어서 Airtable에 `care_tasks`/`message_logs`가 기록됩니다.
6. 확인이 끝나면 다시 `SILVERLINK_DRY_RUN=true`로 되돌려, 실수로 테스트 제출이 실제 자동화를 반복 실행시키지 않도록 합니다.

> ⚠️ `SILVERLINK_DRY_RUN=false` 상태에서는 폼을 제출할 때마다 실제로 Make.com 자동화가 동작합니다(Airtable에 실제 레코드가 생성됨). 개발 중 반복 테스트가 필요하면 다시 `true`로 돌려두세요.

## 9. 테스트 방법

| 종류 | 명령 | 대상 |
|---|---|---|
| 유닛 테스트 (Vitest) | `npm run test` | `src/lib/silverlink/` 의 스키마/payload 변환 로직 |
| E2E 테스트 (Playwright) | `npm run test:e2e` | 브라우저에서 폼 입력 → 제출 → 결과 확인까지의 전체 흐름 (`tests/e2e/create-task.spec.ts`) |

두 테스트 모두 `SILVERLINK_DRY_RUN=true` 기준으로 동작하도록 작성되어 있어, 실제 Make Webhook이나 외부 서비스 없이도 전체 흐름을 검증할 수 있습니다. E2E 테스트는 개발 서버가 켜져 있지 않으면 `playwright.config.ts`의 `webServer` 설정에 따라 자동으로 띄워줍니다.

## 10. 아직 구현하지 않은 기능

다음 항목은 알림 발송 자동화 영역으로, 이번 Day 4 MVP 범위에서 의도적으로 분리했습니다.

- `due_task_checker` 자동 알림 시나리오 (기한이 다가온 케어 업무를 감지해 알림 트리거)
- `message_logs` outbound 생성 자동화 (어르신께 실제로 보낸 메시지 기록)
- `parent_notified` 자동 업데이트
- 카카오톡 알림 발송
- 부모님(어르신) 측 "완료" 응답 처리

## 11. 향후 구현 계획

- 10장의 알림 발송 자동화 항목들을 다음 단계 백로그로 진행
- `source_channel`을 `"web"` 외에 `"kakao"` 등으로 확장해 멀티채널 입력 지원 (현재 구조가 이를 염두에 두고 설계됨)
- 웹 폼 사용자 인증/권한 분리 검토
- E2E 테스트에 실패 케이스(웹훅 호출 실패 등) 시나리오 추가

## 12. Day 5 Notification Preparation Engine

- Make credits를 아끼기 위해 로컬 fixture와 Dry Run API 기반으로 구현
- 실제 발송 전 알림 후보를 미리 검증
- 향후 Airtable/Make/Kakao adapter로 확장 예정

자세한 설계는 [`docs/PRD-notification-engine-code-first.md`](docs/PRD-notification-engine-code-first.md), 구현 과정은 [`docs/work-log.md`](docs/work-log.md)의 "Day 5" 섹션을 참고하세요. 미리보기 화면은 `npm run dev` 실행 후 http://localhost:3000/notifications 에서 확인할 수 있습니다.

## 13. Day 6+7 Member Auth + Parent Profile + Supabase DB 전환

기존에는 "아버지 테스트/어머니 테스트"처럼 고정된 대상자 목록을 코드에 박아두고 썼습니다. Day 6+7부터는 회원이 직접 로그인해서 본인의 부모님(어르신) 프로필을 등록하고, 그 프로필을 대상으로만 케어 요청을 입력하도록 바꿨습니다.

- **Supabase Auth 도입**: `/signup`, `/login`으로 회원가입/로그인, 비로그인 시 보호된 페이지 접근을 `/login`으로 리다이렉트(`(protected)/layout.tsx`에서 일괄 처리)
- **부모님 프로필 등록/수정**: `/parents`에서 등록 폼과 목록을 함께 제공, 목록의 항목을 클릭하면 같은 폼이 수정 모드로 전환됨
- **회원별 데이터 격리(RLS)**: `parent_profiles`/`care_tasks`/`message_logs` 테이블에 Row Level Security를 적용해, 한 회원이 다른 회원의 데이터를 조회·수정할 수 없도록 DB 레벨에서 강제(`docs/supabase-schema-member-scoped.sql`)
- **입력 폼 이동**: 케어 요청 입력은 `/dashboard/create-task`로 이동했고, 대상자는 자유 텍스트가 아니라 본인이 등록한 부모님 프로필 중에서 선택
- **저장 경로 전환**: `/api/create-task`는 이제 Supabase `care_tasks`/`message_logs`에 저장하는 것이 메인 경로이며, 기존 Make Webhook 호출은 `LEGACY_MAKE_SYNC_ENABLED` 플래그로 켜야만 추가로 실행됨(기본 꺼짐, 6장 참고)
- **회원가입 이메일 발송**: Supabase 기본 메일러의 시간당 발송 제한 문제를 Resend 커스텀 SMTP 연동으로 해결(실제 운영 전에는 Resend에서 커스텀 도메인 인증이 필요 — `tasks/tasks-member-parent-scoped-mvp.md`의 백로그 항목 참고)

자세한 설계는 [`docs/PRD-member-parent-scoped-mvp.md`](docs/PRD-member-parent-scoped-mvp.md), 작업 단위 진행은 [`tasks/tasks-member-parent-scoped-mvp.md`](tasks/tasks-member-parent-scoped-mvp.md), 구현 과정은 [`docs/work-log.md`](docs/work-log.md)의 "Day 6+7" 섹션을 참고하세요. 미리보기는 `npm run dev` 실행 후 http://localhost:3000 (로그인 필요)에서 확인할 수 있습니다.

## 14. Day 8+9 — 발송 큐 + 어르신 링크 응답 (Mock)

Day 6+7에서는 "Supabase에 일정을 저장"하는 것까지만 했습니다. Day 8+9부터는 그 일정을 실제로 **알리고, 어르신이 로그인 없이 응답**할 수 있는 구조를 추가했습니다. 사용자가 전달한 Day8~15 전체 로드맵은 [`docs/PRD-day8-to-mvp-master-plan.md`](docs/PRD-day8-to-mvp-master-plan.md)에 레퍼런스로 보관하고, 이번엔 그중 Day 8/Day 9만 구현했습니다.

- **Day 8 — 발송 큐와 시도 기록**: `notification_queue`(보낼 메시지/채널/토큰/상태)와 `delivery_attempts`(발송 시도 결과) 테이블을 추가하고, 실제 SMS/카카오/전화 Provider는 전혀 만들지 않은 채 **`MockDeliveryProvider`**(실제 네트워크 호출 없음)만 연결했습니다. `/delivery-preview`에서 등록된 일정 중 하나를 골라 "미리보기 생성"을 누르면 Mock 발송 결과가 큐/시도 기록으로 Supabase에 남습니다.
- **Day 9 — 어르신 링크 응답(`/r/[token]`)**: 어르신은 회원가입을 하지 않으므로 완전히 익명(로그인 없음) 상태로 이 페이지에 접근합니다. 기존 RLS(`auth.uid() = owner_user_id`)는 익명에게는 항상 막히므로, 익명 select 정책을 새로 여는 대신 **토큰과 정확히 일치하는 한 건만 다루는 SQL 함수(`SECURITY DEFINER`) 2개**(`get_notification_by_token`, `respond_to_notification`)만 anon에 실행 권한을 열었습니다. 어르신이 "완료했어요/도움이 필요해요/나중에 다시 알려주세요/잘못 온 알림이에요" 중 하나를 누르면 큐 상태, 일정 상태, 메시지 기록이 한 트랜잭션으로 갱신됩니다.
- **여전히 안 하는 것**: 실제 SMS/카카오 알림톡/전화 발송(플래그+Provider 도입은 Day 12 이후), 회원 A/B 데이터 격리 테스트(Day6+7부터 "모든 기능 다 만들고 마지막에 한 번에"로 미뤄둔 상태 유지).

자세한 설계는 [`docs/PRD-day8-to-mvp-master-plan.md`](docs/PRD-day8-to-mvp-master-plan.md), 작업 단위 진행은 [`tasks/tasks-day8-notification-queue.md`](tasks/tasks-day8-notification-queue.md)/[`tasks/tasks-day9-link-response.md`](tasks/tasks-day9-link-response.md), 구현 과정은 [`docs/work-log.md`](docs/work-log.md)의 "Day 8"/"Day 9" 섹션을 참고하세요. 미리보기는 로그인 후 `/delivery-preview`, 어르신 화면은 거기서 생성된 `response_token`으로 `/r/[token]`에서 확인할 수 있습니다.
