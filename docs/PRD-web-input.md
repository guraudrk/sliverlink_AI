# PRD: SilverLink AI – Web Input Channel MVP

## 0. 문서 정보
- 상태: Draft v2 (사용자 제공 체크리스트 반영, 최종 확정 전)
- 작성일: 2026-06-23
- 범위: 웹 입력창 → `/api/create-task` → Make Webhook 전달까지 (Make 이후의 GPT/Airtable 처리는 이 저장소의 구현 범위 밖)

## 1. 배경 / 목적
SilverLink AI는 자녀(또는 관리자)가 어르신(대상자) 관련 요청·메시지를 입력하면, 이를 AI 기반으로 처리해
케어 업무(`care_tasks`)와 메시지 로그(`message_logs`)로 자동 정리하는 서비스다.
본 프로젝트는 그 첫 입력 채널인 **웹 입력창**을 만드는 것이 목적이다.

## 2. 핵심 흐름 (End-to-End Pipeline)
```
웹 입력창
  → POST /api/create-task   (이 저장소가 구현하는 범위)
  → Make.com Webhook        (이 저장소가 구현하는 범위: 호출만)
  → GPT (메시지 해석/구조화)  (Make.com 시나리오 내부, 이 저장소 범위 밖)
  → Airtable care_tasks 기록 (Make.com 시나리오 내부, 이 저장소 범위 밖)
  → Airtable message_logs 기록 (Make.com 시나리오 내부, 이 저장소 범위 밖)
```
이 저장소(Next.js 앱)의 책임은 **"웹 입력 → 검증 → Make Webhook 호출"** 까지이며,
GPT 해석과 Airtable 기록은 Make.com 시나리오가 담당한다. 이 경계를 코드/문서 어디서도 침범하지 않는다
(예: 이 앱에서 Airtable이나 OpenAI API를 직접 호출하지 않음).

## 3. 사용자 (Users)
- **자녀**: 어르신(대상자)을 대신해 요청/메시지를 입력하는 보호자.
- **관리자**: 운영 측에서 요청을 대리 입력하거나 모니터링하는 담당자.
- MVP에서는 두 사용자 유형이 **동일한 입력 폼**을 사용한다 (역할 구분 필드는 입력 항목에 없음 — 4장 참조).
- 인증/권한 분리는 본 MVP 범위 밖으로 유지한다 (추후 확장 시 재검토).

## 4. 입력 필드 (Input Fields)

### 4.1 사용자가 입력하는 필드
| 필드 | 타입 | 설명 |
|---|---|---|
| `sender_name` | string | 입력자(자녀/관리자) 이름 |
| `target_person` | string | 대상자(어르신) 이름 |
| `message` | string | 요청/전달 메시지 본문 |

### 4.2 서버가 자동으로 부가하는 필드
| 필드 | 타입 | 설명 |
|---|---|---|
| `source_channel` | literal `"web"` | 입력 채널 식별자. 이번 채널은 항상 `"web"`으로 고정 (13장 장기 확장 참조) |
| `requested_at` | string (ISO 8601, KST) | 요청이 서버에 접수된 시각 |
| `today_date` | string (`YYYY-MM-DD`, KST) | 요청 접수 시점의 날짜. GPT/Airtable 단계에서 "오늘" 기준 컨텍스트로 사용 |

> `source_channel`, `requested_at`, `today_date`는 클라이언트가 보내는 값이 아니라 **서버(API Route)에서 생성**한다.
> 클라이언트가 임의의 값을 보내더라도 서버가 덮어쓴다 (신뢰 경계 보호).

## 5. 핵심 기능 요구사항

### 5.1 입력 폼 — `src/components/task-request-form.tsx`
- `sender_name`, `target_person`, `message` 3개 필드 입력
- Zod 스키마(5.2) 기반 클라이언트 측 1차 검증
- 제출 상태(loading/success/error) UI 피드백, 성공 시 폼 초기화

