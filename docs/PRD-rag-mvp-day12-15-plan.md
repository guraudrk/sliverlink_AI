# SilverLink AI RAG MVP 실행 문서 — Day 12~15 계획 (참고 문서)

## 0. 문서 정보
- 출처: 사용자가 2026-06-25 PDF/MD/TXT로 전달한 "SilverLink AI RAG MVP 실행 문서"를 그대로 옮긴 참고 문서
- **이 문서는 `docs/PRD-day8-to-mvp-master-plan.md`의 Day 12~15 섹션을 대체(supersede)한다.** 원래 계획은 "Day12=실제 전화 Provider, Day13=RAG-lite"였는데, 이 문서의 8장 분석에 따라 **Day12와 Day13의 순서를 바꿔 RAG를 먼저 완성**하기로 했다. 실제 전화 연동은 post-MVP 백로그로 미뤄지고 `ENABLE_REAL_CALLS=false` 기본값 + 가이드 문서로만 남는다.
- 핵심 결론: 이번 MVP의 RAG는 의료 진단 챗봇이 아니라 **가족 돌봄 운영 기록을 안전하게 검색·요약·설명하는 보호자용 AI 비서**("Care Evidence Assistant", 한국어 UI명 "돌봄 기록 AI 비서")로 설계한다.

## 1. 한 문장 결론

SilverLink AI의 RAG는 "부모님별 프로필, 일정, 링크 응답, 알림 기록, Mock 안부전화 기록을 `owner_user_id` + `parent_id`로 강제 필터링한 뒤, **구조화 SQL 검색 + 선택적 pgvector 검색 + 근거 카드**로 답변하는 Care Evidence RAG"로 만든다. 출시 버전이 답해야 할 핵심 질문 4개: "어머니 최근 응답 상태 요약해줘", "도움 요청이 있었던 일정만 보여줘", "이번 주 복약/식사 관련 알림 흐름을 정리해줘", "안부전화 Mock 결과를 보고 내가 지금 확인해야 할 일이 뭐야?"

## 2. 최신 RAG 조사에서 가져올 것 / 버릴 것 (요약)

| 기법 | 결정 | 이유 |
|---|---|---|
| Naive vector RAG | **버림** — 1차 검색은 구조화 SQL | "도움 요청", "최근 7일" 같은 질문은 권한/시간/상태값이 중요해서 순수 vector search는 위험 |
| Contextual Retrieval(Anthropic) | **Day14에 채택** | 짧은 이벤트("완료했어요")는 맥락(부모님/일정/채널/시각)을 붙여야 검색 가치가 생김. `rag_documents.content`가 아니라 `contextual_text`로 저장 |
| Hybrid Search + Reranking | **Day14에 채택** | SQL/키워드와 의미 검색이 섞인 질문이 많음(Day12~13은 SQL+lexical만) |
| GraphRAG | **지금 안 만듦, 메타데이터만 보존** | 장기 패턴 분석엔 매력적이지만 지금 데이터량엔 과함 |
| Agentic RAG | **검증 루프(CRAG)만 채택** | full agentic orchestration은 비용/복잡도 과함. evidence가 0개/낮은 score면 "기록 부족" 응답으로 환각 방지 |
| Healthcare RAG 안전 원칙 | **채택** | 진단형 표현 금지, "직접 확인 권장"형 표현만 사용 |

## 3. 제품 정의

- **기능명**: Care Evidence Assistant (한국어 UI명: 돌봄 기록 AI 비서)
- **경로**: `/dashboard/assistant`
- **MVP 답변 원칙**: ①근거 카드 1~5개 우선 ②로그인 사용자 데이터만 검색 ③`parent_id` 선택 시 그 부모님 데이터만 ④근거 부족하면 부족하다고 말함 ⑤의료 진단/응급 판단 대신 돌봄 운영 보조로만 답함 ⑥마지막에 "지금 확인할 일" 1~3개 제안
- **화면 구성**: 부모님 선택 드롭다운, 빠른 질문 버튼 4개(최근 상태 요약/도움 요청만 보기/복약 관련 기록 정리/안부전화 결과 요약), 자유 질문 입력창, AI 답변 영역, 근거 카드 영역, 안전 문구

## 4. 추천 아키텍처

