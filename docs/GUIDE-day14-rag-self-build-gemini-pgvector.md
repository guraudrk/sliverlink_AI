# SilverLink AI — 무료·최신 RAG 직접 구축 가이드 (Gemini + pgvector)

이 문서는 **직접 구현**하기 위한 단계별 기술 가이드다. SilverLink AI 프로젝트(Day12~13까지 완성된 SQL-first RAG Evidence Layer)에 **벡터 검색 + 실제 LLM 답변 생성**을 추가하는 작업이며, 전 과정을 **무료 티어**로 구성하고 **2024~2025년 RAG 연구에서 나온 최신 기법** 중 비용 대비 효과가 가장 좋은 3가지만 적용한다.

이 문서만 보고도 "이런 기술적 의사결정을 거쳐 RAG를 만들었다"고 외부에 설명할 수 있도록, 각 단계마다 **왜 이 방식을 골랐는지(배경 이론)**까지 함께 적었다.

---

## 0. 확정된 아키텍처

| 구성요소 | 선택 | 이유 |
|---|---|---|
| LLM (답변 생성) | Google Gemini API, **현재 시점 최신 무료 flash 모델** | 무료 티어로 충분, 서버리스(Vercel) 배포 가능 |
| 임베딩 (의미 검색) | Google Gemini Embedding API (`gemini-embedding-001`) | LLM과 같은 API 키/계정으로 통합 관리 |
| 벡터 DB | Supabase **pgvector** 확장 | 이미 쓰는 DB에 확장만 켜면 됨, 별도 서비스 불필요 |
| 적용 기법 | **Contextual Retrieval** + **Hybrid Search(RRF)** + **CRAG 검증 루프** | 우선순위 1순위 3개만 먼저 완성 |

```
질문 입력
  ├─ (기존, Day12) SQL 키워드 검색 ──────┐
  └─ (신규) 벡터 의미 검색 ──────────────┤
                                         ▼
                              Hybrid Search (RRF 합산)
                                         ▼
                         CRAG 검증 (관련도 점수 충분한가?)
                          ├─ 부족 → "근거 부족" 응답
                          └─ 충분 → Gemini로 실제 답변 생성
```

### ⚠️ 모델명 churn(잦은 교체) — 설계에 반영해야 할 현실

이 가이드를 준비하며 직접 확인한 사실: Google은 Gemini 계열 모델을 **수개월 단위로 폐지/교체**한다.

| 모델 | 상태 |
|---|---|
| `embedding-001` | 2025-08-14 폐지 |
| `text-embedding-004` | 2026-01-14 폐지 |
| `gemini-2.0-flash` | 2026-06-01 폐지 |
| `gemini-2.5-flash` | 2026-06-17 폐지 (2026-06-26 기준 이미 지남) |
| `gemini-3-flash(-preview)` | 현재 무료 티어 제공 중 (2026-06 기준) |
| `gemini-3.5-flash` | 2026-05 출시, 유료 신모델 — 무료 티어 여부는 발급 시점에 직접 확인 |

**이 churn 자체가 설계 결정 사항이다.** 모델명을 코드 여러 곳에 하드코딩하면 폐지될 때마다 여러 파일을 고쳐야 한다. 그래서:

```ts
// .env.local
GEMINI_LLM_MODEL=gemini-3-flash-preview      // 발급 시점에 ai.google.dev 모델 목록에서 직접 확인
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```
모델명은 **환경 변수 하나로만** 참조하고(`process.env.GEMINI_LLM_MODEL`), 코드 안에 문자열로 박아넣지 않는다. 이렇게 해 두면 다음 폐지 공지가 와도 `.env.local` 한 줄만 바꾸면 된다 — 실제로 겪은 churn 이력을 보고 내린 설계 판단이라는 점이 기술 면접 등에서 어필 포인트가 된다.

### 전체 작업 단계(9단계, 예상 소요시간 포함)

