# Tasks: Day 12 — RAG Evidence Layer (벡터 없이 동작하는 RAG-lite 뼈대)

기준 문서: `docs/PRD-rag-mvp-day12-15-plan.md` 5장/7장/10장 (Day 12 부분)

## Relevant Files
- `src/lib/silverlink/rag/types.ts` (신규) — `RagEvidence` 타입(`sourceType`/`parentId`/`title`/`summary`/`rawText`/`createdAt`/`importance`/`safetyFlags`), `RagQueryCategory`(`summary`/`help`/`medication`/`calls`/`open`)
- `src/lib/silverlink/rag/query-classifier.ts` (신규) — 키워드 기반으로 자유 질문 텍스트를 `RagQueryCategory`로 분류(LLM 없이 결정론적, Day5/Day11과 동일한 code-first 원칙)
- `src/lib/silverlink/rag/evidence-builder.ts` (신규) — `buildEvidence(category, rows...)`: 6개 테이블에서 가져온 row들을 `RagEvidence[]`로 정규화 + 분류 결과에 따라 우선순위/필터링(예: `help` 분류면 `help_requested` 상태와 `risk_level` medium/high만 우선 노출)
- `src/lib/supabase/rag-evidence-repo.ts` (신규) — `owner_user_id`(+선택적 `parent_id`) + 시간창(`timeWindowDays`, 기본 30일) 기준으로 `parent_profiles`/`care_tasks`/`message_logs`/`notification_queue`/`care_call_attempts`/`delivery_attempts`를 조회하는 함수들. `parent_profiles`는 시간창과 무관하게 항상 포함(프로필은 시점성이 없는 배경 정보)
- `src/app/api/rag/evidence/route.ts` (신규, POST) — 로그인 필요. body: `{ query: string; parentId?: string; timeWindowDays?: number }`. `parentId` 있으면 `getParentProfileById` 등으로 소유권 검증 후 그 부모님만, 없으면 로그인 사용자의 전체 부모님 데이터를 모아 반환
- 유닛 테스트: `query-classifier.test.ts`, `evidence-builder.test.ts`

## Notes
- **이번 Day는 새 DB 테이블/SQL을 만들지 않는다.** 기존 6개 테이블에서 읽기만 한다 — 그래서 사용자가 Supabase SQL Editor를 열 필요가 없다(Day8/9/11과 다른 점).
- **LLM 호출 없음, OPENAI_API_KEY/ANTHROPIC_API_KEY 불필요.** 실제 답변 생성(Day13)과 분리해서, 이번 Day는 "근거를 모아 정규화하는 뼈대"만 만든다.
- vector/임베딩(pgvector)도 이번 Day 범위 아님 — Day14에서 `rag_documents`/`match_rag_documents`로 추가한다.
- 분류기(`query-classifier`)는 Day11의 `inferCallGoal`과 같은 패턴(키워드 매칭, 결정론적)을 그대로 재사용하는 설계로 간다.
- evidence 0건이면 빈 배열을 그대로 반환한다(Day13에서 "기록 부족" 안내 문구로 이어질 자리이지만, 그 문구 자체는 Day13에서 만든다).
- `parentId`가 주어졌는데 본인 소유가 아니면 404(기존 `getOwnCareTask` 패턴과 동일하게 정보 노출 없이 차단).
- 회원 A/B 격리 테스트는 여전히 Day15에서 일괄로 진행한다(이번 Day에서는 새 쿼리 경로마다 `owner_user_id` 필터가 들어가 있는지 코드 레벨로만 확인).
- 커밋·푸시는 사용자가 명시적으로 요청한 시점에만 수행한다.
- **발견한 버그**: 복약 분류 키워드에 단독 `"약"`을 넣었더니 `"요약"`(summary 질문)이 부분 문자열로 걸려 `medication`으로 잘못 분류됐다. `"복약"/"투약"/"약 드"/"약 먹"` 등 구체적 표현으로 교체해서 해결(테스트가 바로 잡아준 케이스).
- **수동 확인 방법(UI 없는 API라 사용자가 직접 해볼 수 있는 방법)**: 로그인한 상태로 `/dashboard` 등 보호된 페이지에서 브라우저 개발자도구 콘솔을 열고 다음을 실행
  ```js
  fetch("/api/rag/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "도움 요청이 있었던 일정만 보여줘" }),
  }).then(r => r.json()).then(console.log);
  ```
  `parentId`를 함께 넘기면 그 부모님 데이터만 좁혀서 나오는지, 남의 `parentId`를 넘기면 404가 나는지 확인 가능.

## 작업 목록 (Tasks)

- [x] 1.0 타입 + 분류기
  - [x] 1.1 `src/lib/silverlink/rag/types.ts`: `RagEvidence`, `RagQueryCategory`, `RagSourceType`, `RagImportance` 정의
  - [x] 1.2 `src/lib/silverlink/rag/query-classifier.ts`: 키워드 기반 `classifyQuery(query: string): RagQueryCategory`. 계획에 없던 `src/lib/silverlink/rag/schema.ts`도 추가(다른 모든 feature 모듈이 zod 입력 스키마용 `schema.ts`를 갖는 기존 컨벤션을 그대로 따름)
  - [x] 1.3 분류기 유닛 테스트 5건 작성

- [x] 2.0 evidence repo
  - [x] 2.1 `src/lib/supabase/rag-evidence-repo.ts`: 6개 테이블 병렬 조회(`owner_user_id`는 다른 repo 함수들과 동일하게 RLS에 위임, 선택적 `parent_id` eq 필터 + 시간창)
  - [x] 2.2 `parent_id` 소유권 검증은 기존 `isOwnParentProfile`(care-tasks-repo.ts) 재사용 — 계획에선 `getParentProfileById`를 언급했지만 행 전체가 필요 없어 boolean 반환 함수로 충분했음

- [x] 3.0 evidence builder
  - [x] 3.1 `src/lib/silverlink/rag/evidence-builder.ts`: row → `RagEvidence` 정규화 + 분류 카테고리별 우선순위 정렬/필터
  - [x] 3.2 builder 유닛 테스트 5건 작성

- [x] 4.0 API 라우트
  - [x] 4.1 `POST /api/rag/evidence`: 인증 확인 → (parentId 있으면 소유권 검증) → repo 조회 → classifier → builder → `RagEvidence[]` 반환
  - [x] 4.2 `npx vitest run` 76/76(기존 66 + 신규 10), `npm run build` 통과

- [x] 5.0 수동 확인 + 문서화
  - [x] 5.1 curl/스크립트 대신 — 이번 Day는 UI가 없는 API 전용 슬라이스라 사용자에게 로그인 브라우저 콘솔 `fetch` 확인 방법을 안내(아래 Notes 참고)
  - [x] 5.2 `docs/work-log.md`에 Day 12 섹션 추가(버그 발견/수정 과정 포함)
