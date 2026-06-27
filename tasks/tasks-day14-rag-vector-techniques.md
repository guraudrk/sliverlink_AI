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
  - [x] 1.3 사용자에게 Supabase SQL Editor 실행 안내 — 사용자가 직접 실행, 성공 확인

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
  - [x] 5.6 실제 키로 임베딩 API 직접 호출해 동작 확인(768차원 정상 수신) — 사용자 브라우저 수동 테스트 완료(2026-06-26, 10.x 항목 참고)

- [x] 6.0 벡터 검색 연동 + Hybrid Search + CRAG (키 필요)
  - [x] 6.1 SQL `match_rag_documents` 수정: `match_parent_id` optional(전체 부모님 검색 지원) + `source_id` 반환 추가 — 사용자가 Supabase에서 재실행, 성공 확인
  - [x] 6.2 `rag-documents-repo.ts`: `searchRagDocuments()` parentId optional 대응
  - [x] 6.3 `evidence-service.ts`: 키 있으면 벡터 검색 실행 → CRAG(최고 유사도 미달 시 벡터 채널 전체 폐기) → Hybrid Search(RRF)로 키워드 결과와 병합. 키 없으면 기존 키워드 전용 동작 그대로(회귀 없음)
  - [x] 6.4 `npm run build`/`npx vitest run` 97/97 통과 — 사용자 브라우저 수동 테스트 완료(2026-06-26, 10.x 항목 참고)

- [x] 7.0 자연스러운 톤의 LLM 답변 생성 (키 필요)
  - [x] 7.1 실제 키로 `gemini-3-flash-preview`/`gemini-2.5-flash` 생성 호출 직접 확인(둘 다 정상 응답) → `gemini-3-flash-preview`를 기본값으로 채택
  - [x] 7.2 `gemini-client.ts`로 클라이언트 생성 로직 공유(embedding.ts와 중복 제거)
  - [x] 7.3 `answer-generator.ts`: `deriveNextSteps` 추출(안전 판단은 항상 결정론적), `buildLlmAnswer` 추가(페르소나 시스템 프롬프트 + 자연스러운 구어체 지시), 금지 표현 필터(`containsForbiddenPhrase`) + 실패 시 `buildFallbackAnswer`로 안전 폴백
  - [x] 7.4 `/api/rag/ask`: 키 있으면 `buildLlmAnswer`, 없으면 기존 `buildFallbackAnswer`(회귀 없음)
  - [x] 7.5 `npx vitest run` 99/99, `npm run build` 통과 — 사용자 브라우저 수동 테스트 완료(2026-06-26, 10.x 항목 참고)

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
  - [x] 9.7 `npx vitest run` 115/115, `npm run build` 통과 — 사용자 브라우저 수동 테스트 완료(2026-06-26, 10.x 항목 참고)
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
- [x] 10.x (사용자 버그 리포트 2026-06-26) 답변/명령 판단 단일 호출 구조로 재설계 + 모델/요금 문제 해결:
  - 문제: 후속 질문이 느려지고, 답변이 매끄럽지 않게(결정론적 fallback 템플릿) 나오고, "전화 걸어줘"가 도구 호출로 이어지지 않음
  - 원인 1(구조): 질문 답변(`buildLlmAnswer`)과 명령 판단(`detectActionIntent`)이 직렬로 호출되는 2-call 구조라 호출 수가 2배였음 → `assistant-response.ts`(신규) `generateAssistantAnswer()`로 통합, 한 번의 `generateContent` 호출에서 텍스트 답변과 function calling을 동시에 판단. `action-tools.ts`에서 `detectActionIntent`/`ACTION_SYSTEM_PROMPT` 제거(dead code화), `action-service.ts`는 `buildActionAnswer`만 남김, `answer-generator.ts`는 `buildLlmAnswer`/`generateNaturalAnswerText` 제거하고 `deriveNextSteps`/`CATEGORY_LABELS`를 export로 전환해 재사용. `/api/rag/ask`가 `generateAssistantAnswer`를 호출하도록 교체
  - 원인 2(모델/계정): `gemini-3-flash-preview`는 무료 등급 한도가 모델당 **하루 20건**(429 RESOURCE_EXHAUSTED 직접 확인) — preview 모델만의 문제가 아니라 **무료 등급은 모델 종류 불문 모델당 하루 20건**이라는 걸 `gemini-2.5-flash`에서도 같은 한도(`limit: 20`)로 재확인. SDK는 이런 오류를 자동 재시도하지 않아 한 번 걸리면 바로 fallback. `gemini-3.5-flash`(GA, thinkingLevel 지원)로 시도했으나 출시 직후 수요 폭주로 503 UNAVAILABLE이 빈번 → 최종적으로 `gemini-2.5-flash` + `thinkingConfig.thinkingBudget: 0`(thinkingLevel 미지원, 400 에러)로 정착, 직접 호출로 안정성/속도(0.9~1.9초)/function calling 정확도 모두 확인
  - 보강: 429/500/502/503/504 같은 일시적 오류에 0.8초 후 1회만 재시도하는 `generateContentWithRetry()` 추가(Google이 응답에 적어주는 49초짜리 retryDelay를 그대로 기다리면 챗봇이 못 쓸 정도로 느려짐), fallback으로 떨어질 때마다 원인을 `console.error`로 서버 로그에 남기도록 추가(진단 가능하게)
  - 시스템 프롬프트 보강: "절대 불릿/목록 형태로 답하지 말고 실제 사람이 말로 설명해주듯 자연스럽게" 지침 추가 — 직접 호출로 비교해 자연스러움 개선 확인
  - **최종 해결**: 사용자가 결제 등급으로 업그레이드(Google AI Studio billing 연결) → 모델당 하루 20건 한도가 풀려 위 문제 전부 재발하지 않음을 `npm run check:gemini`(신규 점검 스크립트, `scripts/check-gemini-model.mjs`)로 검증. 실제 비용은 `countTokens`로 측정한 토큰 수 기준 질문 1건당 약 0.36~1.5원 수준(공식 가격: gemini-2.5-flash 입력 $0.30/1M, 출력 $2.50/1M)
  - 자체 호스팅(Ollama 등)으로 비용을 없애는 대안도 검토했으나, 이 앱 규모에서는 자체 호스팅 최저가(GPU VPS 상시 운영 약 27만원/월)가 Gemini 유료 등급 비용(월 1,000~4,500원 수준)보다 훨씬 비싸 기각 — 학습 목적의 별도 사이드 프로젝트로만 남겨둠
  - 사용자가 브라우저에서 직접 검증: 속도/자연스러움/멀티턴 맥락/명령 실행(모호한 명령에서 되묻기 포함) 전부 정상 확인
  - `npx tsc --noEmit`/`npx vitest run` 121/121 통과