| 단계 | 내용 | 예상 시간 |
|---|---|---|
| 1 | Gemini API 키 발급 + 패키지 설치 + 최신 모델명 확인 | 15분 |
| 2 | Supabase pgvector 확장 + 테이블/함수 | 30분 |
| 3 | Contextual Retrieval 모듈 | 1~2시간 |
| 4 | 임베딩 파이프라인 | 1~2시간 |
| 5 | 벡터 검색 연동 | 30분~1시간 |
| 6 | Hybrid Search(RRF) | 1~2시간 |
| 7 | CRAG 검증 루프 | 30분~1시간 |
| 8 | 실제 LLM 답변 생성 | 1~2시간 |
| 9 | 평가(evaluation) | 1시간 |

총 8~12시간 정도로 예상된다. 한 번에 다 안 해도 되고, 단계별로 끝낼 때마다 동작 확인 후 다음 단계로 가면 된다.

---

## Step 1. 사전 준비 — Gemini API 키 발급 + 패키지 설치 + 모델명 확인

### 왜 이 단계인가
RAG의 두 핵심 외부 의존성(LLM, 임베딩)을 같은 제공자(Google)로 통일하면 API 키 관리, 요금 모니터링, 에러 처리 로직을 한 곳에서 관리할 수 있다. 굳이 LLM은 A사, 임베딩은 B사로 나누면 인증/장애 처리 코드가 두 배가 된다 — 엔지니어링적으로 단순한 선택이다.

### 진행 방법
1. `aistudio.google.com`에 Google 계정으로 로그인 → API 키 발급(신용카드 등록 불필요).
2. **모델명을 코드 작성 전에 직접 확인한다** — 위 churn 표에서 보듯 이름이 빨리 바뀌므로, `ai.google.dev/gemini-api/docs/models`에서 "현재 무료 티어가 있는 가장 최신 flash 계열 모델"을 찾는다.
3. `.env.local`에 추가:
   ```
   GEMINI_API_KEY=발급받은키
   GEMINI_LLM_MODEL=확인한모델명
   GEMINI_EMBEDDING_MODEL=gemini-embedding-001
   ```
4. Node SDK 설치(설치 시점에 npm 페이지에서 최신 패키지명/버전을 한 번 더 확인):
   ```bash
   npm install @google/genai
   ```

### 체크리스트
- [ ] `.env.local`에 키가 들어있고, `git status`에서 `.env.local`이 추적되지 않는지 확인(이미 `.gitignore`에 있을 것)
- [ ] 패키지 설치 후 `npm run build`가 여전히 통과하는지 확인

---

## Step 2. Supabase pgvector 확장 + 테이블/함수

### 왜 이 단계인가 (배경: 벡터 검색이란)
일반 SQL은 "정확히 일치하는 값"을 찾는다(`status = 'help_requested'`). 하지만 "어머니가 최근 불편해하신 내용"같은 질문은 정확한 키워드가 없어도 의미적으로 비슷한 기록을 찾아야 한다. 이를 위해 텍스트를 고차원 숫자 벡터(임베딩)로 바꾸고, 벡터 간 거리(코사인 유사도)로 "의미적으로 가까운" 데이터를 찾는 게 벡터 검색이다. `pgvector`는 Postgres에 이 벡터 연산을 추가해주는 확장이다.

### 차원(dimension)을 768로 정하는 이유
`gemini-embedding-001`은 기본 3072차원을 출력하지만, **Matryoshka Representation Learning(MRL)**이라는 기법 덕분에 `output_dimensionality` 파라미터로 차원을 줄여도 의미가 거의 보존된다(2022년 발표된 기법 — 큰 임베딩 안에 작은 임베딩이 포개진 구조로 학습되어, 뒷부분을 잘라내도 앞부분만으로 의미를 표현할 수 있음). pgvector의 HNSW 인덱스는 차원이 클수록 인덱스 크기와 빌드 시간이 커지므로, 우리 데이터 규모(개인 돌봄 기록)에서는 **768차원으로 줄여서 저장공간/속도를 아끼는 게 합리적인 트레이드오프**다.

### 진행 방법