### 5.2 검증 스키마 — `src/lib/silverlink/schema.ts`
- 사용자 입력용 스키마: `sender_name`, `target_person`, `message` (필수, 빈 문자열/공백 금지, 길이 제한)
- 서버 전송용 최종 payload 스키마: 위 3개 + `source_channel`(`"web"` literal) + `requested_at` + `today_date`
- `z.infer`로 두 타입 모두 도출하여 폼·API Route·payload 모듈이 동일 타입 사용

### 5.3 시간 유틸 — `src/lib/silverlink/time.ts`
- KST 기준 현재 시각의 `requested_at`(ISO 8601) 생성 함수
- KST 기준 `today_date`(`YYYY-MM-DD`) 생성 함수

### 5.4 Payload 변환 — `src/lib/silverlink/payload.ts`
- 검증된 사용자 입력(`sender_name`, `target_person`, `message`) + `time.ts`로 생성한 `requested_at`/`today_date` + 고정값 `source_channel: "web"` → Make Webhook으로 보낼 최종 payload 구성
- 순수 함수로 구성, 외부 의존성 없이 유닛 테스트 가능

### 5.5 환경변수 로더 — `src/lib/silverlink/env.ts`
- `MAKE_WEBHOOK_URL`, `SILVERLINK_DRY_RUN`을 서버 전용으로 로드/검증
- 클라이언트 코드에서 import될 수 없도록 서버 전용 경계 명확화 (예: `server-only` 가드)
- 필수 값 누락 시 명확한 에러로 fail-fast

### 5.6 Make.com 클라이언트 — `src/lib/silverlink/make-client.ts`
- `fetch` 기반으로 `MAKE_WEBHOOK_URL`에 POST
- 타임아웃 처리 및 네트워크/HTTP 에러 핸들링
- `SILVERLINK_DRY_RUN=true`: 실제 네트워크 호출 생략, 구조화된 로그 + 모의 성공 응답 반환
- `SILVERLINK_DRY_RUN=false`: 실제 Webhook 호출
- GPT 호출, Airtable 기록은 이 클라이언트의 책임이 아님 (2장 경계 참조)

### 5.7 API Route — `src/app/api/create-task/route.ts`
- `POST` 핸들러 (Node.js runtime, 서버 전용)
- 요청 바디를 사용자 입력 스키마로 파싱 → 실패 시 400 + 필드별 에러
- 성공 시: `requested_at`/`today_date` 생성 → payload 변환(5.4) → make-client 호출(5.6) → 응답
- Webhook 실패 시 5xx + 안전한 에러 메시지 (내부 URL/스택 노출 금지)

### 5.8 테스트
- **유닛 테스트 (Vitest)**: `schema.test.ts`(유효/무효 입력), `payload.test.ts`(payload 변환 결과, `source_channel` 고정값 검증)
- **E2E 테스트 (Playwright)**: `create-task.spec.ts` — 폼 입력 → 제출 → DRY_RUN 모드에서 성공 플로우, 필수값 누락 시 에러 플로우
- 모든 테스트는 `SILVERLINK_DRY_RUN=true` 기준으로 동작 (외부 네트워크 의존 없음)

## 6. 보안 요구사항
- `MAKE_WEBHOOK_URL`은 **서버에서만** 사용한다. 클라이언트 번들, API 응답, 로그(프로덕션)에 노출하지 않는다.
- `.env.local`은 **GitHub에 업로드하지 않는다** — `.gitignore`의 `.env*` 규칙으로 이미 보장됨 (현재 적용 확인됨).
- 입력값(`message` 등)은 길이 제한 및 기본적인 sanitize를 적용한다.
- `SILVERLINK_DRY_RUN` 기본값은 `true` (안전 우선, 명시적으로 `false`로 바꿔야 실제 호출).