- [x] 10.0 실행 전 확인 UX + 채팅 UI 연동 (키 필요, 사용자 요청 2026-06-26 "확인 단계 추가 (안전 우선)")
  - `types.ts`: `RAG_QUERY_CATEGORIES`에 `"action_pending"` 추가 — LLM이 명령 의도를 감지했지만 아직 실행 전, 확인 대기 상태를 나타내는 카테고리
  - `action-tools.ts`: `describeActionIntent(intent, candidateTasks)` 추가 — 일정 내용/채널 라벨을 넣어 "OO 일정으로 안부전화를 걸까요?" 같은 확인 문구를 결정론적으로 생성(LLM이 다시 쓰지 않음, buildActionAnswer와 같은 원칙). 단위 테스트 3건
  - `assistant-response.ts`: `decideTurn`이 명령을 감지해도 더 이상 곧바로 `executeActionIntent`를 호출하지 않고, `describeActionIntent`로 만든 확인 문구 + `category: "action_pending"` + `pendingAction`(intent 원본)을 반환. `generateAssistantAnswer`에서 `supabase`/`ownerUserId` 파라미터 제거(실행을 더 이상 여기서 하지 않으므로)
  - `action-service.ts`: `confirmActionIntent(supabase, ownerUserId, intent, candidateTasks)` 추가 — 확인 버튼을 눌렀을 때 호출되며, 그 사이 일정이 완료/변경됐을 수 있어 최신 candidateTasks로 다시 검증한 뒤에만 `executeActionIntent` 실행(LLM 환각 방지와 같은 원칙을 시간차에도 적용)
  - `/api/rag/ask`: 응답에 `pendingAction` 필드 추가(있으면 클라이언트가 확인/취소 버튼을 보여줌)
  - `/api/rag/confirm-action`(신규): 확인 버튼 클릭 시 호출, parentId 소유권 검증 → 최신 candidateTasks 재조회 → `confirmActionIntent` 실행. `schema.ts`에 `ragActionIntentSchema`(discriminated union)/`ragConfirmActionRequestSchema` 추가
  - `care-assistant-panel.tsx`: 명령이 감지된 메시지에 "확인"/"취소" 버튼 표시. 확인 누르면 같은 메시지 자리에서 category/answer를 실행 결과로 교체(새 메시지 추가 안 함), 취소는 서버 호출 없이 화면에서만 "취소했어요"로 교체
  - (사용자 요청, 같은 턴에 추가) 답변마다 항상 펼쳐져 있던 "근거 N건" 카드 목록을 기본 접힘 상태로 변경 — "근거 N건 보기/숨기기" 텍스트에 밑줄을 줘서 클릭 가능함을 표시, 클릭 시에만 카드 목록이 펼쳐짐
  - `npx tsc --noEmit` 클린, `npx vitest run` 124/124(신규 3건), `npm run build` 클린(`/api/rag/confirm-action` 라우트 생성 확인) — **사용자 브라우저 수동 테스트는 아직**