```sql
-- 1) 확장 활성화
create extension if not exists vector;

-- 2) 테이블: Day12의 RagEvidence를 임베딩해서 저장하는 곳
create table public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid not null references public.parent_profiles(id) on delete cascade,
  source_type text not null,       -- 'care_task' | 'message_log' | ... (RagSourceType과 동일)
  source_id text not null,         -- 원본 row의 id (중복 임베딩 방지용)
  contextual_text text not null,   -- Step 3에서 만든, 맥락이 붙은 텍스트
  embedding vector(768),           -- gemini-embedding-001을 768차원으로 truncate
  created_at timestamptz not null default now(),
  unique (owner_user_id, source_type, source_id)  -- 같은 row를 두 번 임베딩 안 하게
);

-- 3) RLS — Day12/13과 동일한 패턴(일반 RLS, SECURITY DEFINER 아님)
alter table public.rag_documents enable row level security;

create policy "rag_documents_select_own" on public.rag_documents
  for select using (auth.uid() = owner_user_id);
create policy "rag_documents_insert_own" on public.rag_documents
  for insert with check (auth.uid() = owner_user_id);
create policy "rag_documents_update_own" on public.rag_documents
  for update using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
create policy "rag_documents_delete_own" on public.rag_documents
  for delete using (auth.uid() = owner_user_id);

-- 4) 벡터 검색 인덱스 (HNSW — 근사 최근접 탐색, 데이터 많아질 때 빨라짐)
create index on public.rag_documents using hnsw (embedding vector_cosine_ops);

-- 5) 벡터 검색 함수 (auth.uid()를 함수 안에서 직접 거는, SECURITY DEFINER 아닌 일반 함수)
create or replace function match_rag_documents(
  query_embedding vector(768),
  match_parent_id uuid,
  match_count int default 8
) returns table(id uuid, source_type text, contextual_text text, similarity float)
language sql stable
as $$
  select id, source_type, contextual_text,
         1 - (embedding <=> query_embedding) as similarity
  from public.rag_documents
  where owner_user_id = auth.uid() and parent_id = match_parent_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

**왜 SECURITY DEFINER가 아닌가**: Day11/12/13과 같은 이유 — 호출자가 항상 로그인한 보호자 본인이므로, 일반 RLS(`auth.uid() = owner_user_id`)만으로 충분하다. SECURITY DEFINER는 Day9처럼 "익명 사용자"가 호출할 때만 필요하다.

**`<=>` 연산자가 뭔가**: pgvector가 추가한 코사인 거리 연산자다. 0에 가까울수록 두 벡터가 비슷하다(`1 - 거리 = 유사도`로 변환해서 0~1 사이 점수로 씀).

### 체크리스트
- [ ] Supabase SQL Editor에서 위 SQL 전체 실행 → "Success" 확인
- [ ] `select * from pg_extension where extname = 'vector';`로 확장 켜졌는지 확인

---

## Step 3. Contextual Retrieval 모듈

### 왜 이 단계인가 (배경: Anthropic의 2024년 기법)
Anthropic이 2024년에 발표한 [Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval) 기법이다. 문제 상황: `care_call_attempts`의 `parent_response` 같은 짧은 텍스트("완료했어요")는 그 자체로는 임베딩해도 별 의미가 없다 — "무엇을" 완료했는지 정보가 없기 때문이다. 해결책: 임베딩하기 전에 **이 텍스트가 어떤 맥락의 정보인지 짧은 설명을 앞에 붙인다.**

```
원본: "완료했어요"
↓ (맥락 추가)
contextual_text: "이것은 어머니의 안부전화 기록입니다(2026-06-25 작성).
                  통화 주제는 복약 확인이었고, 어머니의 응답은: 완료했어요"
