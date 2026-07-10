# SilverLink AI — Day 8~Minimum MVP Master Plan (참고 문서)

## 0. 문서 정보
- 출처: 사용자가 2026-06-25 PDF/TXT로 전달한 "SilverLink AI Day 8~Minimum MVP Master Plan (AI 비서 안부전화 + 링크 응답 + RAG 챗봇 통합 버전)"을 그대로 옮긴 참고 문서
- 목적: Day 8부터 최소 MVP 완성(Day 15)까지의 전체 로드맵을 기록해 두고, 각 Day의 PRD/tasks 파일을 만들 때 이 문서를 기준 삼는다. **이 문서 자체는 실행 지시서가 아니라 레퍼런스**다 — 실제 작업은 Day별 `docs/PRD-day{N}-*.md` + `tasks/tasks-day{N}-*.md`로 별도 작성한다.
- 핵심 결론: 최소 MVP에는 완전한 실시간 AI 전화 상담원보다 **Scripted IVR Care Call + RAG-lite + 링크 응답**을 먼저 넣고, OpenAI Realtime/Vapi/Retell/Twilio 기반 실시간 Voice Agent는 **확장 트랙**으로 둔다.
- **⚠️ 2026-06-25 갱신**: 아래 Day 12~15 섹션은 `docs/PRD-rag-mvp-day12-15-plan.md`(사용자가 추가로 전달한 RAG MVP 실행 문서)로 대체되었다. **Day12=Scripted IVR, Day13=RAG-lite 순서가 Day12=RAG Evidence Layer, Day13=RAG 챗봇 UI로 바뀌었고, 실제 전화 Provider 연동은 post-MVP 백로그로 미뤄졌다.** 아래 원문은 변경 이력 보존용으로만 남겨두고, 실제 작업 기준은 새 문서를 따른다.

## 1. Executive Roadmap

| 구간 | 목표 | 핵심 산출물 |
|---|---|---|
| Day 8 | 발송 큐와 시도 로그 | `notification_queue`, `delivery_attempts`, `voice_call` 채널 |
| Day 9 | 어르신 링크 응답 | `/r/[token]`, 완료/도움/나중 응답 |
| Day 10 | 자녀 대시보드 | 부모님별 일정, 응답, 도움 요청 모니터링 |
| Day 11 | AI 비서 안부전화 Mock | `care_call_schedules`, `care_call_attempts`, Mock 전화 |
| Day 12 | Scripted IVR 설계 | Twilio/Vapi/Retell/OpenAI Realtime 연동 준비 |
| Day 13 | RAG-lite 챗봇 | 현재 웹사이트에 부모님별 assistant 결합 |
| Day 14 | 벡터 RAG 또는 Voice Agent 선택 | pgvector 또는 실제 음성 에이전트 실험 |
| Day 15 | 최소 MVP 데모 | 링크 응답 + 안부전화 Mock + RAG 요약 데모 |
| Day 21 | 통화 후 가족 브리핑 | `call_family_briefs` + Gemini 브리핑 생성 + 탭 UI |
| Day 22 | 긴급 안전 알림 | `safety_alerts` + 4가지 급성 신호 감지 + 즉시 알림 |
| Day 23 | 사회적 연결 점수 | `social_events` + `social_scores` + 주간 점수 차트 |
| Day 24 | 케어 여정 타임라인 | `monthly_aggregates` + 가족 주석 + AI 분기 요약 |
| Day 25 | 실제 전화 연동 테스트 | Solapi Voice 실발신 검증 (→ `PRD-day25-real-call-test.md`) |

## 2. 제품 방향 — 세 가지 응답 채널

1. **링크 응답**: SMS/카카오 알림톡 등으로 짧은 링크를 보내고, 어르신이 "완료/도움/나중에" 중 하나를 누른다. 구현이 가장 쉽고 현재 웹사이트와 자연스럽게 연결됨.
2. **AI 비서 안부전화**: 처음부터 자유대화로 가지 않고, 안전한 스크립트 기반 안부전화(Level 1~2)부터 시작해서 추후 음성 대화형 Voice Agent(Level 3)로 확장.
3. **RAG 챗봇**: 자녀가 웹사이트 안에서 부모님별로 질문(예: "아버지 오늘 약 복용 관련 남은 거 있어?")하면, `parent_profiles`/`care_tasks`/`message_logs`/`call_attempts`를 안전하게 검색해 답한다.

