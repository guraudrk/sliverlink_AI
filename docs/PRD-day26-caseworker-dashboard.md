# SilverLink AI — Day 26 PRD: 복지사 케어 대시보드 + AI 주간 보고서

## 0. 문서 정보

- 작성일: 2026-07-08
- 연구 기반: 세계 100위권 대학·주요 저널 논문 30편 (Day 26 리서치 세션)
- 목표: 사회복지사·공공기관 담당자가 겪는 3가지 Giant Pain을 SilverLink의 기존 데이터 자산 위에서 해결

---

## 1. 문제 정의 — 3가지 Giant Pain

### Giant Pain 1 — 행정 문서 과부하

> **사회복지사 근무 시간의 50~65%가 기록·문서·행정에 소비. 직접 서비스는 고작 20%.**

- 영국 연구 (Community Care Magazine): 사회복지사의 50% 이상이 케이스 기록·IT·회의에 시간 소비 (직접 클라이언트 시간 20%)
- **ACM CHI 2025 — "Empowering Social Service with AI" (NUS + Northwestern Univ., n=51 practitioners)**: 복지사가 AI로 해결하고 싶은 업무 **1순위 = "문서 작성 및 보고서 생성"**. 직접 인터뷰에서 "AI가 맥락을 이해 못 한다는 불신"이 가장 큰 장벽으로 지적됨 → 조건을 투명하게 공개하는 rule-based AI 접근 권고
- 한국 장기요양기관 실태 (PMC 2023, 이직 의도 연구): 문서 부담 + 번아웃 → 이직 악순환

### Giant Pain 2 — 정보 파편화 & 케이스 파악 지연

> **분산된 데이터로 인해 어르신 1명 현황 파악에 최대 37분 소요.**

- **PMC 2023 — "Geriatric Care Management System Powered by IoT and Computer Vision"**: 기존 분산 데이터 관리 방식은 "human-dependent, highly inefficient, up to **37 minutes** per patient" → IoT + 통합 뷰로 1분 이내로 단축 실증
- **WHO 2024 — "Long-term care in Korea: overcoming coordination challenges"**: 한국 LTCI 시스템의 핵심 문제로 "의료기관·복지관·지자체·장기요양기관 데이터 단절, 케어 매니저 체계 부재" 명시
- **NIHR 2024 — "Factors influencing effective data sharing between health care and social care"**: 기관 간 데이터 공유는 여전히 종이 기반 또는 개별 전산, 공유 시스템은 파일럿 단계

### Giant Pain 3 — 고위험 어르신 조기 발견 실패

> **위험 신호가 있어도 시스템적으로 놓친다. 전문가조차 학대·고립 징후를 체계적으로 식별 못 함.**

- **European Journal of Public Health 2025** (이즈미르 연구): "조기 경보 시스템이 사회-기술적 맥락(조직·지역사회·인력)과 통합되지 않아 현장에서 실제로 작동하지 않음"
- **PMC 2025** (치매 학대 연구): 전문 케어 스태프 대다수가 가족에 의한 학대 징후를 인식하지 못함
- **PubMed 2020** (대만 EWS 연구): 지역사회 어르신 대상 조기 경보 시스템 도입 시, 의미 있는 조기 개입 결과 확인 — **단, rule-based 시스템이 ML 기반보다 현장 신뢰도 높음**

---

## 2. Painkiller 설계 — SilverLink에 자연스럽게 통합하는 방법

### 핵심 인사이트

SilverLink는 이미 Giant Pain 2+3을 해결할 **모든 데이터**를 보유하고 있다:

| 테이블 | 활용 가능한 Pain 해결 |
|--------|----------------------|
| `parent_profiles` | 담당 어르신 목록 |
| `social_scores` | 주간 연결 점수 추이 (위험도 판단) |
| `care_call_attempts` | 통화 응답/미응답 이력 |
| `call_family_briefs` | AI가 추출한 어르신 심리 상태 요약 |
| `safety_events` | 위험 이벤트 이력 |

문제는 **복지사 시점의 다인 관리 뷰가 없다**는 것. 현재 SilverLink는 "자녀가 본인의 부모님 1~2명을 확인하는" 뷰에 최적화되어 있다.

### 통합 전략

> `parent_profiles.owner_user_id = auth.uid()` 조건은 그대로 유지.
> 복지사가 SilverLink에 로그인하면, 자신이 등록한 어르신 전체(50명 이상)를 **위험도 순으로 한 화면에서 파악**할 수 있는 새 뷰를 추가한다.

- DB 스키마 변경 없음 — 기존 테이블 재사용
- 신규 페이지 1개 추가: `/dashboard/caseworker`
- 신규 API 라우트 2개: `/api/caseworker/summary`, `/api/ai/care-report`
- 기존 사이드바·네비에 메뉴 추가

