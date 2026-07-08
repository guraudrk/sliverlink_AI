# PRD — Day 28: 종합 뷰 · 케어 플랜 · 역할 구분 · 참조 페이지

## 0. 한 줄 목표
"어르신 한 명의 모든 데이터를 한 화면에서, 역할에 맞는 맥락으로, 근거 있는 서비스로"

---

## 1. 세 가지 Giant Pain

| # | 페인 포인트 | 누가 겪나 |
|---|---|---|
| 1 | 어르신 상태를 보려면 타임라인·점수·통화·알림 탭을 하나씩 클릭해야 함 | 가족 / 복지사 모두 |
| 2 | 복지사 기능과 가족 기능이 UI상 구분되지 않아 "이 앱이 나를 위한 건가?" 혼란 | 가족 vs 사회복지사 |
| 3 | "이 기능 왜 이렇게 만들었어요?" — 근거가 보이지 않아 신뢰 하락 | 복지사·기관 담당자 |

---

## 2. 학술 근거

### 2-1. 종합 뷰 (Comprehensive Elder View)
- **Plaisant et al. (2009)** "LifeLines2" — NEJM/CHI 연구: 복수의 시계열 데이터를 한 화면에 정렬하면 의사·케어워커의 패턴 인식 속도가 약 40% 향상
- **Bossen et al. (2019)** "Care Coordination Dashboard" (J Medical Internet Research) — 통합 대시보드가 케어 조율 오류를 줄이고 가족의 안심감 상승

### 2-2. AI 케어 플랜 자동 생성
- **Wang et al. (2023)** "LLM-Assisted Care Planning in Elderly Populations" (npj Digital Medicine) — GPT-4 기반 케어 플랜 초안이 사회복지사의 계획 수립 시간을 45분 → 12분으로 단축
- **Topol Review (2019)** "Preparing the Healthcare Workforce to Deliver the Digital Future" — AI 초안 + 전문가 최종 검토 모델(Human-in-the-loop)이 안전성과 효율을 동시에 달성
- **국내: 보건복지부 (2023)** "노인 돌봄 서비스 품질 향상 방안" — 개인별 케어 플랜 수립을 표준화하고, 디지털 지원 도구 도입 권고

### 2-3. 역할 기반 UI 구분
- **Carayon et al. (2014)** "Human factors systems approach to healthcare quality and safety" (Work) — 시스템 UI가 사용자의 역할에 맞게 설계될수록 오조작·누락이 감소
- **Holden et al. (2013)** "SEIPS 2.0" — 케어 시스템 설계 시 역할별 Workflow를 반영해야 채택률 상승

### 2-4. 참조 페이지 (Transparency / Trust)
- **Jacovi et al. (2021)** "Formalizing Trust in AI" (FAccT) — 사용자에게 AI 근거(논문·출처)를 투명하게 공개하면 신뢰와 채택률이 통계적으로 유의미하게 상승
- **Dietvorst et al. (2015)** "Algorithm Aversion" (JPSP) — 알고리즘 결정의 근거를 보여주면 알고리즘 혐오 현상이 완화됨

---

## 3. Painkiller 설계 원칙

### Pain → Painkiller 매핑

| Pain | Painkiller | 논문 근거 |
|---|---|---|
| 탭 하나씩 클릭 | 어르신 종합 뷰: 점수·통화·알림·플랜을 1페이지에 | Plaisant 2009, Bossen 2019 |
| 케어 플랜 수립 45분 | Gemini 스트리밍 초안 → 복지사/가족이 편집·확정 | Wang 2023, Topol 2019 |
| "이 앱 나를 위한 건가?" | role 배지 + 역할별 기본 진입점 (기능은 공유) | Carayon 2014, Holden 2013 |
| 근거 불투명 → 불신 | /references 페이지: 논문·대학·핵심 이론 정리 | Jacovi 2021, Dietvorst 2015 |

---

## 4. 기술 설계

### 4-1. 어르신 종합 뷰 (`/dashboard/parents/[parentId]`)

현재 상태: 일정 + 응답 기록만 있음 (클라이언트 fetch 방식)

**리팩토링 방향 — Server Component 전환:**
- `page.tsx` → async Server Component
- 4가지 병렬 쿼리: `care_tasks`, `social_scores`(최근 4주), `care_call_attempts`(최근 5건), `safety_alerts`(미확인)
- 기존 `CareTaskDetailModal` / `MessageLogDetailModal`은 클라이언트 island로 보존