중요한 원칙(전체 로드맵 공통):
- 어르신은 새 앱을 설치하지 않는다. 자녀/보호자만 회원가입한다.
- 모든 데이터는 `owner_user_id` + `parent_id` 기준으로 격리한다(Day6+7에서 이미 확립된 원칙, 이후 모든 신규 테이블에도 동일 적용).
- 전화, 링크, 챗봇은 모두 같은 Supabase 데이터 모델 위에서 동작한다.

## 3. AI 비서 안부전화 — 구현 난이도 3단계

- **Level 1 — Scripted IVR (MVP 권장)**: AI가 만든 짧은 스크립트를 전화로 읽어주고, 어르신은 키패드로 1(완료)/2(도움)/3(다시 알려줘)을 누른다. Twilio Voice의 outbound call + TwiML `Say`/`Gather` 또는 국내 대체 전화 API. 안전하고 단순하지만 자유대화는 아님.
- **Level 2 — Semi-AI Care Call**: RAG가 부모님 프로필 + 오늘 할 일을 바탕으로 `call_script`를 생성하지만, 전화 자체는 여전히 스크립트/키패드 응답 중심. Claude Code로 충분히 구현 가능성 높음.
- **Level 3 — Realtime Conversational Voice Agent**: STT→LLM/RAG→TTS 또는 OpenAI Realtime/Vapi/Retell. 제품 차별화는 크지만 비용·지연시간·개인정보·안전성 검증 부담이 큼 — MVP 핵심 기능이 안정된 뒤 실험 트랙으로 진행.

결론: 최소 MVP에는 Level 1~2만 넣는다. Level 3는 실험/확장 트랙으로 문서화하고, Claude가 직접 못 만들면 가이드 역할(15장)로 전환한다.

## 4. Day 8 — Notification Queue / Delivery Adapter (이번 Day의 상세 설계는 `tasks/tasks-day8-notification-queue.md` 참고)

알림을 바로 보내지 않고, 먼저 "보낼 메시지 대기열"과 "발송 시도 기록"부터 만든다.

**`notification_queue` 필드**: `id`, `owner_user_id`, `parent_id`, `care_task_id`, `channel`(`link`/`sms`/`kakao_alimtalk`/`voice_call`/`web_push`), `message_text`, `response_token`, `status`(`pending`/`prepared`/`processing`/`sent`/`failed`/`cancelled`/`responded`), `scheduled_for`, `expires_at`, `created_at`. voice_call 확장 필드: `call_script`, `call_goal`(`reminder`/`wellbeing_check`/`medication_check`/`meal_check`/`emergency_check`), `max_attempts`, `preferred_call_window`.

**`delivery_attempts` 필드**: `id`, `owner_user_id`, `parent_id`, `queue_id`, `provider`(`mock`/`twilio`/`kakao_partner`/`sms_provider`/`vapi`/`retell`), `channel`, `request_payload`, `response_payload`, `status`, `external_message_id`, `error_code`, `error_message`, `attempted_at`.

Day 8 성공 기준: 실제 발송 없이 Mock으로 알림 후보 생성, voice_call도 큐 채널로 표현 가능, 모든 큐/시도 데이터가 `owner_user_id`+`parent_id`로 격리.

## 5. Day 9 — 어르신 링크 응답 MVP

핵심 라우트: `/r/[token]`, `GET/POST /api/responses/[token]`. 응답 옵션: `completed`/`need_help`/`remind_later`/`wrong_target`. 응답 시 `notification_queue.status = responded`, `care_tasks.status`를 `completed`/`help_requested`/`snoozed`로, `message_logs`에 `direction = parent_response` 기록. UI는 로그인 없이 접근 가능하지만 토큰은 충분히 길고 만료 시간이 있어야 하며, 큰 버튼 2~3개만 표시(복잡한 텍스트 입력 없음).

## 6. Day 10 — 자녀 대시보드와 응답 모니터링

`/dashboard`, `/dashboard/parents/[parentId]`, `/dashboard/tasks`, `/dashboard/responses`, `/dashboard/calls`에서 오늘 예정된 care_tasks, 완료/미응답/도움 요청, 최근 message_logs/notification_queue/call_attempts, 부모님별 RAG 메모 요약을 보여준다. 관리 화면은 모두 로그인 필수, `parent_id` 소유권 항상 검증, 도움 요청은 강조하되 실제 응급 신고로 오해되지 않게 표시.