## 7. 비기능 요구사항
- **테스트 용이성**: DRY_RUN 모드로 Make Webhook/GPT/Airtable 등 외부 의존성 없이 전체 플로우 테스트 가능해야 함.
- **에러 가시성**: 검증 실패와 Webhook 호출 실패를 구분된 메시지로 사용자에게 안내.
- **경계 준수**: 이 저장소는 GPT/Airtable과 직접 통신하지 않는다 (Make.com 시나리오 책임).
- **확장성**: `source_channel`을 통해 추후 입력 채널(카카오 등)을 식별 가능한 구조 유지 (13장).
- **유지보수성**: 모듈 분리(schema/payload/time/env/client) 유지, 타입 안전성 우선.

## 8. 기술 스택 / 제약사항
- Next.js 16.2.9 (App Router), React 19, TypeScript, Tailwind v4
- **주의 (AGENTS.md 지침)**: 이 Next.js 버전은 학습 데이터와 다른 breaking change가 있을 수 있음 → 구현 전 `node_modules/next/dist/docs/` 확인 필수 (특히 Route Handler 관련 `01-app` 문서).
- 검증: **Zod** (현재 간접 의존성으로만 존재 → `package.json`에 직접 의존성 추가 필요)
- 유닛 테스트: **Vitest**
- E2E 테스트: **Playwright**
- 위 테스트 러너는 아직 설치되지 않음 → 구현 단계(1.0 기반 설정)에서 설치

## 9. 환경 변수
| 변수 | 용도 | 노출 범위 | 기본값 |
|---|---|---|---|
| `MAKE_WEBHOOK_URL` | Make.com Webhook 엔드포인트 | 서버 전용 (`.env.local`) | 없음 (필수) |
| `SILVERLINK_DRY_RUN` | 실제 Webhook 호출 여부 | 서버 전용 | `true` |

## 10. 성공 기준 (Definition of Done — MVP)
- [ ] DRY_RUN 모드에서 폼 제출 → API → make-client까지 전체 플로우 정상 동작
- [ ] `sender_name` / `target_person` / `message` 필수 검증 및 에러 처리 확인
- [ ] 서버가 `source_channel="web"`, `requested_at`, `today_date`를 정확히 생성해 payload에 포함하는지 확인
- [ ] `MAKE_WEBHOOK_URL`이 클라이언트에 노출되지 않음을 확인 (번들/네트워크 탭 점검)
- [ ] Vitest 유닛 테스트(schema, payload) 통과
- [ ] Playwright E2E 테스트(create-task) 통과
- [ ] DRY_RUN=false + 테스트용 Webhook URL로 실제 연동 1회 확인 (Make 시나리오까지는 범위 밖이므로 Webhook 수신 여부만 확인)

## 11. 리스크 / 오픈 이슈
1. Next.js 16의 실제 breaking change 범위 미확인 — 구현 전 공식 docs 확인 필수.
2. Make.com 시나리오가 기대하는 정확한 payload 키 이름/형식이 이 PRD의 가정과 다를 수 있음 (특히 GPT 프롬프트에 들어가는 필드 매핑).
3. Zod/Vitest/Playwright가 아직 직접 의존성으로 설치되어 있지 않음 — 1.0 기반 설정 단계에서 처리.
4. 자녀/관리자 역할 구분이 향후 필요해질 경우 입력 필드 또는 인증 체계 확장 필요 (현재는 동일 폼 공유).

## 12. 장기 확장 (Out of MVP scope, 설계만 고려)
- **KakaoTalk 입력 채널**: 동일한 `/api/create-task` → Make Webhook 파이프라인을 재사용하고,
  `source_channel` 값만 `"kakao"`로 설정하는 방식으로 확장한다.
- 이를 위해 5.2의 스키마는 `source_channel`을 `"web"` 단일 literal이 아니라
  `"web" | "kakao"` 같은 union으로 확장 가능한 구조로 설계해둔다 (단, MVP 구현체는 `"web"`만 사용).
- 카카오 채널 자체의 입력 수단(예: 카카오톡 챗봇 연동)은 본 PRD의 범위가 아니다.

## 13. 다음 단계
이 PRD를 기준으로 `tasks/tasks-web-input.md`의 상위 테스크를 갱신하고,
하위 테스크로 분해한다.