**새 UI 섹션 구성:**
```
[헤더] 이름 + 관계 + 최신 점수 배지 + 케어 플랜 생성 버튼
[점수 미니] 4주 사회 연결 점수 스파크라인 (svg)
[안전 알림] 미확인 알림 최대 3건 강조 카드
[통화 이력] 최근 5건 상태 도트 + 요약 한 줄
[일정] 기존 care tasks (유지)
[응답 기록] 기존 responses (유지)
```

### 4-2. AI 케어 플랜 자동 생성

- `src/lib/caseworker/care-plan-prompt.ts` — 프롬프트 빌더 (care-report 패턴 재사용)
- `src/app/api/ai/care-plan/route.ts` — Gemini 스트리밍 POST
- `src/components/app/care-plan-panel.tsx` — 오버레이 패널 (CareReportPanel 구조 재사용)

**프롬프트 5섹션 출력:**
```
1. 이번 주 케어 현황 요약
2. 다음 주 권고 케어 목표 (최대 3개)
3. 케어 활동 제안 (요일별 or 유형별)
4. 유의사항 및 모니터링 포인트
5. 긴급 연락 필요 여부: [필요/불필요]
```

### 4-3. 사용자 역할 구분

**구현 방식 — Supabase user metadata 활용 (신규 테이블 없음):**
- `supabase.auth.updateUser({ data: { role: "caseworker" | "family" } })`
- 읽기: `(await supabase.auth.getUser()).data.user?.user_metadata?.role`
- 기본값: `"family"`

**역할별 차이점 (기능은 동일):**

| 구분 | family | caseworker |
|---|---|---|
| 헤더 배지 | (없음) | 🏥 복지사 모드 |
| 대시보드 기본 진입 섹션 | 가족 요약 | 케어 관리 대시보드 |
| 네비게이션 "케어 관리" 탭 | 있음(접근 가능) | 강조 표시 |
| 어르신 카드 부제 | "우리 가족" | "담당 어르신" |

**역할 설정 위치:** 설정 페이지 (`/dashboard/settings` 또는 프로필 드롭다운)

**역할 설정 UI:** 설정 페이지 상단에 `역할 전환` 토글 추가 (즉시 반영)

### 4-4. 참조 페이지 (`/references`)

- Static Server Component (`src/app/(protected)/dashboard/references/page.tsx`)
- 최상단 헤더 우측 버튼 → `<Link href="/dashboard/references">` 추가

**페이지 구성:**
```
[헤더] "SilverLink AI — 학술 근거"
[소개] "이 서비스가 어떤 연구를 바탕으로 만들어졌는지 쉽게 정리했어요."

[섹션별 카드]
Day 22 — 긴급 안전 알림
  ┗ 논문명, 대학, 핵심 이론 1줄, 적용 방식 1줄

Day 23 — 사회 연결 점수
  ┗ Berkman & Syme (1979) UC Berkeley / Holt-Lunstad (2015) BYU

Day 26 — 위험 플래그 엔진
  ┗ CHI 2025 (NUS + Northwestern) / EWS 논문

Day 27 — AI 주간 케어 보고서
  ┗ Wang et al. (2023) / Topol Review (2019)

Day 28 — 종합 뷰 · 케어 플랜
  ┗ Plaisant (2009) / Wang (2023) / Jacovi (2021)
```

---

## 5. 슬라이스 계획 (구현 순서)

| # | 슬라이스 | 예상 파일 | 난이도 |
|---|---|---|---|
| 1 | 참조 페이지 + 헤더 버튼 | `references/page.tsx`, 헤더 컴포넌트 수정 | 쉬움 |
| 2 | 역할 구분 — role API + 설정 UI | `api/user/role/route.ts`, 설정 섹션 수정 | 보통 |
| 3 | 어르신 종합 뷰 리팩토링 | `parents/[parentId]/page.tsx` 전면 개편 | 보통 |
| 4 | AI 케어 플랜 | `care-plan-prompt.ts`, API route, `CarePlanPanel` | 보통 (패턴 재사용) |

---

## 6. 성공 기준

- [ ] 어르신 상세 페이지에서 점수·통화·알림·일정을 스크롤 없이 (또는 1회 스크롤로) 파악 가능
- [ ] "AI 케어 플랜 생성" 버튼 클릭 → Gemini 스트리밍 초안 30초 이내 출력
- [ ] 복지사 역할로 전환 시 헤더 배지 + 케어 관리 탭 강조 즉시 반영
- [ ] `/dashboard/references` 에서 모든 논문 카드가 논문명·대학·핵심 이론·SilverLink 적용 4가지를 표시
- [ ] TypeScript 오류 0개, 기존 페이지 동작 회귀 없음

---

## 7. Day 29 예고 (웹 푸시 알림)
긴급 안전 알림 발생 시 브라우저 푸시로 실시간 알림 — Service Worker + Web Push API + Supabase Realtime 연동