```

이렇게 하면 "복약 관련 응답"이라는 질문에도 벡터가 더 잘 매칭된다. Anthropic 실험에서 이 기법만으로 검색 실패율이 크게 줄었다고 보고됐다.

### 진행 방법 — 추천: LLM 호출 없이 결정론적으로 만들기

Anthropic 원문은 LLM에게 맥락 문장을 만들게 시키지만, 우리 데이터는 이미 구조화되어 있어서(`sourceType`, `title`, `createdAt`을 다 알고 있음) **템플릿 문자열로도 거의 같은 효과**를 볼 수 있다. 비용 0원, 속도도 빠르고, 기존 프로젝트의 "code-first" 원칙(Day5/8/11/12/13)과도 맞는다.

`src/lib/silverlink/rag/contextualizer.ts` (새 파일):

```ts
import type { RagEvidence } from "./types";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  parent_profile: "프로필",
  care_task: "일정",
  message_log: "메시지",
  notification_queue: "알림",
  care_call_attempt: "안부전화",
  delivery_attempt: "발송 시도",
};

export function buildContextualText(evidence: RagEvidence): string {
  const label = SOURCE_TYPE_LABELS[evidence.sourceType] ?? evidence.sourceType;
  const dateText = evidence.createdAt.slice(0, 10);
  return `이것은 ${label} 기록입니다 (${dateText} 작성, 중요도: ${evidence.importance}). 제목: ${evidence.title}. 내용: ${evidence.rawText}`;
}
```

LLM 기반 버전(선택, 비교 실험용)도 같은 인터페이스로 만들어두면 Step 9에서 두 방식의 검색 품질을 직접 비교할 수 있다 — "어느 쪽이 더 나은지 실험으로 검증했다"는 게 기술적으로 보여줄 수 있는 지점이다.

### 체크리스트
- [ ] 함수 하나에 evidence를 넣었을 때 맥락이 붙은 문자열이 나오는지 콘솔로 확인
- [ ] (선택) LLM 버전도 만들어서 결과 비교

---

## Step 4. 임베딩 파이프라인

### 왜 이 단계인가
Step 3에서 만든 `contextual_text`를 실제 숫자 벡터로 바꿔서 `rag_documents`에 저장하는 단계다. 이게 있어야 Step 5의 벡터 검색이 가능해진다.

### 진행 방법

`src/lib/silverlink/rag/embedding.ts` (새 파일, 의사코드 — 정확한 SDK 메서드명은 설치 시점의 `@google/genai` 문서에서 확인):

```ts
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function embedText(text: string): Promise<number[]> {
  const result = await client.models.embedContent({
    model: process.env.GEMINI_EMBEDDING_MODEL!, // gemini-embedding-001
    contents: text,
    config: { outputDimensionality: 768 }, // Step 2의 vector(768)과 반드시 일치
  });
  return result.embeddings[0].values;
}
```

`src/lib/supabase/rag-documents-repo.ts` (새 파일):

```ts
export async function upsertRagDocument(supabase, input: {
  ownerUserId: string; parentId: string; sourceType: string; sourceId: string;
  contextualText: string; embedding: number[];
}) {
  const { error } = await supabase.from("rag_documents").upsert({
    owner_user_id: input.ownerUserId,
    parent_id: input.parentId,
    source_type: input.sourceType,
    source_id: input.sourceId,
    contextual_text: input.contextualText,
    embedding: input.embedding,
  }, { onConflict: "owner_user_id,source_type,source_id" });
  if (error) throw error;
}
```

**언제 이 파이프라인을 실행하는가?** 두 가지 방식이 있다:
1. **실시간**: care_task/message_log/call_attempt가 생성/수정될 때마다 바로 임베딩(API route 안에서 호출)
2. **배치**: `/api/rag/reindex` 같은 별도 엔드포인트를 만들어서, 버튼 누르면 그동안 안 임베딩된 row들을 한꺼번에 처리

**추천**: 처음엔 배치 방식으로 시작한다 — 디버깅이 쉽고, 실시간 방식은 "잘 동작하는 게 확인된 후" 추가해도 늦지 않는다.

### 체크리스트
- [ ] 임베딩 함수가 실제로 768개 길이의 숫자 배열을 반환하는지 확인
- [ ] 배치 엔드포인트로 기존 데이터 몇 건을 임베딩해서 `rag_documents`에 행이 쌓이는지 Supabase Table Editor에서 확인

---

## Step 5. 벡터 검색 연동

### 왜 이 단계인가
지금까지 만든 임베딩 데이터를 실제로 "질문 → 검색"에 연결하는 단계다.

### 진행 방법

```ts
// lib/supabase/rag-documents-repo.ts에 추가
export async function searchRagDocuments(supabase, queryEmbedding: number[], parentId: string) {
  const { data, error } = await supabase.rpc("match_rag_documents", {
    query_embedding: queryEmbedding,
    match_parent_id: parentId,
    match_count: 8,
  });
  if (error) throw error;
  return data;
}
```

`evidence-service.ts`(Day13에서 만든 `resolveRagEvidence`) 안에서: 사용자 질문을 `embedText()`로 벡터화 → `searchRagDocuments()` 호출 → 기존 SQL 검색 결과(Day12)와 합치기(다음 Step 6).

### 체크리스트
- [ ] 질문 문자열 하나를 임베딩해서 `match_rag_documents`에 넘겼을 때, 관련 있는 행이 similarity 높은 순으로 나오는지 확인

---

## Step 6. Hybrid Search (RRF)

### 왜 이 단계인가 (배경: 왜 벡터 검색만으론 부족한가)
벡터 검색은 "의미"는 잘 잡지만, "정확한 키워드/날짜/상태값" 매칭에는 의외로 약하다(예: "help_requested 상태인 것만" 같은 질문). 반대로 SQL 키워드 검색(Day12)은 정확한 매칭은 잘하지만 의미 검색은 못한다. **두 결과를 합치는 게 Hybrid Search**다.

합치는 방법 중 가장 널리 쓰이는 게 **RRF(Reciprocal Rank Fusion)**다. 복잡한 ML이 아니라 순수 계산이다:

```
각 검색 결과 리스트에서, 항목의 순위(rank, 1부터 시작)를 가지고
점수 = 1 / (rank + k)   (k는 보통 60 사용)