```
User question → /dashboard/assistant UI → POST /api/rag/ask
  1) auth 확인(getUser())
  2) parent_id 소유권 검증
  3) query classifier: summary / help / medication / calls / open
  4) structured retrieval: SQL by owner_user_id + parent_id + time window
  5) optional vector retrieval: rag_documents match (RLS-safe 함수, Day14+)
  6) evidence pack 생성
  7) safety guard + answer prompt
  8) LLM 생성 또는 deterministic fallback
  9) answer + evidence cards 반환
```

**왜 SQL-first인가**: `care_tasks where owner_user_id = auth.uid() and parent_id = :parent_id and status = 'help_requested'` 같은 질문은 vector search보다 SQL이 더 정확하고 안전하다. **vector가 유용한 경우**(Day14+): "최근 어머니가 불편해하신 내용이 뭐야?" 같은 의미 검색.

**Evidence Pack 타입**(LLM에 DB row를 그대로 넣지 않고 정규화):
```ts
type RagEvidence = {
  id: string;
  sourceType: 'parent_profile' | 'care_task' | 'message_log' | 'notification_queue' | 'care_call_attempt';
  parentId: string;
  title: string;
  summary: string;
  rawText: string;
  createdAt: string;
  importance: 'low' | 'medium' | 'high';
  safetyFlags: string[];
  url?: string;
};
```

## 5. 데이터 설계

- **Day12**: 새 테이블 없음. repo 함수들이 기존 6개 테이블(`parent_profiles`/`care_tasks`/`message_logs`/`notification_queue`/`care_call_attempts`/`delivery_attempts`)에서 `owner_user_id`(+`parent_id`) 기준으로 읽어 `RagEvidence[]`로 합치는 방식.
- **Day14**: `rag_documents` 테이블(pgvector) + `match_rag_documents` 함수 추가. **이 함수는 SECURITY DEFINER가 아니다** — 로그인한 보호자가 직접 호출하고 RLS/`auth.uid()`로 제한(Day9의 토큰 기반 함수와는 다른 케이스). embedding 차원은 사용 모델에 맞춤(OpenAI `text-embedding-3-small` = 1536).

## 6. 답변 프롬프트 (Day13에서 사용)

System prompt 핵심: Care Evidence Assistant 역할, 제공된 evidence로만 답변, 의사/응급요원/변호사/치료사가 아님, 진단/처방/안전 단언 금지, evidence 부족시 명확히 알림, `help_requested` 기록 있으면 직접 연락 권장, 답변은 항상 "요약/근거/지금 확인할 일/주의문구" 순서.

Deterministic fallback(LLM 키 없을 때, Day13에서 구현): "최근 기록 {{n}}개를 확인했습니다. 도움 요청 {{helpCount}}건, 완료 {{completedCount}}건, 나중에 응답 {{snoozedCount}}건이 있습니다. 가장 최근 도움 요청은 {{latestHelpSummary}}입니다. 지금은 직접 연락해 확인하는 것을 권장합니다."

## 7. Day 12~15 실행 계획 개요

- **Day 12 — RAG 기초 설계 + Evidence API**: vector 없이 동작하는 RAG-lite 뼈대. 결과물 `POST /api/rag/evidence` + `RagEvidence` 타입. **새 DB 테이블 없이 가능해야 함.** (상세 task는 `tasks/tasks-day12-rag-evidence-layer.md` 참고)
- **Day 13 — RAG 챗봇 UI + 답변 API**: `/dashboard/assistant` + `POST /api/rag/ask`. LLM 키 있으면 LLM, 없으면 deterministic fallback.
- **Day 14 — pgvector + Contextual Retrieval + 평가**: `rag_documents`/`match_rag_documents` 추가(이번에만 새 SQL 실행 필요). 평가 질문 12개로 retrieval 품질 측정(10개 이상 통과 목표).
- **Day 15 — 출시 데모 + 보안 검증 + 문서화**: 데모 시나리오, RLS A/B 계정 격리 **실제 검증**(드디어!), README/docs 업데이트.

## 8. 우선순위 변경: Day12 실제 전화 → RAG (이번에 적용한 결정)

기존 로드맵은 Day12=실제 전화 Provider, Day13=RAG-lite였지만, 다음 이유로 **순서를 바꿔 RAG를 먼저 완성**한다:
1. 이미 `/dashboard/calls` Mock이 있어 전화 컨셉은 데모 가능 — 실제 전화가 당장 없어도 스토리는 완성됨
2. 실제 전화 Provider는 비용/전화번호/동의/스팸규정/실패처리 문제가 생겨 MVP 속도를 늦춤
3. RAG는 이미 쌓인 Day8~11 데이터의 가치를 가장 쉽게 보여줌
4. "이 서비스가 왜 AI인가"를 가장 쉽게 보여주는 기능이 RAG