- [x] 10.5 (사용자 요청 2026-06-26) 채팅으로 새 일정(care_task) 등록하는 기능 추가 — "챗봇이 입력 양식을 정확히 알려주고, 사용자가 입력하는 식으로. 애매하면 철저하게 확인받는 식으로"
  - `action-tools.ts`: 세 번째 도구 `create_care_task`(parent_id, original_request) 추가. `RagActionIntent`에 `create_care_task` variant 추가, `ParentProfileCandidate` 타입 + `selectParentCandidates()`(listParentProfiles 결과에서 parentId 선택 여부에 따라 후보를 좁히는 순수 함수, selectActionCandidates와 같은 패턴) 추가. `parseActionIntent`/`describeActionIntent`에 candidateParentIds/parentCandidates 파라미터 추가해 세 번째 도구 케이스 처리(환각 방지 검증 동일 원칙)
  - 도구 설명/시스템 프롬프트에 "parent_id와 구체적인 요청 내용이 둘 다 명확할 때만 호출, 한두 단어짜리 모호한 요청은 절대 등록하지 말고 무엇이 부족한지 구체적으로 되물어라"를 명시 — 사용자가 요구한 "철저한 확인"을 프롬프트 레벨에서 강제
  - `action-executor.ts`: `executeCreateCareTask()` 추가 — `/api/create-task`와 동일하게 `createCareTask` insert(단, message_log는 안 남김 — 채팅으로 만든 요청에 `source_channel: "web"`을 억지로 붙이지 않기 위함)
  - `action-service.ts`: `confirmActionIntent`가 `create_care_task`는 candidateTasks 재검증을 건너뛰고(기존 일정을 고르는 게 아니므로) 바로 실행, `buildActionAnswer`에 결과 안내 케이스 추가
  - `assistant-response.ts`: `decideTurn`/`generateAssistantAnswer`에 `parentCandidates`/`selectedParentId` 파라미터 추가 — 부모님이 이미 선택돼 있으면 그 분으로 간주, 아니면 후보 목록을 프롬프트에 포함해 모호하면 되묻게 함. 이 새 명령도 기존 Slice 10.0의 "실행 전 확인" 흐름을 그대로 탄다(별도 확인 단계를 새로 안 만들었다)
  - `/api/rag/ask`: `listParentProfiles` 조회 추가, `selectParentCandidates`로 후보 구성 후 전달
  - 단위 테스트 8건 추가(`parseActionIntent`/`describeActionIntent`/`selectParentCandidates`의 create_care_task 케이스)
  - `npx tsc --noEmit` 클린, `npx vitest run` 132/132(신규 8건), `npm run build` 클린 — **사용자 브라우저 수동 테스트는 아직**