## 7. Day 11 — AI 비서 안부전화 Mock MVP

실제 전화 전에 웹 안에서 전체 플로우를 Mock으로 검증(비용·개인정보 리스크 때문에 Mock부터). `care_call_schedules`(`call_type`, `schedule_time`, `days_of_week`, `consent_status`: `test_only`/`consent_pending`/`consent_granted` 등), `care_call_attempts`(`provider`, `status`, `call_script`, `parent_response`, `transcript`, `summary`, `risk_level`: `none`/`low`/`medium`/`high` 등). `/dashboard/calls`에서 "안부전화 미리보기 생성" → "Mock 전화 실행" → 완료/도움 필요/무응답 버튼으로 시뮬레이션.

## 8. Day 12 — Scripted IVR 실험 설계

Twilio Voice(또는 국내 대체) outbound call + TwiML `Say`/`Gather`. `/api/calls/twilio/outbound`, `/api/calls/twilio/gather`(DTMF 수신), `/api/calls/twilio/status`. 환경변수 `ENABLE_REAL_CALLS=false`가 기본값. Claude가 직접 구현하기 어려우면 `docs/voice-call-provider-guide.md` 등 가이드 문서로 대체(15장 패턴).

## 9. Day 13 — RAG-lite 챗봇

처음부터 pgvector/embedding으로 가지 않고, 이미 구조화된 Supabase 데이터(`parent_profiles.care_context`/`daily_routine`/`medication_notes`/`communication_style`, 최근 30일 `care_tasks`/`message_logs`, 최근 N건 `call_attempts`)를 검색해 답변. `/dashboard/parents/[parentId]/assistant` + `POST /api/assistant/chat`. 필수 보안: 로그인 확인, `parent_id` 소유권 검증, 모든 쿼리에 `owner_user_id`+`parent_id` 필터 강제, 시스템 프롬프트에 "의료 진단/약 변경/금융 처리 금지" 명시, 근거 없으면 "기록상 확인되지 않습니다"라고 답변. LLM API를 바로 못 붙이면 `mockAssistantProvider`로 먼저 구현.

## 10. Day 14 — 벡터 RAG 또는 Voice Agent 선택

- **선택 A(벡터 RAG)**: RAG-lite가 잘 동작하고 데이터가 늘어나 검색 품질 개선이 필요할 때. `pgvector` 활성화, `rag_documents`(`owner_user_id`/`parent_id`/`source_type`/`content`/`embedding`), `match_rag_documents` 함수. **vector search에도 `owner_user_id`+`parent_id` 필터를 DB 쿼리 레벨에서 반드시 강제** — 프롬프트 지시만으로는 부족.
- **선택 B(Voice Agent 확장)**: 전화 컨셉이 더 중요하고 RAG-lite만으로 챗봇은 충분할 때. Twilio/Vapi/Retell/OpenAI Realtime 검토, 본인 번호로 1건만 먼저 테스트.

## 11. Day 15 — 최소 MVP 데모

최종 데모 시나리오(12단계): 로그인 → 부모님 프로필+루틴/복약메모/말투 입력 → 일정 생성("내일 오전 9시에 혈압약...") → `notification_queue` 후보 생성 → 링크 응답 미리보기 → 어르신 화면에서 완료/도움 요청 → 대시보드 반영 → 안부전화 Mock 실행 → `call_attempts` 기록 → RAG 챗봇에 "아버지 오늘 상태 요약해줘" 질문 → 요약 응답.

완료 기준: 실제 외부 발송 없이도 전체 플로우 설명 가능, 실제 SMS/전화는 플래그+Provider만 붙이면 되는 구조, 데이터 격리 구조 있음, RAG-lite가 붙어 있음, 안부전화는 Mock/Scripted IVR 준비 상태.

## 12. AI 비서 안부전화용 RAG 프롬프트 설계 (Day 11~13에서 사용)

시스템 규칙: 의료 진단/약 변경/금융 처리 대행 금지, 한 번에 하나의 질문만, 짧고 다정한 문장, 완료/도움/다시 알림 중 하나로 응답, 응급 상황 의심 시 자녀 확인 요청 권장.

입력 context: `display_name`, `relation`, `communication_style`, `daily_routine`, `medication_notes`, 오늘 due `care_tasks`, 최근 도움 요청, 최근 `call_attempts` summary.

