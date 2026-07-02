# Tasks: Day 17 — 실제 SMS 발송(Solapi) + 실제 전화 연결(Twilio Voice)

기준 문서: `docs/PRD-day17-real-sms-voice.md`

## 중요 — 안전 규칙
- `ENABLE_REAL_SMS`/`ENABLE_REAL_CALLS` 기본값은 항상 `false`. 켜는 건 사용자가 명시적으로 요청했을 때만.
- **실제 발송/실제 전화 테스트는 사용자가 이 대화에서 "지금 진짜로 보내봐/걸어봐"라고 명시한 순간에만 실행** — 로드맵에 있다고 사전 승인된 것으로 취급하지 않는다([[feedback_safety_constraints]]).
- API 키 값은 어디에도(채팅/커밋/문서) 적지 않는다. 변수 이름만 다룬다.
- 사업자등록이 없는 현재 상태 기준 설계(개인 인증 경로) — 7월에 사업자등록 후에는 발신번호를 사업자 명의로 재등록하는 절차가 별도로 필요할 수 있음(이번 작업 범위 아님, 메모만 남김).

## Relevant Files
- `src/lib/silverlink/delivery/provider.ts` — `DeliveryRequest`에 `to_phone_number` 추가
- `src/lib/silverlink/delivery/solapi-provider.ts` (신규) — `DeliveryProvider` 구현
- `src/app/api/delivery/preview/route.ts` — 수신번호 조회(`getParentProfileById`) 추가, 플래그에 따라 Mock/Solapi 분기
- `src/app/api/voice/twiml/route.ts`, `src/app/api/voice/gather/route.ts`, `src/app/api/voice/status/route.ts` (신규) — Twilio 웹훅
- `src/lib/silverlink/calls/twilio-signature.ts` (신규) — 웹훅 서명 검증
- `src/app/api/care-calls/[attemptId]/start/route.ts` — 플래그에 따라 Mock 즉시 전환/Twilio 실제 호출 분기
- `.env.example`, `docs/deployment-guide.md`, `README.md`, `docs/work-log.md`

## 작업 목록 (Tasks)

- [ ] 0.0 사전 준비 (사용자 진행, Claude Code는 절차 안내만)
  - [ ] 0.1 Solapi 가입 + 본인인증으로 발신번호(본인 번호) 등록 + API Key/Secret 발급
  - [ ] 0.2 Twilio 가입(체험 크레딧) + 테스트용 번호를 Verified Caller ID로 등록 + Account SID/Auth Token/발신번호 발급
  - [ ] 0.3 `.env.local`에 `SOLAPI_API_KEY`/`SOLAPI_API_SECRET`/`SOLAPI_SENDER_NUMBER`/`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` 입력(사용자가 직접, 값은 비공개)
  - [ ] 0.4 등록한 본인/가족 번호를 본인 또는 가족의 `parent_profiles.phone`에 입력(테스트 대상)

- [ ] 1.0 SMS 실제 발송 (Solapi)
  - [ ] 1.1 `DeliveryRequest`/`DeliveryResult`에 수신번호 필드 추가, 기존 Mock 구현/테스트 갱신
  - [ ] 1.2 `SolapiSmsProvider` 구현(공식 REST API 문서 기준 — 서명 생성 방식 포함) + 유닛 테스트(실제 호출 없이 요청 페이로드/서명 형식만 검증)
  - [ ] 1.3 `/api/delivery/preview`에서 `getParentProfileById`로 수신번호 조회, 없으면 발송 전에 명확한 에러로 막기
  - [ ] 1.4 `ENABLE_REAL_SMS` 플래그로 Mock/Solapi 분기, 기본값 `false`
  - [ ] 1.5 `npx tsc --noEmit` / `npx vitest run` / `npm run build` 클린 확인(실제 호출 없이)
  - [ ] 1.6 **사용자가 명시적으로 요청하면**, 검증된 본인 번호로 실제 SMS 1건 발송 테스트

- [ ] 2.0 전화 실제 연결 (Twilio Voice)
  - [ ] 2.1 Twilio 웹훅 서명 검증 유틸(`twilio-signature.ts`) — 공식 문서의 서명 알고리즘대로
  - [ ] 2.2 `/api/voice/twiml` — `attemptId`로 해당 통화 시도의 `call_script`를 조회해 TwiML `<Say>` + `<Gather numDigits="1">` 응답
  - [ ] 2.3 `/api/voice/gather` — 눌린 숫자를 `completed`/`help_requested`/`no_answer`로 매핑해 `care_call_attempts` + 연결된 `care_tasks` 상태 갱신(기존 `/respond` 라우트의 업데이트 로직 재사용)
  - [ ] 2.4 `/api/voice/status` — Twilio 콜 상태 콜백(무응답/실패 등) 처리
  - [ ] 2.5 `/api/care-calls/[attemptId]/start`에 `ENABLE_REAL_CALLS` 분기 추가 — true면 Twilio Calls API로 실제 발신
  - [ ] 2.6 `npx tsc --noEmit` / `npx vitest run` / `npm run build` 클린 확인(실제 호출 없이)
  - [ ] 2.7 운영 배포(Vercel)에 새 웹훅 라우트가 올라간 뒤, **사용자가 명시적으로 요청하면** 검증된 번호로 실제 전화 연결 테스트 1건

- [ ] 3.0 문서화
  - [ ] 3.1 `.env.example`에 새 변수 추가(값 없이, 설명만)
  - [ ] 3.2 `docs/deployment-guide.md`에 Solapi/Twilio 운영 환경변수 + Twilio 웹훅 URL 등록 절차 추가
  - [ ] 3.3 `README.md`에 Day17 섹션 추가
  - [ ] 3.4 `docs/work-log.md`에 Day17 항목 작성(기술/쉬운 설명 모두, 실제 발송/통화 테스트 결과 포함)