---

## 3. Day 26 목표

> **"복지사가 담당 어르신 전체를 1분 안에 파악하고, AI가 주간 케어 보고서를 버튼 한 번으로 생성해주는 대시보드"**

37분 → 1분 (정보 파악 시간 단축, PMC 2023 연구 목표치 적용)
문서 작성 시간 → Claude API가 초안 자동 생성

---

## 4. 사용자 스토리

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | 사회복지사 | 담당 어르신 전체를 위험도 순으로 한눈에 보고 싶다 | 오늘 먼저 확인해야 할 어르신을 1분 안에 파악 |
| US-02 | 사회복지사 | 위험 신호 어르신에게 자동 플래그가 달리길 원한다 | 놓치는 케이스 없이 체계적으로 관리 |
| US-03 | 사회복지사 | 어르신 1명의 주간 보고서 초안을 버튼 클릭 한 번으로 만들고 싶다 | 기록·행정 시간 절반 이상 절감 |
| US-04 | 기관 관리자 | 전체 담당 어르신의 위험군 비율을 숫자로 보고 싶다 | 기관 케어 품질을 관리 지표로 추적 |

---

## 5. 기능 범위 (Day 26 Scope)

### Feature A — 복지사 케어 대시보드 (`/dashboard/caseworker`)

#### A-1. 기관 요약 KPI 패널 (페이지 상단)

| KPI | 설명 |
|-----|------|
| 총 담당 어르신 수 | `parent_profiles` COUNT |
| 위험군 (39점 이하) 수 / 비율 | `social_scores` 최신 주 기준 |
| 이번 주 통화 응답률 | `care_call_attempts` 기준 |
| 미확인 안전 이벤트 수 | `safety_events` 미확인 건 |

#### A-2. 어르신 위험도 랭킹 카드 리스트

담당 어르신 전체를 **위험도 순(높음→낮음)** 으로 정렬.

각 카드에 표시:
- 어르신 이름
- 사회 연결 점수 + 색상 뱃지 (빨강/노랑/초록)
- 최근 통화 상태 (응답/미응답/예정)
- 위험 플래그 자동 표시 (Feature B)
- "AI 보고서 생성" 버튼 (Feature C 진입)

검색·필터: 이름 검색, 위험군 필터

---

### Feature B — AI 고위험 자동 감지 플래그

복지사가 직접 판단하지 않아도 시스템이 자동 감지.

**근거**: PMC 2020 대만 EWS 연구에서 rule-based 시스템이 현장 신뢰도 높음 확인. CHI 2025에서 "AI가 맥락을 모른다"는 불신이 가장 큰 장벽 → 조건을 UI에 투명하게 노출.

| 플래그 | 감지 조건 | 표시 |
|--------|-----------|------|
| 🔴 즉시 확인 | 연결 점수 ≤ 39 **AND** 최근 3회 연속 통화 미응답 | 빨간 뱃지 "즉시 확인" + 이유 표시 |
| 🟠 추세 악화 | 연결 점수 40~55 **AND** 최근 2주 연속 점수 하락 | 주황 뱃지 "추세 악화" |
| ⚠️ 미확인 알림 | 미확인 안전 이벤트 3건 이상 | 노랑 뱃지 "미확인 알림 N건" |

> 조건 충족 이유를 뱃지 hover/클릭 시 노출 ("3회 연속 미응답: 7/2, 7/4, 7/6") — 복지사 신뢰 확보

---

### Feature C — AI 주간 케어 보고서 자동 생성

어르신 카드에서 "AI 보고서 생성" 클릭 시:

#### 데이터 수집 (최근 4주)

```
care_call_attempts      → 통화 이력, 응답/미응답 상태
social_scores           → 주간 연결 점수 추이
call_family_briefs      → AI 추출 심리 상태 요약 (mind_points, attention_item)
safety_events           → 이벤트 유형·심각도
```

#### 보고서 출력 형식 (한국 노인 복지 실무 양식)