같은 항목이 여러 리스트에 나오면 점수를 더한다.
최종적으로 합산 점수가 높은 순으로 정렬.
```

**왜 이 방식이 좋은가**: 벡터 검색의 유사도 점수(0~1)와 SQL 검색의 "있다/없다"는 척도가 달라서 직접 비교가 안 된다. RRF는 점수 대신 **순위**만 보기 때문에, 서로 다른 척도의 검색 결과를 공정하게 합칠 수 있다(정보검색 분야의 표준 기법, Cormack et al. 2009).

### 진행 방법

```ts
// lib/silverlink/rag/hybrid-search.ts (새 파일)
const RRF_K = 60;

export function fuseResults(
  vectorResults: { id: string; evidence: unknown }[],
  keywordResults: { id: string; evidence: unknown }[]
) {
  const scores = new Map<string, { evidence: unknown; score: number }>();

  function addScores(results: typeof vectorResults) {
    results.forEach((item, index) => {
      const rank = index + 1;
      const rrfScore = 1 / (rank + RRF_K);
      const existing = scores.get(item.id);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(item.id, { evidence: item.evidence, score: rrfScore });
      }
    });
  }

  addScores(vectorResults);
  addScores(keywordResults);

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map((item) => item.evidence);
}
```

### 체크리스트
- [ ] 벡터 검색 결과 + 기존 SQL 검색 결과(Day12 `buildEvidence`)를 둘 다 `fuseResults`에 넣었을 때, 양쪽에 다 있는 항목이 더 위로 올라오는지 확인

---

## Step 7. CRAG 검증 루프

### 왜 이 단계인가 (배경: 2024년 CRAG 논문)
[Corrective Retrieval Augmented Generation(CRAG)](https://arxiv.org/abs/2401.15884) 논문의 핵심 아이디어: 검색된 근거를 LLM에게 무조건 믿고 넘기지 말고, **먼저 "이 근거가 정말 관련 있는가"를 평가**한 뒤 행동을 바꾸자는 것이다. 우리는 논문의 풀 버전(별도 평가 모델 학습) 대신, **유사도 점수 임계값**으로 단순화한 버전을 쓴다 — 데이터 규모가 작은 우리 프로젝트엔 이 정도가 적당하다.

```ts
const RELEVANCE_THRESHOLD = 0.5; // similarity 0~1, 실험하면서 조정

