# Tasks: Day 14 — 벡터 검색 + 3대 RAG 기법 + 명령 실행(Function Calling)

기준 문서: `docs/GUIDE-day14-rag-self-build-gemini-pgvector.md` (설계/배경 이론), 이번 Day부터는 가이드대로 **실제 코드로 구현**한다(가이드는 PRD 역할, 이 파일이 실행 작업표).

## 중요 — 작업 중지 규칙
`GEMINI_API_KEY`가 `.env.local`에 없다. **Slice 5(임베딩 파이프라인)부터는 실제 Gemini API 호출이 필요해 키 없이는 진행/검증이 불가능하다.** Slice 1~4(키 불필요)를 끝낸 뒤 작업을 멈추고 사용자에게 키 발급 여부를 묻는다 — 임의로 dead code를 만들거나 키 없이 추측 코드만 쌓지 않는다(Day5/8/11/12/13과 같은 code-first 원칙).

## Relevant Files
- `docs/supabase-schema-member-scoped.sql` — `rag_documents` 테이블 + RLS 4정책 + HNSW 인덱스 + `match_rag_documents` 함수 추가
- `src/lib/silverlink/rag/contextualizer.ts` (신규) — `buildContextualText(evidence)`: LLM 호출 없이 템플릿으로 맥락 문장 생성(Contextual Retrieval)
- `src/lib/silverlink/rag/hybrid-search.ts` (신규) — `fuseResults(vectorResults, keywordResults)`: Reciprocal Rank Fusion
- `src/lib/silverlink/rag/crag-check.ts` (신규) — `checkEvidenceQuality(evidenceWithScores, threshold)`: CRAG 유사도 임계값 체크
- (Slice 5+, 키 필요) `src/lib/silverlink/rag/embedding.ts`, `src/lib/supabase/rag-documents-repo.ts`, `answer-generator.ts`의 `buildLlmAnswer`, function calling 도구 정의/실행 라우터

## Notes
- 명령 실행(전화/메시지)은 기존 라우트를 그대로 재사용한다 — 새 안전장치를 만들지 않는다:
  - 전화: `POST /api/care-calls/preview` `{ care_task_id }` → `POST /api/care-calls/[attemptId]/start`
  - 메시지: `POST /api/delivery/preview` `{ care_task_id, channel: "sms"|..., message_text }` (`MockDeliveryProvider`라 실제 외부 발송 없음)
  - 둘 다 `care_task_id` 필수(parentId 아님) → Slice 9~10에서 "어떤 일정인지" 식별 단계가 따로 필요
- pgvector SQL은 anon key로 DDL 실행이 불가능해 Claude Code가 대신 실행할 수 없다 — 사용자가 Supabase SQL Editor에서 직접 실행해야 한다(Day6~13과 동일).
- 커밋·푸시는 사용자가 명시적으로 요청한 시점에만 수행한다.

## 작업 목록 (Tasks)

- [x] 1.0 pgvector 스키마 (키 불필요)
  - [x] 1.1 `docs/supabase-schema-member-scoped.sql`에 `create extension if not exists vector` + `rag_documents` 테이블 + RLS 4정책 추가
  - [x] 1.2 HNSW 인덱스 + `match_rag_documents(query_embedding, match_parent_id, match_count)` SQL 함수 추가(일반 RLS 기준, SECURITY DEFINER 아님)
  - [ ] 1.3 사용자에게 Supabase SQL Editor 실행 안내 — **아직 실행 전, 사용자가 직접 실행 필요**(anon key로 DDL 불가)

- [x] 2.0 Contextual Retrieval (키 불필요)
  - [x] 2.1 `contextualizer.ts`: `buildContextualText(evidence)` 템플릿 함수
  - [x] 2.2 유닛 테스트 4건(출처 타입별 라벨링, epoch 배경 정보 처리, 원문 보존)