출력 JSON 예시:
```json
{
  "call_goal": "medication_check",
  "opening": "안녕하세요, SilverLink AI 비서입니다.",
  "main_message": "아버님, 오전 혈압약 드실 시간이에요.",
  "question": "이미 드셨으면 1번, 도움이 필요하면 2번, 나중에 다시 알려드리길 원하시면 3번을 눌러주세요.",
  "risk_level": "none",
  "child_summary": "오전 혈압약 복용 여부를 확인하는 전화입니다."
}
```
이 prompt는 실제 사용 시 `docs/rag-call-script-prompt.md`에 저장하고 mock provider로 먼저 테스트한다(Day 11 범위).

## 13. 실제 전화 기능 도입 전 체크리스트 (Day 12 이후 적용)

- `ENABLE_REAL_CALLS=false`가 기본값
- 실제 테스트 전 본인 번호만 사용, 부모님 실제 번호는 동의 전 사용 금지
- `consent_status`가 `consent_granted`일 때만 실제 전화 가능
- 통화 녹음 여부 명확히 분리, 녹음/전사 데이터는 PII로 취급
- 전화 스크립트는 의료 진단/약 변경/금융 지시를 하지 않음
- provider API key는 서버 환경변수에만, webhook route는 서명/secret token 검증 고려

실제 전화 테스트 순서: Mock call → 본인 번호 1회 → 본인 번호 3회 반복 → 가족 동의 후 제한된 실험 → 실제 어르신 대상 파일럿.

## 14. Claude가 직접 못 만들 때의 대체 가이드 역할

실시간 음성 에이전트/전화 Provider 연동을 Claude가 바로 구현하기 어려우면, 코드를 억지로 만들지 않고 `docs/voice-call-provider-comparison.md`, `docs/twilio-care-call-setup-guide.md`, `docs/vapi-retell-evaluation-guide.md`, `docs/openai-realtime-voice-agent-spike.md`, `docs/real-call-safety-checklist.md` 같은 가이드 문서로 대체한다(계정 생성/API key 발급/환경변수/webhook URL/로컬 테스트/비용 리스크/한국어 음성 품질/PII 주의사항 포함). **Claude가 못 만드는 것은 실패가 아니라 안전한 기술 PM/가이드 역할로의 전환**이라는 원칙.

## 15. Day 8~15 전체에 적용되는 절대 금지 / 안전 규칙

- `.env.local` 출력 금지, API key/service role key 노출 금지
- 사용자 승인 없이 실제 SMS/카카오 알림톡/전화 발송 금지
- 사용자 승인 없이 실제 부모님 전화번호 사용 금지
- `owner_user_id` 또는 `parent_id` 검증 없는 조회/검색/발송 금지
- 의료 진단, 약 변경, 금융 처리 대행 금지
- 모든 외부 발송/통화는 Mock Provider로 먼저 검증
- 실제 SMS/카카오/전화 발송은 명시적 플래그가 `true`일 때만 실행

이 5개 규칙은 [[feedback_safety_constraints]]에 기록된 기존 Day6+7 안전 규칙(서비스 롤 키 금지, 실제 발송 금지, env 플래그 확인)과 동일한 원칙의 연장이다.

## 16. 최소 MVP 이후 완제품 방향 (참고, 이번 범위 아님)

자녀용 웹 대시보드, 어르신용 No-New-App 채널(링크/SMS/카카오/안부전화), RAG 기반 개인화, 회원별 RLS+동의 상태+응급 오판 방지, 해외 확장(한국: 카카오+SMS+안부전화 / 일본: LINE+전화 / 서양권: SMS+WhatsApp+Voice call).

## 17. 참고 자료 (원문 링크)

- OpenAI Realtime / Voice Agents: https://developers.openai.com/api/docs/guides/realtime , https://developers.openai.com/api/docs/guides/voice-agents
- Twilio Programmable Voice: https://www.twilio.com/docs/voice/api , https://www.twilio.com/docs/voice/tutorials/how-to-make-outbound-phone-calls
- NAVER CLOVA CareCall(국내 벤치마크): https://www.navercorp.com/en/media/pressReleasesDetail?seq=30922 , https://guide.ncloud-docs.com/docs/en/clovacarecall-overview
- Retell AI / Vapi: https://docs.retellai.com/deploy/outbound-call , https://vapi.ai/
- OWASP LLM Top 10(프롬프트 인젝션/데이터 유출 대응 — RAG 검색 단계 필터 강제 근거): https://owasp.org/www-project-top-10-for-large-language-model-applications/

