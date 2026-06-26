# Tasks: Day 13 — RAG 챗봇 UI + 답변 API (`/dashboard/assistant`)

기준 문서: `docs/PRD-rag-mvp-day12-15-plan.md` 3장/6장/7장/10장 (Day 13 부분)

## Relevant Files
- `src/lib/silverlink/rag/evidence-service.ts` (신규, 계획에 없던 리팩터) — `resolveRagEvidence(supabase, input)`: 소유권 검증 → 분류 → repo 조회 → builder 정규화까지 한 번에 묶은 함수. Day12의 `/api/rag/evidence`와 이번 `/api/rag/ask`가 똑같은 로직을 거쳐야 해서, 중복을 막기 위해 공유 함수로 추출했다.
- `src/lib/silverlink/rag/types.ts` — `RagAnswer` 타입 추가(`answerText`/`evidence`/`nextSteps`/`hasSufficientEvidence`)
- `src/lib/silverlink/rag/answer-generator.ts` (신규) — `buildFallbackAnswer(category, evidence)`: 실제 LLM 호출 없이 모은 근거를 고정 템플릿 한국어 문장으로 정리(Day5/8/11과 같은 code-first 원칙)
- `src/lib/silverlink/rag/schema.ts` — `ragEvidenceRequestSchema`를 `ragQueryRequestSchema`로 이름 변경(두 라우트가 같은 입력 형태를 공유하므로)
- `src/app/api/rag/evidence/route.ts` — `resolveRagEvidence` 재사용하도록 리팩터(동작은 동일)
- `src/app/api/rag/ask/route.ts` (신규, POST) — `resolveRagEvidence` → `buildFallbackAnswer` → 응답
- `src/components/rag/care-assistant-panel.tsx`, `src/app/(protected)/dashboard/assistant/page.tsx` (신규) — 부모님 선택 드롭다운 + 빠른 질문 4개 + 자유 질문 입력 + 답변/근거 카드 + 안전 문구
- `src/app/(protected)/dashboard/page.tsx` — 허브에 "돌봄 기록 AI 비서" 링크 추가
- 유닛 테스트: `answer-generator.test.ts`

## Notes
- **이번 Day도 실제 LLM을 호출하지 않는다.** `.env.local`을 확인해 본 결과(값은 출력하지 않고 키 존재 여부만 확인) `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`가 둘 다 없어서, 애초에 실제 LLM 경로로 갈 수도 없다 — 그래서 이번 Day는 계획대로 "LLM 키 없을 때의 deterministic fallback"만 완성하고, 실제 LLM 연동은 키가 생기는 시점에 별도로 결정한다(지금 추가하면 아무도 안 쓰는 죽은 코드가 됨).
- 위 이유로 마스터플랜이 언급한 `safety-guard.ts`(LLM 출력에서 진단/안전 단언 표현을 걸러내는 모듈)는 **이번 Day엔 만들지 않는다** — 우리가 직접 쓰는 고정 템플릿 문장만 나가므로 걸러낼 LLM 출력이 아직 없다. 실제 LLM을 붙이는 시점에 다시 검토.
- `POST /api/rag/ask`는 `POST /api/rag/evidence`와 입력 형태가 똑같아서(`query`/`parentId`/`timeWindowDays`) 스키마를 공유한다.
- 부모님을 한 분도 등록하지 않았어도 화면 자체는 동작한다(전체 질문으로 동작) — Day11의 `/dashboard/calls`처럼 "먼저 ~하세요" 게이트는 두지 않는다(일정이 꼭 있어야 하는 안부전화와 달리, RAG 질문은 데이터가 없어도 "근거 없음" 응답을 보여주는 게 정상 동작이라서).
- 회원 A/B 격리 테스트는 여전히 Day15에서 일괄로 진행한다.
- 커밋·푸시는 사용자가 명시적으로 요청한 시점에만 수행한다.

## 작업 목록 (Tasks)

- [x] 1.0 공유 evidence 서비스 추출(리팩터)
  - [x] 1.1 `src/lib/silverlink/rag/schema.ts`: `ragEvidenceRequestSchema` → `ragQueryRequestSchema`로 이름 변경
  - [x] 1.2 `src/lib/silverlink/rag/evidence-service.ts`: `resolveRagEvidence` 작성
  - [x] 1.3 `/api/rag/evidence/route.ts`를 `resolveRagEvidence` 사용하도록 리팩터(동작 동일, 코드만 단순화)

- [x] 2.0 답변 생성기(결정론적 fallback)
  - [x] 2.1 `types.ts`에 `RagAnswer` 추가
  - [x] 2.2 `answer-generator.ts`: `buildFallbackAnswer` 작성
  - [x] 2.3 유닛 테스트 5건 작성(근거 없음/도움 요청 포함/복약 카테고리/5건 초과 케이스)

- [x] 3.0 API 라우트
  - [x] 3.1 `POST /api/rag/ask`: 인증 → 검증 → `resolveRagEvidence` → `buildFallbackAnswer` → 응답
  - [x] 3.2 `npx vitest run` 81/81, `npm run build` 통과

- [x] 4.0 `/dashboard/assistant` UI
  - [x] 4.1 부모님 선택 드롭다운("전체 부모님" 옵션 포함, `/api/parents` 재사용)
  - [x] 4.2 빠른 질문 버튼 4개(요약/도움/복약/안부전화) + 자유 질문 입력창
  - [x] 4.3 답변 텍스트 + 다음 행동(nextSteps) + 근거 카드 목록(출처/중요도 표시) + 안전 문구
  - [x] 4.4 대시보드 허브에 "돌봄 기록 AI 비서" 링크 추가

- [x] 5.0 테스트/문서화
  - [x] 5.1 `npx vitest run` 81/81(기존 76 + 신규 5), `npm run build` 통과(`/api/rag/ask`, `/dashboard/assistant` 라우트 정상 생성)
  - [x] 5.2 `docs/work-log.md`에 Day 13 섹션 추가(쉬운 설명 포함) — **수동 테스트는 사용자 확인 대기 중**
