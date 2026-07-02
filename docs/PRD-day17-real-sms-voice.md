# SilverLink AI — Day 17: 실제 SMS 발송 + 실제 전화 연결 (PRD)

## 0. 문서 정보

로드맵 마지막 항목(⑤ 실제 통화/SMS/카카오톡 발송)을 착수한다. 이번 범위는 **SMS + 전화(아웃바운드 콜)**까지만 — 카카오 알림톡은 비즈니스 채널/템플릿 사전승인(영업일 1~3일, 반려 가능)이 추가로 필요해 이번엔 제외하고, 나중에 같은 Provider(Solapi) 계정으로 확장 가능하게만 설계해둔다.

## 1. 결정한 것 (사용자 요구사항 기반 판단)

사용자 요구사항: ① 저가/최대한 무료 ② 챗봇에서 버튼 하나로 연동 ③ 사업자등록은 7월 초중순에야 함(지금은 개인).

### 1-1. SMS — **Solapi**

| 후보 | 개인(사업자등록 없이) 발신번호 등록 | 비용 구조 |
|---|---|---|
| **Solapi** | ✅ 휴대폰 본인인증만으로 가능, 제출 서류 없음 | 선불 충전, 건당 과금(구독료 없음) — 안 보내면 0원 |
| Aligo | 가능(서비스 내 사전등록), 더 단순/저가 | 선불 충전형 |
| Twilio(국제) | 한국向은 Alphanumeric Sender ID를 KISA에 별도 등록 필요 — 절차 더 번거로움 | 해외 결제, 원화 아님 |

**Solapi로 결정** — 사업자등록 없이 지금 바로 본인 인증만으로 발신번호 등록 가능, 구독료 없이 보낸 만큼만 과금돼 "최대한 무료"에 부합, REST API + Node SDK 제공, 나중에 카카오 알림톡도 같은 계정으로 확장 가능(챗봇 연동 구조를 다시 안 만들어도 됨).

### 1-2. 전화(아웃바운드 콜) — **Twilio Voice**

| 후보 | 무료/저가 | 한국 번호 발신자 표시 | 문서화 수준 |
|---|---|---|---|
| **Twilio Voice** | 가입 시 체험 크레딧 제공, 단 트라이얼 동안은 **사전에 본인인증(SMS)으로 검증한 번호로만** 발신 가능(계정당 최대 5개) | 해외 번호로 표시됨(한국 로컬 번호는 개인에게 판매 안 함) | 매우 풍부 — TwiML/웹훅 공식 문서로 정확히 구현 가능 |
| ClawOps(국내 070) | 가격/체험 정책 확인 필요 | 한국 070 번호 — 더 친숙 | 공식 문서가 적어 정확한 구현 검증이 어려움 |

**Twilio Voice로 결정** — "사업자등록 없이 지금 바로" + "최대한 무료"라는 조건에 트라이얼 크레딧이 정확히 맞고, 공식 문서가 풍부해 (AGENTS.md의 "공식 문서 먼저 확인" 원칙대로) 정확하게 구현할 수 있다. **트라이얼 제약(검증된 번호로만 발신)은 오히려 지금 단계에 안전장치로 적합** — 사용자가 본인 가족 번호 1개를 검증해두고 그 번호로만 먼저 테스트하게 된다. 발신자 번호가 해외로 표시되는 점은 받는 분께 사전 안내가 필요(전화 스크립트 맨 앞에 "SilverLink AI입니다"를 명시하는 것으로 일부 보완, 11장 `call-script-builder.ts`에 이미 있음).

## 2. 안전 설계 (기존 Mock-우선 원칙과의 접점)

- 두 기능 모두 **기본값 꺼짐**인 새 플래그로 게이트: `ENABLE_REAL_SMS=false`, `ENABLE_REAL_CALLS=false`. 꺼져 있으면 지금처럼 `MockDeliveryProvider`/Mock 통화 그대로 동작 — 기존 전체 흐름에 회귀 없음.
- 플래그를 켜더라도 **실제로 발송 직전에 한 번 더 사용자에게 확인을 받는다** — 처음 실제 전송 테스트는 반드시 이 대화에서 사용자가 "지금 진짜로 보내봐"라고 명시한 순간에만 실행한다([[feedback_safety_constraints]] 원칙 — 로드맵에 있다고 해서 사전 승인된 것으로 취급하지 않음).
- Twilio/Solapi 웹훅 엔드포인트는 **요청 서명 검증**(Twilio `X-Twilio-Signature`, Solapi 웹훅 시크릿)을 반드시 거친다 — 그렇지 않으면 누구나 "전화를 받았다"고 위조해서 `care_call_attempts` 상태를 조작할 수 있음(Day15 보안 원칙의 연장).
- API 키(`SOLAPI_API_KEY`/`SECRET`, `TWILIO_AUTH_TOKEN` 등)는 항상 `.env.local`/Vercel 환경변수에만 두고, 채팅/커밋/문서 어디에도 값 자체를 적지 않는다.

## 3. 아키텍처

### 3-1. SMS (Solapi) — 기존 `DeliveryProvider` 인터페이스 그대로 구현