---

## ⚠️ v2 컨셉 전환 (2026-07-10) — 이하 섹션이 기존 Day 12, 25 계획을 대체

### 전환 배경 (BM 강의 기반 판단)

| 항목 | v1 (AI TTS 발신) | v2 (통화 녹음 + AI 분석) |
|---|---|---|
| Pain Point | 편의(알림 자동화) | 두려움(대화 속 건강 신호를 놓칠까 봐) |
| 고객 행동 | 새 행동 필요 | 이미 하는 전화를 강화 |
| PMF 가능성 | 낮음 (로보콜 거부감) | 높음 (자연스러운 플로우) |
| 기술 리스크 | Solapi/Twilio 연동 | 마이크 녹음(iOS/Android 모두 가능) |

**핵심**: "이미 하는 행동(가족이 부모님에게 전화)을 개선한다" — 배달의 민족 패턴.

### 제거/축소되는 기능
- Solapi TTS 발신 (AI가 어르신에게 전화 거는 기능) → 완전 제거
- SMS 발송 → 알림 목적으로만 축소
- Scripted IVR / DTMF 키패드 응답 (Day 12 원안) → 제거
- Day 25 실제 전화 연동 → 범위 변경 (통화 녹음 실기기 테스트로 전환)

### 유지되는 기능 (웹 대시보드)
Auth, 어르신 프로필 관리, AI 안전 분석 파이프라인, 안전 알림(7가지 신호), 케어 타임라인, 사회 연결 점수, 케어 보고서, 복지사 모드, RAG 챗봇, 학술 참조 페이지, 다크 모드

---

## 18. v2 신규 Day 계획 (Day 29 ~ Day 34)

### Day 29 — 모바일 앱 기반 구축 (Expo + 전화번호부)

**목표**: 모바일 앱 프로젝트 생성 + 전화번호부 연동으로 어르신 등록

**주요 작업**
- `expo init silverlink-mobile` (TypeScript 템플릿)
- `expo-contacts`: 전화번호부 접근 권한 요청 + 연락처 검색/선택 UI
- 선택한 연락처를 Supabase `parent_profiles`에 등록 (기존 웹 DB와 동일)
- 기존 Supabase Auth(이메일/비밀번호)로 웹과 동일 계정 공유
- 앱 ↔ 웹 데이터 동기화 확인 (어르신 등록하면 웹 대시보드에도 반영)

**성공 기준**: 연락처에서 어르신을 선택해 등록하면 웹 대시보드에 나타남

---

### Day 30 — 통화 녹음 기능

**목표**: 앱에서 통화 중 녹음 버튼 → 오디오 파일 저장 → 서버 업로드

**주요 작업**
- `expo-av`: 마이크 권한 요청 + 녹음 시작/정지/저장 UI
- 녹음 파일(.m4a) → Supabase Storage 업로드 (`call_recordings` 버킷)
- 신규 테이블 `call_recordings`: `id`, `owner_user_id`, `parent_id`, `audio_url`, `duration_sec`, `recorded_at`, `status`(`pending`/`transcribing`/`analyzed`/`failed`)
- 통화 상대(어르신) 선택 → 녹음과 자동 연결
- 녹음 목록 + 재생 UI (앱 내)

**성공 기준**: 앱에서 녹음 → Supabase Storage에 파일 업로드 → 목록에서 재생 가능

**안전 규칙**
- 녹음은 사용자가 직접 시작 버튼을 눌러야만 시작 (자동 녹음 없음)
- `owner_user_id` 기준 격리, 다른 사용자 녹음 접근 불가
- 오디오 파일은 PII(개인식별정보)로 취급

---

### Day 31 — AI 음성 분석 파이프라인

**목표**: 녹음 파일 → 전사(transcript) → AI 건강 신호 분석 → 웹 대시보드 연동

