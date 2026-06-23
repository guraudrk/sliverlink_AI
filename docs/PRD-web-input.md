# PRD: SilverLink AI – Web Input MVP

## 0. 문서 정보
- 상태: Draft (확정 전, 가정 포함 — 검토 필요)
- 작성일: 2026-06-23
- 범위: 웹 폼 → 서버 검증 → Make.com Webhook 연동 MVP

## 1. 배경 / 문제 정의
SilverLink AI 운영 과정에서 발생하는 "작업 요청(Task Request)"을 현재는 수동으로 처리한다.
이를 표준화된 웹 폼으로 입력받고, 서버에서 검증한 뒤 Make.com 자동화 워크플로우(Webhook)로 전달하여
후속 처리(알림, 기록, 배정 등)를 자동화하는 것이 목표다.

## 2. 목표 (Goals)
- 웹 폼에서 작업 요청 정보를 입력받고 클라이언트 단에서 1차 검증한다.
- 서버사이드 API Route에서 동일한 Zod 스키마로 2차 검증(신뢰 경계)한다.
- 검증된 데이터를 Make.com이 기대하는 payload 형태로 변환해 Webhook으로 전달한다.
- `SILVERLINK_DRY_RUN=true`일 때는 실제 Webhook 호출을 생략하고 로그/모의 응답만 반환한다 (기본값 true, 안전 우선).
- `MAKE_WEBHOOK_URL`은 서버 전용 환경변수로만 사용하고 클라이언트 번들에 노출되지 않는다.
- 핵심 로직(스키마 검증, payload 변환)에 대한 유닛 테스트, 폼 제출 플로우에 대한 e2e 테스트를 갖춘다.

## 3. 비목표 (Non-Goals, MVP 제외)
- 로그인/인증, 권한 분리
- 자체 DB 영속화 (저장/이력 관리는 Make.com 워크플로우 쪽 책임으로 가정)
- 관리자 대시보드, 제출 내역 조회 화면
- 다국어 지원 (한국어 단일)
- 파일/이미지 첨부
- Webhook 실패에 대한 자동 재시도·큐잉 (MVP는 1회 호출 + 에러 노출만)

## 4. 사용자 및 사용 시나리오
- **대상 사용자**: SilverLink 내부 운영/케어 담당자 (신뢰된 사용자, MVP 단계에서는 인증 없이 접근 가능한 내부용 폼으로 가정).
- **시나리오**: 담당자가 폼에 요청자/대상자 정보와 요청 내용을 입력 → 제출 → 서버가 검증 후 Make.com Webhook으로 전달 → Make.com 워크플로우가 알림/기록 등 후속 처리를 수행한다.

> ⚠️ 가정: 인증이 필요 없는 내부 신뢰 환경이라는 전제는 확인되지 않았다. 외부에 공개되는 폼이라면 최소한의 스팸/오남용 방지(레이트 리미트, CAPTCHA 등)가 추가 요구사항이 될 수 있다.

## 5. 핵심 기능 요구사항

### 5.1 입력 폼 — `src/components/task-request-form.tsx`
- 작업 요청에 필요한 필드 입력 (5.7 데이터 모델 초안 참조)
- 클라이언트 측 검증은 서버와 동일한 Zod 스키마를 공유해서 사용
- 제출 상태(loading/success/error) UI 피드백
- 성공 시 폼 초기화, 실패 시 에러 메시지 표시 (필드 단위 에러 포함)

### 5.2 검증 스키마 — `src/lib/silverlink/schema.ts`
- Zod로 `TaskRequest` 입력 스키마 정의 (클라이언트/서버 공용, 단일 소스)
- `z.infer`로 TypeScript 타입 도출 → 폼과 API Route가 동일 타입 사용

### 5.3 Payload 변환 — `src/lib/silverlink/payload.ts`
- 검증된 폼 데이터를 Make.com Webhook이 기대하는 payload 구조로 변환
- 요청 ID, 생성 타임스탬프 등 메타데이터 부가
- 순수 함수로 구성 (입력 → 출력), 외부 의존성 없이 유닛 테스트 가능해야 함

### 5.4 시간 유틸 — `src/lib/silverlink/time.ts`
- 희망 일시 등 날짜/시간 포맷팅 및 타임존(KST) 처리
- payload 변환 시 사용할 ISO 포맷 변환 함수 제공

### 5.5 환경변수 로더 — `src/lib/silverlink/env.ts`
- `MAKE_WEBHOOK_URL`, `SILVERLINK_DRY_RUN`을 서버 전용으로 로드/검증 (Zod로 형식 검증 포함 가능)
- 클라이언트 코드에서 import될 수 없도록 서버 전용 경계를 명확히 함 (예: `server-only` 패키지 또는 동등한 가드)
- 필수 값 누락 시 명확한 에러로 fail-fast

### 5.6 Make.com 클라이언트 — `src/lib/silverlink/make-client.ts`
- `fetch` 기반으로 Webhook에 POST
- 타임아웃 처리 및 네트워크/HTTP 에러 핸들링
- `SILVERLINK_DRY_RUN=true`인 경우: 실제 네트워크 호출을 생략하고 구조화된 로그 출력 + 모의 성공 응답 반환
- `SILVERLINK_DRY_RUN=false`인 경우에만 실제 `MAKE_WEBHOOK_URL`로 호출