**실제 전화 Provider는 post-MVP 백로그로 이동** — `ENABLE_REAL_CALLS=false` 기본값을 유지한 채 필요해지면 `docs/voice-provider-guide.md`로 가이드만 남긴다(아직 작성 안 함).

## 9. 보안/프라이버시 설계 (OWASP LLM Top 10 기준)

| 위협 | 대응 |
|---|---|
| Prompt Injection | evidence scope를 서버에서 강제, LLM이 권한을 결정하지 않음 |
| Sensitive Information Disclosure | `owner_user_id` + RLS + `parent_id` 검증 |
| Vector Permission Bypass(Day14+) | `match_rag_documents`에 `auth.uid()` 필터 강제 |
| Overreliance | UI/프롬프트에 의료 진단 아님 명시 |
| Excessive Agency | RAG는 읽기 전용, 발송은 별도 버튼+플래그 필요 |
| Data Poisoning | retrieved text는 명령이 아니라 데이터로 취급(prompt 분리) |

**금지 표현**: "치매입니다", "우울증입니다", "응급입니다", "괜찮습니다", "약을 바꾸세요", "병원에 안 가도 됩니다" 등. **대신**: "기록상 이런 패턴이 보입니다", "직접 확인해 보세요", "도움 요청 응답이 있었으므로 전화 확인을 권장합니다".

## 10. 폴더 구조 제안 (Day12~14 전체)

```
src/
  app/
    (protected)/dashboard/assistant/page.tsx        # Day13
    api/rag/evidence/route.ts                        # Day12
    api/rag/ask/route.ts                              # Day13
    api/rag/reindex/route.ts                          # Day14
  components/rag/
    care-assistant-panel.tsx, evidence-card.tsx, quick-question-buttons.tsx   # Day13
  lib/silverlink/rag/
    types.ts, query-classifier.ts, evidence-builder.ts                       # Day12
    answer-generator.ts, safety-guard.ts                                     # Day13
    contextualizer.ts, embedding.ts, evaluation-fixtures.ts                  # Day14
  lib/supabase/
    rag-evidence-repo.ts                              # Day12
    rag-documents-repo.ts                             # Day14
```

## 11. 출시 전 체크리스트 (Day15에서 최종 확인)

- **기능**: `/dashboard/assistant` 접근/부모님 선택/빠른 질문 4개/자유 질문/근거 카드 표시/evidence 부족 시 환각 방지/`help_requested` 시 직접 연락 권장
- **보안**: `parentId` 소유권 검증/계정 A·B 데이터 격리 **실제 테스트**/vector match 함수 `auth.uid()` 필터/service role key 미사용/prompt injection 테스트/의료 진단 질문 방어
- **품질**: `npx vitest run`/`npm run build` 통과/평가 질문 12개 중 10개 이상 근거 있는 답변/모바일 비파손/빈 데이터 UX

## 12. 참고 자료 (원문 링크)

- Anthropic Engineering — Contextual Retrieval in AI Systems: https://www.anthropic.com/engineering/contextual-retrieval
- Microsoft Research — GraphRAG: https://www.microsoft.com/en-us/research/blog/graphrag-unlocking-llm-discovery-on-narrative-private-data/
- Supabase Docs — RAG with Permissions: https://supabase.com/docs/guides/ai/rag-with-permissions
- Supabase Docs — Vector search with Next.js and OpenAI: https://supabase.com/docs/guides/ai/examples/nextjs-vector-search
- OWASP — Top 10 for LLM Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- arXiv — Corrective Retrieval Augmented Generation(CRAG): https://arxiv.org/abs/2401.15884
- arXiv — Agentic RAG Survey: https://arxiv.org/html/2501.09136v4
- MDPI AI — RAG in Healthcare: https://www.mdpi.com/2673-2688/6/9/226

## 13. 최종 판단

최신 논문을 모두 구현하는 게 아니라 **현재 데이터 구조와 보안 원칙에 맞는 실용형 RAG를 먼저 완성**하는 것이 최선이다. Day12~13: SQL-first RAG로 즉시 사용 가능한 챗봇 완성 → Day14: pgvector+contextual retrieval로 기술적 깊이 추가 → Day15: A/B 격리, 위험 질문 방어, 데모로 출시 가능 상태 만들기.