- [x] 10.6 (사용자 요청 2026-06-26, `/dashboard/create-task` 폼 스크린샷 기반) 채팅 일정 등록을 기존 웹 폼과 동일한 3-필드 구조로 맞추고, 일정 유형 분류를 추가 + 기존 웹 폼에도 유형 직접 지정 기능 추가
  - 요구사항: (a) 채팅에서 정보가 부족하면 스크린샷의 폼 그대로 "1. 보내는 분 2. 받는 분 3. 전하실 말씀"을 번호 매겨 되묻기 (b) 등록 시 일정을 유형별로 분류해 챗봇 답장에도 포함(나중에 관리 편의용) (c) (사용자가 직접 지적) `/dashboard/create-task` 기존 웹 폼에도 유형을 지정할 수 있어야 함 — 채팅 경로만 분류되고 웹 폼 경로는 빠져있던 격차
  - `care-tasks/task-type.ts`(신규): `TASK_TYPE_OPTIONS`(medication/meal/sleep/hospital/exercise/general) + `TASK_TYPE_LABELS` + `classifyTaskType()` — call-script-builder.ts의 `inferCallGoal()`과 같은 code-first 원칙(LLM 호출 없는 키워드 매칭, 관리용 메타데이터일 뿐이라 단순 매칭으로 충분). Day12에서 겪은 "약"이 "요약"에 오매칭되는 버그를 재발 방지(`복약`/`약 드`/`약 먹` 등 구체적 키워드만 사용) — 단위 테스트 7건(유형별 1건 + Day12 회귀 1건)
  - `care-tasks-repo.ts`: `CareTaskInsert`에 `task_type?: string` 추가
  - **채팅 경로**(`action-tools.ts`/`action-executor.ts`/`action-service.ts`/`assistant-response.ts`/`schema.ts`): `create_care_task` 도구에 `sender_name`(보내는 분) 필수 필드 추가, `RagActionIntent`의 `create_care_task` variant에 `senderName` 추가. `describeActionIntent`의 확인 문구가 "보내는 분/받는 분/전하실 말씀/유형" 네 가지를 모두 보여주도록 변경(`classifyTaskType` 호출). `parseActionIntent`가 `sender_name`도 검증(빈 값/누락 시 null). `executeCreateCareTask`는 `classifyTaskType(originalRequest)`로 `task_type`을 계산해 insert하고, 기존 웹 폼처럼 `createMessageLog`도 같이 호출(Slice 10.5에서는 "보내는 분"이 없어 안 남겼던 걸, 이제 sender_name이 생겨 다시 남김). `buildActionAnswer`가 `TASK_TYPE_LABELS`로 유형을 답변 문구에 포함. `ragActionIntentSchema`에 `create_care_task` discriminated union 케이스가 통째로 빠져있던 버그를 발견해 추가(`senderName` 포함). 시스템 프롬프트의 "새 일정 등록" 섹션을 스크린샷 폼과 동일한 번호 매긴 확인 형식으로 변경
  - **웹 폼 경로**(`/api/create-task/route.ts`, `task-request-form.tsx`): 채팅 경로만 분류하고 기존 `/dashboard/create-task` 폼은 그대로 두면, 같은 기능이 입력 경로에 따라 다르게 동작하는 격차가 생긴다는 사용자 지적에 따라 보강. `taskRequestInputSchema`/Make 웹훅 payload 계약은 그대로 두고(외부 계약을 건드리지 않기 위해), route.ts가 요청 body의 `task_type`(선택, `TASK_TYPE_OPTIONS` 중 하나)을 별도로 읽어 `createCareTask`에 전달 — 값이 없거나 빈 값이면 `classifyTaskType(message)`로 자동 분류해 항상 어떤 값이든 채워지도록 함. `TaskRequestForm`에 "유형" select 추가("자동 분류" 기본값 + 6개 옵션 직접 선택), 선택 시 body에 `task_type`을 같이 전송
  - 기존 단위 테스트(`action-tools.test.ts`) 중 `sender_name` 없이 호출하던 케이스들을 모두 수정, `action-service.test.ts`에 유형 라벨 포함 검증 테스트 추가
  - `npx tsc --noEmit` 클린, `npx vitest run` 141/141 통과, `npm run build` 클린, **사용자가 `/dashboard/create-task`에서 직접 확인 완료**("create-task는 문제없어")
  - (사용자 요청 2026-06-26, 같은 슬라이스에 이어서) `/dashboard/tasks`에서 일정을 눌러도 task_type이 잘 저장됐는지 확인할 방법이 없었음(목록만 보여주고 클릭해도 반응 없었음) → 일정을 클릭하면 반응형 팝업으로 세부 정보를 보여주도록 보강:
    - `care-tasks-repo.ts`: `CareTaskSummary`/`listCareTasks`의 select 절에 `task_type` 추가(지금까지 응답에 빠져 있어서 클라이언트가 받아볼 수도 없었음). `call-script-builder.test.ts`의 `CareTaskSummary` 픽스처에 `task_type: null` 추가(새 필드라 타입 에러 발생 — 수정)
    - `care-task-detail-modal.tsx`(신규, `evidence-detail-modal.tsx`와 같은 모달 패턴 재사용 — 모바일 바텀시트/데스크탑 중앙 팝업, 배경 클릭·Escape로 닫힘): 유형 배지, 대상자, 상태, 전하실 말씀, 보내는 분(message_log에서 조회), 등록일/완료일, 발송·통화 기록을 한 화면에 표시
    - `dashboard/tasks/page.tsx`: 목록의 각 일정을 `<button>`으로 감싸 클릭 가능하게 만들고, `selectedTask` 상태로 모달 표시. `/api/message-logs`도 같이 조회해 care_task_id로 매핑(보내는 분 표시용). 목록 카드에도 유형 배지를 추가해 굳이 안 열어도 한눈에 보이게 함
    - `npx tsc --noEmit` 클린, `npx vitest run` 141/141 통과, `npm run build` 클린 — **사용자가 `/dashboard/tasks` 클릭/모달 직접 확인 완료**
  - (사용자 버그 리포트 2026-06-26, 같은 슬라이스에 이어서) 채팅에서 실제로 써보니 두 가지 문제 발견:
    - (a) 모호한 요청("엄마 일정 새로 만들어줘")에 챗봇이 "1. 보내는 분 2. 전하실 말씀"만 되묻고 "유형"은 전혀 안 물어봤음 — 시스템 프롬프트가 유형을 자동 분류 전용으로만 다루고 사용자에게 직접 고를 선택지로 안내하지 않았던 게 원인. (b) 단순 명령("엄마 일정 새로 만들어줘")인데도 답변에 "근거 5건"이 붙어 나왔음 — `classifyQuery`가 이 메시지를 분류할 키워드가 없어 기본값 `"open"`으로 떨어졌고, `evidence-builder.ts`가 `"open"`/`"summary"`는 의도적으로 "근거 전체를 필터 없이 반환"하도록 만들어져 있어서, 명령문에도 관련 없는 근거가 통째로 붙어버린 것
    - 유형을 4번째 필수 안내 항목으로 추가: `action-tools.ts`의 `create_care_task` 도구에 `task_type`(선택, `TASK_TYPE_OPTIONS` enum) 파라미터 추가, `RagActionIntent`에 `taskType?: TaskType` 추가. `parseActionIntent`는 유효한 값만 받아들이고 잘못된 값은 조용히 무시(전체 요청을 거부하지 않음 — 부가 정보일 뿐 안전 검증 대상이 아니므로). `describeActionIntent`는 `intent.taskType ?? classifyTaskType(...)` 순서로 표시(자녀가 직접 골랐으면 그 값 우선). `executeCreateCareTask`도 동일하게 명시값 우선, 없으면 자동 분류
    - `assistant-response.ts` 시스템 프롬프트: "새 일정 등록" 섹션을 4개 항목(보내는 분/받는 분/전하실 말씀/유형)을 모두 안내하도록 변경. 단, 유형은 "복약/식사/수면·낮잠/병원/운동/일반 안부 중 하나, 모르면 '자동 분류'라고 답해도 됨"처럼 답이 없어도 호출을 막지 않는 유일한 항목으로 명시(다른 3개는 필수)
    - 명령에 근거가 잘못 붙는 문제는 근본적으로 `classifyQuery`에 "이건 질문이 아니라 명령이다"를 구분하는 카테고리가 없었던 게 원인이라, `types.ts`에 새 카테고리 `task_request` 추가. `query-classifier.ts`: `TASK_REQUEST_KEYWORDS`(만들어줘/등록해줘/추가해줘/새 일정 등)를 **가장 먼저** 검사(명령 내용에 다른 카테고리 키워드, 예: "병원 다녀오셨는지 확인하는 일정 만들어줘"의 "병원"이 섞여 있어도 명령이라는 사실이 주제보다 우선해야 하므로). `evidence-builder.ts`의 `filterByCategory`에 `task_request` 케이스를 추가해 항상 빈 배열을 반환(모인 근거가 있어도 무시) — 이 카테고리는 애초에 evidence로 답할 질문이 아니기 때문. `answer-generator.ts`/`rag-ui-meta.ts`에 라벨 추가
    - 단위 테스트 추가: `action-tools.test.ts`(유효/유효하지 않은 task_type 처리, taskType 명시 시 표시 우선순위) 6건, `query-classifier.test.ts`(task_request 분류, 명령 내 다른 키워드 혼재 시에도 명령 우선) 2건, `evidence-builder.test.ts`(task_request는 근거가 있어도 항상 빈 배열) 1건
    - `npx tsc --noEmit` 클린, `npx vitest run` 147/147 통과, `npm run build` 클린 — **사용자 브라우저 수동 테스트는 아직**
  - (사용자 버그 리포트 2026-06-26, 같은 슬라이스에 이어서) 브라우저로 다시 확인해보니 "유형까지 4개 항목으로 되묻는 것"은 정상이었지만, "근거 N건 보기" 토글은 여전히 떴음(되묻기 메시지에 근거 5건이 그대로 붙어있었음)
    - 원인: `classifyQuery`는 그 턴에 자녀가 보낸 메시지 한 줄만 보고 분류하는데, "엄마 일정 새로 만들어줘"가 `TASK_REQUEST_KEYWORDS`와 정확히 안 맞아떨어지는 표현이면(또는 표현 자체는 맞아도, 그 다음 턴들 — 빠진 항목에 답하는 "1.이름 2.안녕하세요 3.식사" 같은 메시지 — 에는 "만들어줘" 같은 명령 키워드가 전혀 없음) `"open"`으로 떨어져 근거 전체가 다시 붙어버린다. 즉 키워드 매칭만으로는 사용자가 어떤 식으로 표현하든, 그리고 새 일정 등록 흐름의 몇 번째 턴이든 안정적으로 잡아낼 수 없었다
    - 더 견고한 수정: 사용자의 입력 표현이 아니라 **우리가 직접 작성한 되묻기 템플릿 문구가 챗봇 응답 안에 들어있는지**를 검사하도록 바꿨다 — `assistant-response.ts`에 `looksLikeTaskCreationClarification(text)`(텍스트에 "보내는 분"과 "전하실 말씀"이 둘 다 있으면 true) 추가. `generateAssistantAnswer`가 LLM의 텍스트 답변이 이 패턴과 일치하면 `classifyQuery` 결과와 무관하게 `category: "task_request"` + 빈 근거로 강제 교체한다. 우리가 그 문구를 직접 지정했으므로(시스템 프롬프트), 사용자가 무엇을 입력했는지와 상관없이 항상 정확하게 판별된다
    - 단위 테스트 3건 추가(`assistant-response.test.ts`, 신규 — `looksLikeTaskCreationClarification` 순수 함수만 검증)
    - `npx tsc --noEmit` 클린, `npx vitest run` 150/150 통과, `npm run build` 클린 — **사용자가 브라우저에서 전체 흐름(4개 항목 되묻기/근거 토글 미표시/유형 반영) 직접 확인 완료**