```
[주간 케어 보고서]
━━━━━━━━━━━━━━━━━━━━━━━━━━
대상자: OOO
보고 기간: YYYY.MM.DD ~ MM.DD
담당: (사용자 이름)

1. 이번 주 주요 현황
   [이번 주 연결 점수 / 전주 대비 / 통화 응답률]

2. 사회 연결 상태 분석
   [4주 점수 추이 해석 + 의미]

3. 주요 이벤트 및 대응
   [통화 내용 요약 + 안전 이벤트]

4. 다음 주 권고 사항
   [AI 제안: 직접 방문 / 전화 / 현상 유지]

5. 직접 연락 필요 여부: [필요 / 불필요]
   (사유: ...)
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### UI

- 모달 또는 오른쪽 사이드 패널로 표시
- **실시간 스트리밍** — Claude가 생성하는 텍스트를 SSE로 타이핑 효과 출력
- 복사(클립보드) 버튼 + 인쇄 버튼
- "이 보고서는 AI 초안입니다. 반드시 검토 후 사용하세요." 고지 문구

---

## 6. 기술 아키텍처

```
[/dashboard/caseworker]
        │
        ├─ GET /api/caseworker/summary
        │   └─ Supabase: parent_profiles + social_scores + care_call_attempts JOIN
        │       → 위험도 계산 (서버 사이드 rule engine)
        │       → 플래그 배열 계산 후 응답
        │
        └─ POST /api/ai/care-report   ← Feature C
            └─ 어르신 4주 데이터 수집 (Supabase)
               → buildCareReportPrompt(elderData)
               → Claude API streaming (SSE)
               → 클라이언트에 실시간 전송
```

### API 라우트 설계

#### `/api/caseworker/summary` (GET)

```typescript
// 쿼리: 담당 어르신 + 최신 연결 점수 + 최근 통화 + 미확인 이벤트
const { data } = await supabase
  .from('parent_profiles')
  .select(`
    id, display_name, relationship,
    social_scores(score, week_start, call_count, answered_count),
    care_call_attempts(status, created_at),
    safety_events(id, acknowledged)
  `)
  .eq('owner_user_id', userId)
  .order('score', { foreignTable: 'social_scores', ascending: true })
```

서버 사이드에서 플래그 계산 후 응답:
```typescript
function computeFlags(elder: ElderWithRelations): Flag[] {
  const flags: Flag[] = []
  const latestScore = elder.social_scores[0]?.score ?? 100
  const recentCalls = elder.care_call_attempts.slice(0, 3)
  const allMissed = recentCalls.every(c => c.status === 'no_answer')
  
  if (latestScore <= 39 && allMissed) flags.push({ type: 'urgent', reason: '3회 연속 미응답 + 저위험 점수' })
  // ...
  return flags
}
```

#### `/api/ai/care-report` (POST, streaming)

```typescript
// app/api/ai/care-report/route.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: Request) {
  const { parentId } = await req.json()
  const elderData = await fetchElderData4Weeks(parentId)  // Supabase 조회

  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-8',
    thinking: { type: 'adaptive' },
    max_tokens: 2048,
    system: CASEWORKER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildCareReportPrompt(elderData) }],
  })

  // SSE 스트림으로 클라이언트에 실시간 전송
  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
```

#### System Prompt 설계 포인트

```
당신은 한국 노인 복지 실무 전문가입니다.
아래 어르신의 4주치 돌봄 데이터를 바탕으로,
사회복지사가 상급 기관에 제출하는 주간 케어 보고서 초안을 작성해주세요.

[형식 규칙]
- 5개 섹션 고정 (현황/분석/이벤트/권고/직접연락 여부)
- 의학적 진단 금지, 관찰 사실만 기술
- 마지막에 반드시 "직접 연락 필요 여부"를 [필요/불필요]로 명시
- 전문 용어보다 평이한 실무 언어 사용
```

---

## 7. AI/데이터 엔지니어링 포인트 (논문 연계)

### 7-1. Streaming LLM (Giant Pain 1 해결)

CHI 2025 연구(NUS+Northwestern)에서 복지사들이 AI 도구를 기피하는 이유 중 하나가 "기다려야 함 + 결과가 엉뚱함"이었다. Streaming으로 실시간 타이핑 효과를 보여주면 지각된 대기 시간이 줄어들고 신뢰감 형성에 기여한다.

```
사용자 경험 원칙:
- SSE 스트림 시작 < 1초 (타이핑 시작 즉시 보임)
- 전체 보고서 완성 < 15초
- 생성 도중 취소 가능
```

### 7-2. Rule-Based 조기 경보 (Giant Pain 3 해결)

PMC 2020 대만 EWS 논문 + European Journal of Public Health 2025에서 공통으로 지적한 현장 실패 원인: "ML 블랙박스는 복지사가 신뢰 안 함, 조직·인력과 통합 안 됨." → **완전히 투명한 rule-based 플래그**로 설계.

```
투명성 원칙:
- 플래그 이유를 항상 함께 표시 ("3회 연속 미응답: 7/2, 7/4, 7/6")
- 복지사가 플래그를 수동 해제 가능 ("이미 확인함")
- false positive 낮추기 > recall 높이기 (CHI 2025: 불필요한 알람이 도구 포기 원인)
```

### 7-3. Supabase 쿼리 최적화 (Giant Pain 2 해결)

PMC 2023 연구에서 "37분 소요"의 원인은 분산된 화면 간 전환이었다. SilverLink는 **단일 JOIN 쿼리**로 모든 데이터를 한 번에 가져와 한 화면에서 표시.

```sql
-- 위험도 순 정렬 + 관련 데이터 단일 쿼리
SELECT
  p.id, p.display_name,
  s.score, s.week_start,
  COUNT(c.id) FILTER (WHERE c.status = 'no_answer') AS missed_calls_recent,
  COUNT(e.id) FILTER (WHERE e.acknowledged = false)  AS unacked_events