### 5.7 API Route — `src/app/api/create-task/route.ts`
- `POST` 핸들러 (Node.js runtime, 서버 전용)
- 요청 바디를 5.2의 Zod 스키마로 파싱 → 실패 시 400 + 필드별 에러 상세 반환
- 성공 시: payload 변환(5.3) → make-client 호출(5.6) → 결과를 클라이언트에 응답
- Webhook 호출 실패 시 5xx + 사용자에게 노출 가능한 안전한 에러 메시지 (내부 URL/스택 노출 금지)

### 5.8 테스트
- 유닛 테스트: `schema.test.ts` (유효/무효 입력 케이스), `payload.test.ts` (변환 결과 검증)
- e2e 테스트: `create-task.spec.ts` — 폼 입력 → 제출 → `DRY_RUN` 모드에서 성공 플로우 확인, 검증 실패 플로우 확인

## 6. 데이터 모델 초안 (Go 후 하위 테스크 단계에서 확정)
```
TaskRequest {
  requesterName: string        // 요청자 이름
  requesterContact: string     // 요청자 연락처 (전화 또는 이메일)
  subjectName: string          // 대상자(어르신) 이름
  category: enum               // 요청 유형 (예: 방문, 상담, 긴급 등)
  description: string          // 요청 상세 내용
  preferredDateTime: string    // 희망 일시 (ISO 8601)
  priority: enum               // low | medium | high
}
```
> ⚠️ 필드/enum 값은 가정이며 실제 Make.com 워크플로우가 기대하는 payload 스펙과 대조 확인이 필요하다.

## 7. 비기능 요구사항
- **보안**: `MAKE_WEBHOOK_URL`은 서버 전용, 클라이언트 번들/응답에 절대 노출하지 않음. 입력값 sanitize 및 길이 제한.
- **안전한 기본값**: `SILVERLINK_DRY_RUN` 기본값은 `true` — 명시적으로 `false`로 설정해야 실제 Webhook 호출.
- **테스트 용이성**: DRY_RUN 모드로 외부 네트워크 의존 없이 전체 플로우 테스트 가능해야 함.
- **에러 가시성**: 검증 실패/Webhook 실패는 사용자에게 구분된 메시지로 안내.
- **유지보수성**: 하네스 엔지니어링 방식 — 작은 단위 모듈 분리(schema/payload/time/env/client 분리 유지), 타입 안전성 우선.

## 8. 기술 스택 / 제약사항
- Next.js 16.2.9 (App Router), React 19, TypeScript, Tailwind v4
- **주의 (AGENTS.md 지침)**: 이 프로젝트의 Next.js 버전은 학습 데이터 기준과 다른 breaking change를 포함할 수 있음.
  구현 단계에 들어가기 전 `node_modules/next/dist/docs/`의 관련 가이드(특히 `01-app` 영역, Route Handler/서버 환경변수 관련 문서)를 확인해야 한다.
- 검증: Zod — 현재 `zod@4.4.3`이 간접 의존성(devDependency 체인)으로 존재하나, `package.json`에 직접 의존성으로 명시되어 있지 않음 → 구현 단계에서 직접 의존성으로 추가 필요.
- 테스트: 유닛/e2e 테스트 러너 미설치 상태 (`vitest`/`jest`, `playwright` 등 후보) → 구현 단계에서 선택 및 설치 필요.

## 9. 환경 변수
| 변수 | 용도 | 노출 범위 | 기본값 |
|---|---|---|---|
| `MAKE_WEBHOOK_URL` | Make.com Webhook 엔드포인트 | 서버 전용 (`.env.local`) | 없음 (필수) |
| `SILVERLINK_DRY_RUN` | 실제 Webhook 호출 여부 | 서버 전용 | `true` |

## 10. 성공 기준 (Definition of Done — MVP)
- [ ] DRY_RUN 모드에서 폼 제출 → API → make-client까지 전체 플로우 정상 동작
- [ ] 검증 실패 입력에 대해 클라이언트/서버 양쪽에서 적절한 에러 처리
- [ ] `MAKE_WEBHOOK_URL`이 클라이언트로 노출되지 않음을 확인 (번들/네트워크 탭 점검)
- [ ] 유닛 테스트(schema, payload) 통과
- [ ] e2e 테스트(create-task) 통과
- [ ] DRY_RUN=false + 테스트용 Webhook URL로 실제 연동 1회 확인

## 11. 리스크 / 오픈 이슈
1. Next.js 16의 실제 breaking change 범위 미확인 — 구현 전 공식 docs 확인 필수.
2. Make.com 측이 기대하는 실제 payload 스펙 미확인 (8장 데이터 모델은 가정).
3. 테스트 러너(유닛/e2e) 미설치 — 어떤 도구를 쓸지 결정 필요.
4. 폼 접근 제어(인증 여부) 미확정 — 내부용 신뢰 환경 가정 중.
5. Zod가 직접 의존성으로 선언되어 있지 않음 — 설치/고정 필요.

## 12. 다음 단계
이 PRD를 기준으로 `tasks/tasks-web-input.md`에 상위 테스크를 작성한다.
하위 테스크는 사용자가 "Go"를 입력한 뒤 생성한다.