- [x] 11.0 평가(질문형 + 명령형 케이스, 톤 채점) (키 필요)
  - 원래 가이드(`docs/GUIDE-day14-rag-self-build-gemini-pgvector.md` Step 9)는 "평가 질문 12개, 10개 이상 통과"였는데, Slice 8~10에서 명령형(전화/메시지/새 일정 등록) 케이스가 추가됐으므로 14개로 늘리고 통과 기준도 12개로 보정
  - `src/lib/silverlink/rag/__evaluation__/rag-evaluation.eval.ts`(신규): 질문형 8건(summary/help/medication/calls/open-의미검색/근거0건-환각방지/톤-불릿금지/안전-진단금지) + 명령형 6건(전화 명확/모호, 메시지 명확, 새일정 명확/모호, 받는분 모호)을 실제 `generateAssistantAnswer`(production 함수 그대로, Supabase 없이 synthetic evidence/candidateTasks/parentCandidates만 주입)로 돌려 채점. 매 코드 수정마다 도는 `npx vitest run`과 분리하기 위해 `*.eval.ts` 확장자 사용(기존 `vitest.config.ts`의 include가 `*.test.ts`만 잡아 자동으로 제외됨)
  - `vitest.eval.config.ts`(신규) + `package.json`의 `npm run evaluate:rag` 스크립트로 별도 실행(`*.eval.ts`만 수집, timeout 60s) — `check:gemini`와 같은 "키 필요한 점검은 별도 명령으로 분리" 원칙
  - **평가가 실제로 버그를 2건 발견함**(평가를 만드는 목적 그대로 작동):
    1. (테스트 픽스처 결함, 처음 작성 시) candidateTasks가 있는데 parentCandidates가 0개인 조합으로 테스트했더니 — 이 조합은 실제 production에서는 일어나지 않는다(care_task가 있으면 그 부모님 프로필도 항상 있음) — `buildParentListText`가 "부모님 프로필이 없으니 새 일정을 만들 수 없다고 안내하라"는 지시를 프롬프트에 끼워 넣어 전화/메시지 명령 케이스가 엉뚱하게 그 얘기로 새는 현상을 발견 → 픽스처를 실제 데이터 형태(parentCandidates 항상 최소 1개)로 수정
    2. (진짜 프롬프트 버그) 1번을 픽스처로만 고치고 나니, 이번엔 평가용 질문형 케이스(복약 기록 정리 등 — parentCandidates를 일부러 비워뒀던 케이스)에서 똑같은 "부모님 프로필 등록 안내" 문구가 새 일정 등록과 전혀 무관한 일반 질문 답변에 그대로 새는 걸 재현 — `assistant-response.ts`의 `buildParentListText`가 parentCandidates가 0개일 때 무조건 "안내하세요"라고 지시했던 게 원인. "자녀가 새 일정을 등록하려고 할 때만 안내하고, 그 외 일반 질문에는 언급하지 마세요"로 적용 범위를 명시해 수정. 모든 질문형 케이스에도 실제 데이터처럼 최소 1개 parentCandidates를 주도록 픽스처 보강(이중 방어)
    3. `help` 케이스의 "직접 연락 권유" 체크가 처음엔 LLM의 자유 산문(answerText)에서 정규식으로 찾으려 했는데, 자연어 답변은 매번 표현이 달라져서(이번 실행에선 "더 자세히 알려드릴까요?"처럼 권유 없이 끝남) 불안정했다 — 실제 production의 안전 보장은 `deriveNextSteps`(결정론적, answer-generator.ts)가 `help_requested` 플래그를 보고 항상 붙이는 `nextSteps` 배열에 있으므로, 체크 대상을 그쪽으로 바꿔 안정화
  - `npx tsc --noEmit` 클린, `npx vitest run` 150/150 통과(평가 파일은 일반 스위트에 안 잡힘 — 의도대로 분리됨), `npm run build` 클린, `npm run evaluate:rag` 연속 2회 실행 모두 14/14 통과 확인
  - **변경 파일**: `src/lib/silverlink/rag/__evaluation__/rag-evaluation.eval.ts`(신규), `src/lib/silverlink/rag/assistant-response.ts`(buildParentListText 프롬프트 수정), `vitest.eval.config.ts`(신규), `package.json`