FROM parent_profiles p
LEFT JOIN LATERAL (
  SELECT * FROM social_scores
  WHERE parent_id = p.id
  ORDER BY week_start DESC LIMIT 1
) s ON true
LEFT JOIN care_call_attempts c ON c.parent_id = p.id
  AND c.created_at > now() - interval '7 days'
LEFT JOIN safety_events e ON e.parent_id = p.id
WHERE p.owner_user_id = auth.uid()
GROUP BY p.id, s.score, s.week_start
ORDER BY COALESCE(s.score, 100) ASC;
```

---

## 8. 파일 구조 (신규 생성 목록)

```
src/
├── app/
│   ├── (protected)/dashboard/caseworker/
│   │   ├── page.tsx                    # 서버 컴포넌트: 데이터 페칭
│   │   ├── caseworker-client.tsx       # 클라이언트: 카드 리스트 + 필터
│   │   └── loading.tsx
│   └── api/
│       ├── caseworker/
│       │   └── summary/route.ts        # GET: 어르신 목록 + 플래그
│       └── ai/
│           └── care-report/route.ts    # POST: 스트리밍 보고서 생성
├── components/app/
│   ├── caseworker-elder-card.tsx       # 어르신 위험도 카드
│   ├── caseworker-kpi-header.tsx       # 기관 요약 KPI 패널
│   └── care-report-panel.tsx           # AI 보고서 스트리밍 패널
└── lib/
    ├── caseworker/
    │   ├── risk-flags.ts               # 플래그 계산 rule engine
    │   └── care-report-prompt.ts       # Claude 프롬프트 빌더
    └── supabase/
        └── caseworker-queries.ts       # 쿼리 함수
```

---

## 9. 네비게이션 통합

기존 사이드바 (`dashboard-nav-bar.tsx`) 와 모바일 하단 네비 (`mobile-bottom-nav.tsx`) 에 "케어 관리" 메뉴 추가:

```
현재 메뉴: 홈 | 통화 | 알림 | 소셜 | 타임라인
추가 메뉴: 케어 관리 (복지사 대시보드)
```

아이콘: `ClipboardList` (Lucide) — 복지사 느낌

---

## 10. Out of Scope (Day 26)

- 기관 간 데이터 연동 (별도 인프라 필요)
- 복지사 계정 역할 분리 (현재 단일 Supabase Auth)
- 케이스 인계 기능 (인수인계 메모)
- ML 기반 예측 모델 (rule-based으로 시작, 논문 근거 있음)
- 보고서 PDF 내보내기 (v2)
- 어르신 등록/수정 UI (기존 페이지 활용)

---

## 11. 성공 지표

| 지표 | 목표 | 근거 |
|------|------|------|
| 담당 어르신 현황 파악 시간 | 37분 → 1분 이내 | PMC 2023 IoT 시스템 목표치 |
| AI 보고서 스트림 시작 | < 1초 | 사용자 지각 대기 임계값 |
| AI 보고서 전체 완성 | < 15초 | CHI 2025: 15초 이상이면 이탈 |
| 플래그 false positive | < 10% | 조건 3개 AND 조합으로 제한 |
| 사이드바 메뉴 접근성 | 모바일 포함 | 기존 네비 패턴 동일 적용 |

---

## 12. 구현 순서 (Slice 계획)

| Slice | 내용 | 완료 조건 |
|-------|------|---------|
| S1 | DB 쿼리 + API `/api/caseworker/summary` | Postman으로 위험도 정렬 응답 확인 |
| S2 | 플래그 rule engine (`risk-flags.ts`) | 3가지 플래그 조건 단위 테스트 |
| S3 | 케어 대시보드 UI (KPI + 카드 리스트) | 브라우저에서 어르신 목록 렌더링 |
| S4 | Claude API 스트리밍 라우트 | SSE 응답 확인 (curl 테스트) |
| S5 | 보고서 패널 UI (스트리밍 표시 + 복사) | 화면에서 AI 보고서 타이핑 확인 |
| S6 | 네비게이션 통합 + 도움말 추가 | 전체 플로우 end-to-end 확인 |