**주요 작업**
- 오디오 → 텍스트: Gemini 1.5 Pro `inlineData` 오디오 직접 분석 (Whisper API 대체 가능)
- 기존 AI 안전 분석 파이프라인 재활용: 7가지 신호(인지, 신체, 정서, 사회, 영양, 수면, 통증) 감지
- 신규 컬럼 `call_recordings.transcript`, `call_recordings.ai_summary`, `call_recordings.risk_level`
- 분석 완료 → `safety_alerts` 자동 생성 (기존 알림 시스템과 동일)
- 웹 대시보드 `/dashboard/calls` → 녹음 목록 + 전사본 + AI 요약 확인

**성공 기준**: 녹음 업로드 후 10초 이내에 AI 요약 + 위험 신호가 웹에서 확인됨

---

### Day 32 — 경쟁사 분석 + 포지셔닝 문서 (BM 강의 보완)

**목표**: "어르신 건강 특화 AI 통화 분석" 차별화 포지션 확립

**주요 작업**
- 유사 앱 분석: 네이버 클로바 노트, Google Recorder, 일반 통화 녹음 앱 vs SilverLink
- 차별화 포인트: ① 어르신 건강 특화 신호 감지 ② 가족/복지사 대시보드 ③ 케어 타임라인
- `docs/competitor-analysis.md` 작성
- 웹 랜딩 페이지(`/`) + 앱 스토어 설명 문구 초안 작성
- 대시보드 도움말(`NavPageGuide`) 새 컨셉 기준으로 전면 업데이트

**성공 기준**: "왜 SilverLink인가"를 3문장으로 설명할 수 있음

---

### Day 33 — 온보딩 플로우 + PMF 검증 지표 (BM 강의 보완)

**목표**: 신규 사용자가 처음 접속해서 첫 AI 분석까지 3단계로 완료

**온보딩 3단계**
1. 회원가입 → 앱 다운로드 안내
2. 전화번호부에서 어르신 등록
3. 첫 통화 녹음 → AI 분석 확인 (성공 화면 + 공유 버튼)

**PMF 검증 지표 (대시보드에 추가)**
- 주간 녹음 횟수 (핵심 지표: 7일 내 2회 이상 → 리텐션 가능성 높음)
- AI 분석 완료율
- 안전 알림 확인율 (알림 수신 후 클릭 비율)
- 7일 재방문율

**성공 기준**: 신규 가입자가 5분 내에 첫 AI 분석 결과를 받을 수 있음

---

### Day 34 — 수익 모델 구현 (BM 강의 핵심 보완)

**목표**: Freemium 구조로 첫 수익 경로 구현

**요금제 설계**
| 플랜 | 가격 | 한도 |
|---|---|---|
| Free | 무료 | 월 10회 녹음, 기본 AI 요약 |
| Care+ | 월 9,900원 | 무제한 녹음, 상세 안전 분석, 케어 보고서, 복지사 초대 |
| Family | 월 19,900원 | Care+ + 다중 어르신 등록(5명), 가족 공유 |

**주요 작업**
- `subscriptions` 테이블: `owner_user_id`, `plan`(`free`/`care_plus`/`family`), `expires_at`
- 설정 페이지 `/dashboard/settings` → 요금제 탭 추가 (Stripe 연동 스켈레톤)
- 무료 한도 초과 시 업그레이드 유도 모달
- 요금제별 기능 게이팅 (녹음 횟수 카운터)

**성공 기준**: 무료 10회 초과 시 업그레이드 모달이 뜨고, 요금제 페이지가 보임

---

## 19. v2 전체 로드맵 요약

| Day | 목표 | 핵심 산출물 |
|---|---|---|
| 8~27 | 기존 웹 대시보드 완성 | Auth, 프로필, AI 분석, 알림, 타임라인 등 |
| 29 | 모바일 앱 기반 | Expo + 전화번호부 연동 + Supabase 계정 공유 |
| 30 | 통화 녹음 | expo-av + Supabase Storage + 녹음 목록 |
| 31 | AI 음성 분석 | Gemini 오디오 → 전사 → 7가지 신호 → 알림 |
| 32 | 포지셔닝 | 경쟁사 분석 + 랜딩 문구 + 도움말 업데이트 |
| 33 | 온보딩 + PMF | 3단계 온보딩 + 리텐션 지표 대시보드 |
| 34 | 수익 모델 | Freemium 구조 + Stripe 스켈레톤 |

**핵심 기술 스택 추가**
- `expo` + `expo-contacts` + `expo-av`
- `Gemini 1.5 Pro` (오디오 직접 처리)
- `Supabase Storage` (call_recordings 버킷)
- `Stripe` (결제, Day 34)