- [x] 12.0 (2026-06-27 완료) `nextSteps` 추천 항목을 바로 실행할 수 있는 링크/버튼으로 확장
  - `RagAnswer.nextSteps`를 `string[]`에서 `RagNextStep[]`(`{ label: string; href?: string }`, `types.ts`)으로 변경
  - `deriveNextSteps`(`answer-generator.ts`)가 안전 플래그를 유발한 근거 항목의 `parentId`로 `/dashboard/parents/${parentId}` 링크를 붙임(help_requested/medication_related 각각)
  - `action-service.ts`의 `buildActionAnswer`도 결과별로 링크 부여: 안부전화→`/dashboard/calls`, 새 일정 등록/메시지 발송→`/dashboard/tasks`
  - `care-assistant-panel.tsx`: href가 있으면 `next/link`로 클릭 가능한 버튼(앰버 배경), 없으면 기존처럼 텍스트만 표시
  - `npx tsc --noEmit` 클린, `npx vitest run` 150/150 통과, `npm run build` 클린, `npm run evaluate:rag` 통과(케이스 2의 체크를 `nextSteps.includes(문자열)`에서 `nextSteps.some(step => step.label === ...)`로 갱신)
  - **변경 파일**: `src/lib/silverlink/rag/types.ts`, `answer-generator.ts`, `action-service.ts`, `__tests__/answer-generator.test.ts`, `__tests__/action-service.test.ts`, `__evaluation__/rag-evaluation.eval.ts`, `src/components/rag/care-assistant-panel.tsx`
  - 13.0/14.0(아래)과 한 묶음으로 보면 됨 — 모두 "확인/실행이 끝난 결과에 바로 이어지는 액션 버튼"이라는 같은 패턴. 14.0에서 이 버튼 스타일을 그대로 재사용 가능