```
챗봇 "지금 알려드리기" 버튼 / /delivery-preview / SendNotificationModal
        │ (변경 없음 — 기존 라우트 그대로 호출)
        ▼
POST /api/delivery/preview  { care_task_id, channel: "sms", message_text }
        │
        ├─ ENABLE_REAL_SMS=false (기본) → MockDeliveryProvider
        │
        ▼ ENABLE_REAL_SMS=true
[새 SolapiSmsProvider] — parent_profiles.phone을 수신번호로 Solapi REST API 호출
        ▼
delivery_attempts에 실제 응답(success/실패 사유) 기록
```

- `DeliveryRequest`에 `to_phone_number` 필드 추가 필요(현재 수신번호가 빠져 있음) — `/api/delivery/preview`에서 `getParentProfileById`로 조회해 넘긴다.
- `parent_profiles.phone`이 비어 있으면 실제 발송 전에 "전화번호가 등록되지 않았어요" 에러로 막는다(현재는 phone이 optional이라 비어있을 수 있음).

### 3-2. 전화(Twilio Voice) — 비동기 웹훅 구조 필요(SMS와 다름)

```
/dashboard/calls "전화 걸기" 버튼
        ▼
POST /api/care-calls/[attemptId]/start
        ├─ ENABLE_REAL_CALLS=false (기본) → 기존처럼 상태만 즉시 "answered"로 전환
        ▼ ENABLE_REAL_CALLS=true
Twilio Calls API로 outbound call 생성 (to: parent_profiles.phone, from: TWILIO_FROM_NUMBER,
  url: https://silverlink-ai.vercel.app/api/voice/twiml?attemptId=...)
        ▼ (어르신이 전화를 받으면 Twilio가 콜백)
GET/POST /api/voice/twiml  → TwiML <Say>call_script</Say> + <Gather numDigits=1>
        ▼ (어르신이 키패드 입력)
POST /api/voice/gather  → 누른 숫자를 completed/help_requested/no_answer로 매핑,
  기존 care_call_attempts 업데이트 로직(현재 /respond 라우트에 있는 것) 재사용
        ▼ (통화 종료/실패 등 상태 변화)
POST /api/voice/status  → call_script 시작 안 됨/무응답 등을 no_answer로 기록
```

- 새 라우트 3개(`/api/voice/twiml`, `/api/voice/gather`, `/api/voice/status`)는 Twilio가 호출하는 **공개 웹훅**이라 로그인 세션이 없다 — Day9의 `/r/[token]` 익명 응답 패턴과 비슷하게, `attemptId` 하나로 딱 그 통화 시도만 다루게 좁히고 Twilio 서명 검증으로 위조를 막는다.
- 키패드 매핑은 기존 `ATTEMPT_RESPONSE_OPTIONS`(`completed`/`help_requested`/`no_answer`) 3개에 맞춰 1/2/(무응답)으로 — Day9 링크 응답의 4개 옵션과는 다르므로 그대로 재사용하지 않고 전화에 맞게 단순화.

## 4. 사용자가 직접 해야 하는 사전 준비(코드로 대신할 수 없음)

1. **Solapi**: 가입 → 휴대폰 본인인증으로 발신번호(본인 번호) 등록 → API Key/Secret 발급 → `.env.local`/Vercel에 `SOLAPI_API_KEY`/`SOLAPI_API_SECRET`/`SOLAPI_SENDER_NUMBER` 입력.
2. **Twilio**: 가입(체험 크레딧) → 본인 번호 또는 테스트용으로 쓸 가족 번호를 "Verified Caller ID"로 등록(SMS 인증) → `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` 발급 → `.env.local`/Vercel에 입력.
3. Vercel에 두 서비스의 웹훅 콜백 URL(`https://silverlink-ai.vercel.app/api/voice/...`)을 Twilio Console의 전화번호 설정에 등록(Claude Code가 정확한 절차를 안내).

## 5. 작업 순서(슬라이스 단위, `tasks/tasks-day17-real-sms-voice.md`에서 체크)

1. 사전 준비 안내 + 두 서비스 가입/키 발급 (사용자 진행)
2. SMS: `DeliveryRequest`에 수신번호 추가, `SolapiSmsProvider` 구현, `ENABLE_REAL_SMS` 플래그 배선, 본인 번호로 실제 발송 테스트 1건(사용자 명시적 확인 후)
3. 전화: 웹훅 라우트 3개 + Twilio 서명 검증 + `TwilioVoiceProvider`/호출 트리거, `ENABLE_REAL_CALLS` 플래그 배선, 검증된 번호로 실제 통화 테스트 1건(사용자 명시적 확인 후)
4. 문서화(README/work-log/deployment-guide에 두 서비스 운영 정보 추가) + 최종 검증

## 6. 이번에 안 하는 것

- 카카오 알림톡(비즈니스 채널/템플릿 사전승인 필요 — Solapi 계정은 그대로 재사용 가능하게만 설계)
- Twilio 트라이얼 제약 해제(유료 전환, 한국 로컬 번호 확보) — 필요해지면 별도 논의
- 실시간 자유 대화형 Voice Agent(OpenAI Realtime/Vapi 등) — 이번엔 Scripted Say+Gather까지만(애초 마스터플랜의 Level 1 범위)