- [x] 3.0 Hybrid Search RRF (키 불필요)
  - [x] 3.1 `hybrid-search.ts`: `fuseResults()` 구현(가변 개수 리스트 지원)
  - [x] 3.2 유닛 테스트 5건(중복 항목 상위 노출, 단독 항목 포함, 순위 보존, 빈 입력, 3개 이상 리스트)

- [x] 4.0 CRAG 임계값 체크 (키 불필요)
  - [x] 4.1 `crag-check.ts`: `checkEvidenceQuality()` 구현(정렬 가정 없이 최댓값 기준)
  - [x] 4.2 유닛 테스트 7건(0건/미달/충분/정렬 무관/similarity 없음/threshold 지정/기본값)
  - [x] 4.3 `npx vitest run` 97/97 통과, `npm run build` 통과 확인

- [ ] 🛑 STOP — GEMINI_API_KEY 필요 여부 확인 (사용자에게 질문, 키 받기 전까지 진행 안 함)

- [x] 5.0 임베딩 파이프라인 (키 필요)
  - [x] 5.1 `@google/genai` 패키지 설치
  - [x] 5.2 `embedding.ts`: `embedTexts()`/`embedText()` — gemini-embedding-001, 768차원
  - [x] 5.3 `rag-documents-repo.ts`: `upsertRagDocuments()`
  - [x] 5.4 `indexer.ts`: `indexRagDocuments()` — evidence 전체를 맥락화→임베딩→적재
  - [x] 5.5 `POST /api/rag/reindex` 라우트
  - [x] 5.6 실제 키로 임베딩 API 직접 호출해 동작 확인(768차원 정상 수신) — **사용자 수동 테스트는 아직**

- [x] 6.0 벡터 검색 연동 + Hybrid Search + CRAG (키 필요)
  - [x] 6.1 SQL `match_rag_documents` 수정: `match_parent_id` optional(전체 부모님 검색 지원) + `source_id` 반환 추가 — **사용자가 Supabase에서 재실행 필요**
  - [x] 6.2 `rag-documents-repo.ts`: `searchRagDocuments()` parentId optional 대응
  - [x] 6.3 `evidence-service.ts`: 키 있으면 벡터 검색 실행 → CRAG(최고 유사도 미달 시 벡터 채널 전체 폐기) → Hybrid Search(RRF)로 키워드 결과와 병합. 키 없으면 기존 키워드 전용 동작 그대로(회귀 없음)
  - [x] 6.4 `npm run build`/`npx vitest run` 97/97 통과 — **사용자 수동 테스트는 아직**

- [x] 7.0 자연스러운 톤의 LLM 답변 생성 (키 필요)
  - [x] 7.1 실제 키로 `gemini-3-flash-preview`/`gemini-2.5-flash` 생성 호출 직접 확인(둘 다 정상 응답) → `gemini-3-flash-preview`를 기본값으로 채택
  - [x] 7.2 `gemini-client.ts`로 클라이언트 생성 로직 공유(embedding.ts와 중복 제거)
  - [x] 7.3 `answer-generator.ts`: `deriveNextSteps` 추출(안전 판단은 항상 결정론적), `buildLlmAnswer` 추가(페르소나 시스템 프롬프트 + 자연스러운 구어체 지시), 금지 표현 필터(`containsForbiddenPhrase`) + 실패 시 `buildFallbackAnswer`로 안전 폴백
  - [x] 7.4 `/api/rag/ask`: 키 있으면 `buildLlmAnswer`, 없으면 기존 `buildFallbackAnswer`(회귀 없음)
  - [x] 7.5 `npx vitest run` 99/99, `npm run build` 통과 — **사용자 수동 테스트는 아직**