- [x] 13.0 (2026-06-27 완료) 대시보드: 미발송 알림 일괄 확인 + 발송 팝업
  - 요구사항(사용자 원문): "dashboard에서 버튼을 누르면 발송되지 않은, 등록된 알림이 뜨고, 그 중 하나를 클릭하면 팝업창이 뜨고 sms/카카오톡 중 하나를 선택해서 알림을 보냄"
  - **착수 전 발견한 버그(사용자에게 확인 후 수정)**: "미발송" 정의로 쓰기로 했던 `notification_status` 컬럼이 사실 Day5 레거시 알림 엔진(`/api/notifications/prepare`)만 갱신하는 죽은 필드였다 — 지금 실제로 쓰는 두 발송 경로(`/api/delivery/preview`, 챗봇의 `send_care_message` 실행)는 이 필드를 전혀 건드리지 않아서, 그대로 두면 발송에 성공해도 계속 "미발송"으로 보이는 버그가 생겼을 것. `updateCareTaskNotificationStatus`(`care-tasks-repo.ts`, 신규)를 두 발송 경로(`/api/delivery/preview/route.ts`, `action-executor.ts`의 `executeSendCareMessage`) 끝에서 호출해, 발송 성공 시 실제로 `notification_status`를 `'sent'`로 갱신하도록 고친 뒤 진행
  - 정의(확정): `selectUnsentCareTasks`(`care-tasks-repo.ts`, 신규 순수 함수) — `status !== "completed" && notification_status !== "sent"`
  - 레거시 정리(사용자 확인 후): `/dashboard`의 "알림 미리보기"(`/notifications`) 카드를 새 "미발송 알림"(`/dashboard/tasks?unsent=1`) 카드로 교체. `/notifications` 페이지/API 자체는 삭제하지 않고 그대로 둠(링크만 제거)
  - `/dashboard/tasks/page.tsx`: `useSearchParams`로 `?unsent=1` 진입 시 "미발송만 보기" 토글이 기본 on(Next.js 권장대로 `<Suspense>`로 감쌈). 토글 on 상태에서 카드를 클릭하면 기존 `CareTaskDetailModal` 대신 새 `SendNotificationModal`(채널 선택 + 발송)이 뜸. 발송 성공 시 API 재호출 없이 그 자리에서 `notification_status: "sent"`로 갱신해 목록에서 즉시 빠짐
  - `SendNotificationModal`(`src/components/tasks/send-notification-modal.tsx`, 신규): `care-task-detail-modal.tsx`의 반응형 모달 패턴 재사용. SMS/카카오 알림톡 버튼 + 메시지 내용(기본값=original_request) → 기존 `POST /api/delivery/preview`를 그대로 호출(새 API 불필요)
  - `npx tsc --noEmit` 클린, `npx vitest run` 153/153 통과(`selectUnsentCareTasks` 단위 테스트 3건 추가), `npm run build` 클린
  - **변경 파일**: `src/lib/supabase/care-tasks-repo.ts`(`selectUnsentCareTasks`, `updateCareTaskNotificationStatus`), `src/lib/silverlink/rag/action-executor.ts`, `src/app/api/delivery/preview/route.ts`, `src/app/(protected)/dashboard/tasks/page.tsx`, `src/app/(protected)/dashboard/page.tsx`, `src/components/tasks/send-notification-modal.tsx`(신규), `src/lib/supabase/__tests__/care-tasks-repo.test.ts`
  - **수동 UI 테스트는 아직 안 함** — 브라우저 자동화 도구가 없어 직접 클릭해보지 못함. `/dashboard` → "미발송 알림" 카드 → 항목 클릭 → 채널 선택 → 발송 → 목록에서 사라지는지 한 번 직접 확인 필요

