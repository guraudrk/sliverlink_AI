# SilverLink AI — Web Input Channel

## 1. 프로젝트 개요

SilverLink AI는 자녀·관리자가 어르신(대상자)에게 전달할 요청이나 안부 메시지를 입력하면, AI가 이를 해석해 케어 업무(`care_tasks`)와 메시지 로그(`message_logs`)로 자동 정리해주는 서비스입니다.

이 저장소는 그 첫 입력 채널인 **웹 입력 폼**을 구현합니다. 자세한 제품 요구사항은 [`docs/PRD-web-input.md`](docs/PRD-web-input.md), 작업 단위 진행 기록은 [`docs/work-log.md`](docs/work-log.md)를 참고하세요.

> **Day 4 목표**: 웹 입력 채널 MVP 완성. 어르신께 알림을 발송하는 단계(카카오톡 발송, 완료 응답 처리 등)는 다음 단계 백로그로 분리되어 있습니다 (10장 참고).

## 2. 현재 완성된 기능

- Next.js 기반 웹 입력창 (`/`)
- `sender_name`(보내는 분), `target_person`(받는 분), `message`(전하실 말씀) 입력
- `/api/create-task` 서버 API Route
- Zod 기반 입력 검증 (클라이언트·서버 공용 스키마)
- Dry Run 모드
- 실제 Make Webhook 연동
- GPT 파싱 자동화와 연결
- Airtable `care_tasks` 생성
- `message_logs` inbound 기록

> ℹ️ **이 저장소의 코드 범위는 "웹 입력 → 검증 → Make Webhook 호출"까지입니다.** 위 목록 중 Make Webhook 호출 이후 단계(GPT 파싱, Airtable `care_tasks` 생성, `message_logs` inbound 기록)는 **Make.com 시나리오에서 구성**되어 동작하며, 이 Next.js 앱이 직접 GPT나 Airtable API를 호출하지 않습니다. 자세한 경계는 4장 아키텍처 흐름을 참고하세요.

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

브라우저에서 http://localhost:3000 을 열면 입력 폼이 보입니다.

## 6. 환경변수 설명

| 변수 | 설명 | 노출 범위 | 기본값 |
|---|---|---|---|
| `MAKE_WEBHOOK_URL` | Make.com Webhook 엔드포인트 | **서버 전용** — API Route(`route.ts`)에서만 읽고, 클라이언트 코드/응답 어디에도 포함되지 않음 | 없음 (필수) |
| `SILVERLINK_DRY_RUN` | 실제 Webhook 호출 여부 | 서버 전용 | `true` (`"false"` 문자열만 false로 처리) |

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