- [x] 7.6 속도 튜닝 1차(사용자 피드백 — 답변이 너무 느림): `thinkingConfig.thinkingBudget: 0`으로 Gemini의 보이지 않는 "생각" 토큰 생성을 끄고(직접 측정: 모델 기본값 ~7.5초 → 0.0초 설정 시 ~1.0~1.2초), `maxOutputTokens: 500`, 모델을 `gemini-2.5-flash`로 변경. `evidence-service.ts`: 질문 임베딩 호출을 DB 조회와 동시에 시작하도록 병렬화(직렬 대기 제거)
- [x] 7.7 1차 튜닝 재검토(사용자 지시 — thinking은 켠 상태로, 발견한 위험 2개 해결): 가상 시나리오로 직접 검증한 결과 `thinkingBudget: 0`이 모호한 명령에서 함수 호출 자체를 누락시키는 위험(3/3 미스)을 발견 → `thinkingConfig.thinkingLevel: "MINIMAL"`로 교체(같은 시나리오에서 정확도 회복 확인, 속도는 ~2~4초로 완전히 끄는 것보단 느리지만 기본값보단 훨씬 빠름). `gemini-2.5-flash`는 `thinkingLevel` 미지원(400 에러) + 무료 한도 분당 5회(429 실제로 발생)라 `gemini-3-flash-preview`로 복귀. 시스템 프롬프트의 "3~5문장, 너무 길지 않게" 제약도 제거(사용자 우선순위 "세세하게"와 충돌했었음), `maxOutputTokens`를 1200으로 상향

- [x] 8.0 Function Calling 도구 정의(전화/메시지) (키 필요)
  - [x] 8.1 `gemini-client.ts`: `getLlmModel()`을 answer-generator.ts에서 옮겨 공유(action-tools.ts도 같은 모델명 참조)
  - [x] 8.2 `action-tools.ts`: `request_care_call`/`send_care_message` 도구 선언(2개), `detectActionIntent()`(일정 목록+질문 → Gemini function calling → 의도 판단), `parseActionIntent()`(순수 함수로 분리 — functionCall이 우리가 정의한 도구와 일치하는지 + care_task_id가 실제 후보 목록에 있는지 검증, LLM 환각 방지)
  - [x] 8.3 단위 테스트 8건(`parseActionIntent`): 도구 없음/request_care_call 변환/send_care_message 변환+채널 기본값/유효 채널 보존/존재하지 않는 care_task_id 거부/필수값 누락/빈 메시지 거부/알 수 없는 도구 거부
  - [x] 8.4 버그: `@google/genai`를 import하는 파일에서 `@/` 절대경로를 같이 쓰면 Vitest 모듈 해석이 깨지는 걸 발견(다른 곳에선 문제 없었음 — `@google/genai`를 import하는 파일이 처음이라 이번에 처음 드러남) → 같은 디렉토리 트리 안이라 상대경로(`../delivery/schema`)로 교체해 해결
  - [x] 8.5 `npx vitest run` 107/107, `npm run build` 통과
- [x] 9.0 일정(care_task) 식별 + 도구 실행 + 확인 응답 (키 필요)
  - [x] 9.1 `action-tools.ts`: `selectActionCandidates()` 추가(완료된 일정 제외, parentId 필터, limit) — 단위 테스트 4건
  - [x] 9.2 `action-executor.ts`(신규): `executeActionIntent()` — `request_care_call`은 기존 `/api/care-calls/preview`+`/start` 로직을 그대로 재사용(repo 함수 직접 호출, HTTP 자기호출 아님), `send_care_message`는 `/api/delivery/preview`와 동일한 흐름(MockDeliveryProvider). 어르신 응답(respond)까지는 대신하지 않음 — 그건 기존 `/dashboard/calls` 화면 몫
  - [x] 9.3 `action-service.ts`(신규): `tryHandleActionRequest()` — 일정 후보 조회 → `detectActionIntent` → `executeActionIntent` → `buildActionAnswer`(고정 문구, LLM이 다시 쓰지 않음). 의도 판단 실패 시 명령으로 잘못 실행하지 않고 질문 경로로 자연스럽게 넘어감
  - [x] 9.4 `types.ts`: `RagQueryCategory`에 `"action"` 추가, `answer-generator.ts`/`rag-ui-meta.ts`에 라벨 추가
  - [x] 9.5 `/api/rag/ask`: 질문 분류보다 먼저 `tryHandleActionRequest` 시도, 명령으로 처리됐으면 평소 경로 건너뜀
  - [x] 9.6 버그 재발: `action-executor.ts`/`action-service.ts`의 나머지 `@/` 절대경로 import도 같은 Vitest 문제를 일으켜(Slice 8에서 발견한 것과 동일 원인) 전부 상대경로로 교체
  - [x] 9.7 `npx vitest run` 115/115, `npm run build` 통과 — **사용자 수동 테스트는 아직**