export function checkEvidenceQuality(evidenceWithScores: { similarity?: number }[]): boolean {
  if (evidenceWithScores.length === 0) return false;
  const topScore = evidenceWithScores[0]?.similarity ?? 0;
  return topScore >= RELEVANCE_THRESHOLD;
}
```

이미 Day12/13에서 "evidence 0건이면 빈 배열 반환 → fallback 답변에서 '근거 부족' 처리"라는 토대를 만들어뒀다. CRAG는 이 로직을 "0건"뿐 아니라 "있긴 한데 관련성이 낮은 경우"까지 확장하는 것이다.

### 체크리스트
- [ ] 관련 없는 질문을 던졌을 때 "근거 부족"으로 처리되는지, 관련 있는 질문은 다음 단계(LLM 답변)로 넘어가는지 확인

---

## Step 8. 실제 LLM 답변 생성

### 왜 이 단계인가
Step 1~7로 "좋은 근거를 찾는 것"까지 끝났다. 이제 그 근거를 자연스러운 한국어 답변으로 정리하는 마지막 단계다.

### 진행 방법

```ts
// lib/silverlink/rag/answer-generator.ts에 추가
import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `당신은 SilverLink AI의 "돌봄 기록 AI 비서"입니다.
- 의사, 응급요원, 변호사, 치료사가 아닙니다. 진단/처방/안전 단언을 하지 마세요.
- 제공된 근거(evidence)에 있는 내용만 바탕으로 답하세요. 근거에 없는 내용을 지어내지 마세요.
- 도움 요청(help_requested) 기록이 있으면 "직접 연락해 확인"을 권장하세요.
- 답변은 요약 → 근거 → 지금 확인할 일 → 주의문구 순서로 작성하세요.`;

export async function buildLlmAnswer(category: string, evidence: RagEvidence[]): Promise<RagAnswer> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const evidenceText = evidence.map((e) => `- [${e.title}] ${e.summary} (${e.createdAt})`).join("\n");

  const response = await client.models.generateContent({
    model: process.env.GEMINI_LLM_MODEL!, // Step 1에서 확인한 최신 무료 flash 모델
    contents: `질문 카테고리: ${category}\n\n근거 목록:\n${evidenceText}\n\n위 근거를 바탕으로 답변해주세요.`,
    config: { systemInstruction: SYSTEM_PROMPT },
  });

  return {
    answerText: response.text,
    evidence: evidence.slice(0, 5),
    nextSteps: [],
    hasSufficientEvidence: true,
  };
}
```

**키가 있으면 LLM, 없으면 fallback**: `/api/rag/ask` 라우트에서
```ts
const answer = process.env.GEMINI_API_KEY
  ? await buildLlmAnswer(category, evidence)
  : buildFallbackAnswer(category, evidence); // Day13에 이미 있는 함수
```

### 안전장치(Safety Guard) — 왜 필요한가
LLM은 가끔 시스템 프롬프트를 무시하고 진단성 표현을 쓸 수 있다. 출력 후 한 번 더 필터링하는 게 안전하다:
```ts
const FORBIDDEN_PHRASES = ["치매입니다", "우울증입니다", "응급입니다", "병원에 안 가도 됩니다"];