- [x] 14.0 (2026-06-27 완료) 챗봇: 새 일정 등록 직후 즉시 알림 발송 버튼
  - 요구사항(사용자 원문): "챗봇에서 막 등록한 거를 즉시 알람을 보내는 기능(이것도 버튼으로 선택할 수 있게)"
  - 구현: 새로운 실행 경로를 만들지 않고 기존 `send_care_message` 확인/실행 플로우(pendingAction → confirmAction)를 재사용
    - `action-executor.ts`: `RagActionResult`의 `create_care_task` 분기에 `originalRequest`를 추가로 담아 반환(이후 알림 메시지 기본값으로 재사용하기 위함)
    - `types.ts`: `RagAnswer`에 `createdCareTask?: { careTaskId, originalRequest }` 추가 — 새 일정이 막 등록됐을 때만 채워짐
    - `action-service.ts`: `buildActionAnswer`의 create_care_task 분기가 `createdCareTask`를 채움
    - `care-assistant-panel.tsx`: `createdCareTask`가 있으면(아직 pendingAction이 없을 때) "지금 알려드릴까요?" + SMS/카카오 알림톡 버튼 2개를 보여줌. 클릭 시 `startFollowUpNotify(messageId, channel)`가 새 API 호출 없이 같은 메시지에 `send_care_message` 타입 `pendingAction`을 얹고(messageText 기본값=originalRequest) `createdCareTask`를 지움 → 기존 확인/취소 UI가 그대로 나타나고, 확인을 누르면 기존 `confirmAction`(POST /api/rag/confirm-action)이 실제 발송을 수행
  - `npx tsc --noEmit` 클린, `npx vitest run` 150/150 통과(`action-service.test.ts`에 `createdCareTask` 검증 추가), `npm run build` 클린, `npm run evaluate:rag` 통과
  - **변경 파일**: `action-executor.ts`, `types.ts`, `action-service.ts`, `__tests__/action-service.test.ts`, `src/components/rag/care-assistant-panel.tsx`
  - **수동 UI 테스트는 아직 안 함** — 브라우저 자동화 도구가 없어 클릭 흐름을 직접 확인하지 못했다. 사용자가 챗봇에서 새 일정을 등록한 뒤 "지금 알려드리기" 버튼 → 채널 선택 → 확인까지 한 번 직접 눌러보고 확인 필요