- [x] 10.1 (사용자 요청 2026-06-26) `care-assistant-panel.tsx`를 단발성 Q&A에서 연속 대화형 채팅 UI로 재구성 — 메시지 배열(`ChatMessage[]`) 도입, 입력창 화면 하단 고정, 답변 받은 뒤에도 계속 질문 가능, 자동 스크롤
- [x] 10.2 (사용자 요청 2026-06-26, "이게 중요해") 이전 대화 맥락 기억 기능 추가:
  - `schema.ts`: `conversationMessageSchema` + `ragQueryRequestSchema.history` 추가(최근 10턴, 서버 검증 상한 20)
  - `conversation-history.ts`(신규): `formatHistoryTranscript()`(LLM 프롬프트용 대화록, 최근 6턴), `buildHistoryAwareSearchText()`(벡터 검색용 — 최근 자녀 질문 1~2개를 현재 질문에 붙여 임베딩. 분류기는 키워드 기반이라 과거 발화 섞이면 오분류 위험이 커 현재 질문만 그대로 씀) — 단위 테스트 6건
  - `evidence-service.ts`: 임베딩 시 `buildHistoryAwareSearchText` 적용
  - `answer-generator.ts`: `buildLlmAnswer`/`generateNaturalAnswerText`에 `history` 전달, 프롬프트에 대화록 포함
  - `action-tools.ts`: `detectActionIntent`에 `history` 전달 — "그 일정 전화해줘" 같은 후속 명령도 disambiguation 가능
  - `action-service.ts`: `input.history`를 `detectActionIntent`로 전달
  - `/api/rag/ask`: `buildLlmAnswer` 호출에 `input.history` 전달
  - `care-assistant-panel.tsx`: 매 질문마다 최근 10턴을 `history`로 함께 전송(현재 질문은 히스토리에 중복 포함 안 함)
  - 실제 Gemini 호출로 직접 검증: "최근 상태 요약해줘" → "그 중에 도움 필요했던 거 있어?" 후속 질문이 이전 답변 내용을 정확히 참조해서 답함을 확인
  - `npx vitest run` 121/121, `npm run build` 통과
- [ ] 10.0 실행 전 확인 UX + 채팅 UI 연동 (키 필요)
- [ ] 11.0 평가(질문형 + 명령형 케이스, 톤 채점)

- [ ] 12.0 (백로그, 사용자 요청 2026-06-26) `nextSteps` 추천 항목을 바로 실행할 수 있는 링크/버튼으로 확장
  - 지금은 `RagAnswer.nextSteps`가 "도움 요청한 항목 직접 확인하기" 같은 안내 문구 텍스트로만 표시됨(`care-assistant-panel.tsx`의 "⚡ 지금 확인할 일" 목록)
  - 각 nextStep에 실제 행동으로 바로 이어지는 버튼/링크를 붙인다(예: 해당 일정으로 이동하는 링크, Slice 8~10에서 만들 전화/메시지 액션을 같은 챗봇 안에서 한 번에 실행하는 버튼)
  - Slice 8~10(명령 실행/Function Calling)과 자연스럽게 이어지는 작업이라, 그 슬라이스들을 먼저 끝낸 뒤 착수