function containsForbiddenPhrase(text: string): boolean {
  return FORBIDDEN_PHRASES.some((phrase) => text.includes(phrase));
}
// 걸리면 LLM 답변을 버리고 fallback 답변으로 대체
```

### 체크리스트
- [ ] 키가 없을 때 기존 fallback이 그대로 동작하는지(회귀 테스트)
- [ ] 키가 있을 때 실제 자연어 답변이 나오는지
- [ ] 금지 표현 필터가 동작하는지(의도적으로 위험한 질문을 던져서 확인)

---

## Step 9. 평가 (Evaluation)

### 왜 이 단계인가
"느낌상 잘 되는 것 같다"가 아니라, 정량적으로 RAG 품질을 측정하는 단계다. 외부에 기술력을 설명할 때도 "평가 질문 12개 중 N개 통과"라고 말할 수 있으면 훨씬 설득력 있다.

### 진행 방법
질문 12개를 미리 정의(예시):
```
1. "도움 요청이 있었던 일정만 보여줘" → help_requested 근거가 검색되어야 함
2. "최근 복약 관련 기록 정리해줘" → medication_related 근거
3. "어머니가 최근 불편해하신 내용이 뭐야?" → 키워드 없이 의미적으로 찾아야 함(벡터 검색의 진짜 테스트)
... (총 12개, summary/help/medication/calls/open 카테고리 골고루)
```
각 질문마다: 검색된 근거가 실제로 관련 있는지 수동 채점(O/X) → 10개 이상 O면 통과.

### 체크리스트
- [ ] 12개 질문 리스트 작성
- [ ] 각각 실행해서 결과 기록
- [ ] 실패한 케이스는 왜 실패했는지 분석(임계값 조정? Contextual text 개선? Hybrid Search 가중치?)

---

## 우리 프로젝트에 붙이는 지점 (요약)

| 새 파일 | 역할 |
|---|---|
| `lib/silverlink/rag/contextualizer.ts` | Step 3 |
| `lib/silverlink/rag/embedding.ts` | Step 4 |
| `lib/supabase/rag-documents-repo.ts` | Step 4, 5 |
| `lib/silverlink/rag/hybrid-search.ts` | Step 6 |
| (수정) `lib/silverlink/rag/evidence-service.ts` | Step 5~7 — 벡터 검색 결과 합치고 CRAG 체크 추가 |
| (수정) `lib/silverlink/rag/answer-generator.ts` | Step 8 — `buildLlmAnswer` 추가 |
| (수정) `docs/supabase-schema-member-scoped.sql` | Step 2 SQL 추가 |

기존 Day12/13 코드(`types.ts`, `query-classifier.ts`, `evidence-builder.ts`, `/api/rag/ask`)는 거의 그대로 두고, 위 새 모듈들을 끼워 넣는 구조다.

---

## 운영 비용 메모 (2026-06-26 기준 확인)

자체 GPU/CPU 서버를 24시간 띄워두는 대안(예: Ollama 자체 호스팅)과 비교했을 때, 이 가이드의 Gemini 무료 티어 경로는 **상시 비용이 0원**이라는 게 핵심 장점이다. 무료 티어 한도(가입 시점 기준 약 분당 10회, 하루 1,500회)는 가족 단위 MVP 트래픽에서는 거의 도달하지 않는다. 한도를 넘기더라도 토큰당 단가가 매우 낮아 유료 전환이 "절벽"이 아니라 "완만한 경사"에 가깝다 — 반면 자체 GPU 서버는 사용자가 0명이어도 매달 수만~수십만 원이 청구된다. 이 비교가 위 "왜 Gemini를 선택했는가"의 실질적 근거다.

---

## 참고 자료

- Anthropic — Contextual Retrieval: https://www.anthropic.com/engineering/contextual-retrieval
- CRAG 논문: https://arxiv.org/abs/2401.15884
- Reciprocal Rank Fusion (정보검색 표준 기법, Cormack et al. 2009)
- Matryoshka Representation Learning (임베딩 차원 축소 기법, 2022)
- Supabase pgvector 가이드: https://supabase.com/docs/guides/ai
- Google Gemini API 모델 목록(최신 모델명 직접 확인용): https://ai.google.dev/gemini-api/docs/models
- Google Gemini API 요금/한도: https://ai.google.dev/gemini-api/docs/pricing , https://ai.google.dev/gemini-api/docs/rate-limits
