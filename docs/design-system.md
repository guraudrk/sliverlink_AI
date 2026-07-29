# SilverLink Design System (락 버전 — Day 35 S0)

> **목적**: 기존 화면에서 추출한 토큰을 고정한다.
> Day 35~38의 모든 신규 화면은 여기에 정의된 토큰과 컴포넌트만 사용한다.
> 새 컴포넌트가 필요하면 먼저 사유를 보고한 뒤 이 문서에 등록한다.

---

## 1. 색상 토큰 (`src/app/globals.css`)

### 브랜드

| 변수 | 값 | 용도 |
|------|-----|------|
| `--sl-primary` | `#2E5BFF` | 주 버튼, 활성 필터, 포커스 링 |
| `--sl-primary-hover` | `#234AE0` | 호버 |
| `--sl-primary-tint` | `#EEF2FF` | 배경 강조 |
| `--sl-primary-border` | `#DCE4FF` | 테두리 |

### 텍스트

| 변수 | 값 | 용도 |
|------|-----|------|
| `--sl-ink` | `#101828` | 최우선 텍스트 |
| `--sl-body-strong` | `#344054` | 소제목 |
| `--sl-body` | `#475467` | 본문 |
| `--sl-muted` | `#667085` | 보조 설명 |
| `--sl-placeholder` | `#98A2B3` | placeholder |

### 배경·카드·테두리

| 변수 | 값 | 용도 |
|------|-----|------|
| `--sl-bg` | `#F5F7FB` | 페이지 배경 |
| `--sl-card` | `#FFFFFF` | 카드 배경 |
| `--sl-border` | `#E7EBF3` | 기본 테두리 |
| `--sl-border-light` | `#F0F3F9` | 얇은 구분선 |

### 시맨틱 (상태 색상)

Tailwind 클래스 직접 사용. CSS 변수는 아래 의미와 매핑한다.

| 의미 | Tailwind bg | Tailwind text | CSS 변수 |
|------|-------------|---------------|----------|
| 성공 | `bg-emerald-*` | `text-emerald-*` | `--sl-success` `#12B76A` |
| 경고 | `bg-amber-*` | `text-amber-*` | `--sl-warning` `#F79009` |
| 위험 | `bg-rose-*` | `text-rose-*` | `--sl-danger` `#F04438` |
| 중립 | `bg-slate-*` | `text-slate-*` | — |

---

## 2. 위험도 색상 체계 (확정)

| 등급 | 이모지 | 배지 클래스 | 카드 테두리 | 조건 |
|------|--------|-------------|-------------|------|
| 즉시확인 | 🔴 | `bg-rose-500 text-white font-bold` | `ring-rose-300` | `flag.type === "urgent"` 또는 `score ≤ 39` |
| 추세악화 | 🟠 | `bg-amber-100 text-amber-800` | `ring-slate-200` | `flag.type === "worsening"` |
| 미확인알림 | ⚠️ | `bg-yellow-50 text-yellow-700 ring-yellow-200` | `ring-slate-200` | `flag.type === "unacked_alerts"` |
| 정상 | — | — | `ring-slate-200` | 플래그 없음 |

### 점수 배지

| 범위 | 레이블 | 클래스 |
|------|--------|--------|
| `≥ 70` | 활발 | `bg-emerald-100 text-emerald-700` |
| `40–69` | 보통 | `bg-amber-100 text-amber-700` |
| `≤ 39` | 낮음 | `bg-rose-100 text-rose-700` |
| `null` | 점수 없음 | `bg-slate-100 text-slate-400` |

공통 클래스: `rounded-full px-2.5 py-0.5 text-xs font-semibold`

---

## 3. 레이아웃·간격·형태

| 항목 | 값 |
|------|-----|
| 카드 radius | `rounded-2xl` (16px) |
| 버튼·입력 radius | `rounded-xl` (12px) |
| 배지 radius | `rounded-full` |
| 카드 그림자 | `shadow-sm ring-1` |
| 카드 기본 테두리 | `ring-slate-200` |
| 카드 내부 패딩 | `px-5 py-4` |
| KPI 카드 패딩 | `px-4 py-4` |
| 카드 목록 간격 | `space-y-2.5` |
| KPI 그리드 | `grid-cols-2 gap-3 sm:grid-cols-4` |
| 섹션 간격 | `space-y-5` |

---

## 4. 타이포그래피

| 역할 | 클래스 |
|------|--------|
| KPI 숫자 | `text-2xl font-bold` |
| 카드 이름 | `font-semibold text-slate-800` |
| 레이블 | `text-xs font-medium text-slate-500` |
| 본문·설명 | `text-sm text-slate-500` |
| 배지 | `text-xs font-semibold` |
| 버튼 | `text-sm font-semibold` |

폰트: **Pretendard** → `-apple-system` → 시스템 sans-serif

---

## 5. 애니메이션

| 클래스 | 효과 | 사용처 |
|--------|------|--------|
| `animate-rag-fade-in-up` | opacity 0→1 + Y 8px→0 (0.4s) | 카드 목록 |
| `animate-rag-pop-in` | scale 0.92→1 + Y 6px→0 (0.35s) | 모달·패널 |
| `animate-rag-fade-in` | opacity 0→1 (0.2s) | 오버레이 |
| `animate-skeleton-in` | opacity 0→1 + Y 6px→0 (0.25s) | 로딩 스켈레톤 |

**스태거**: 카드 목록은 `animationDelay: ${index * 50}ms` 패턴 적용.

---

## 6. 재사용 컴포넌트 목록

신규 화면에서 아래 컴포넌트를 우선 사용한다. 없으면 보고 후 추가.

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| `CaseworkerElderCard` | `components/app/caseworker-elder-card.tsx` | 어르신 1명 카드 (이름·점수·플래그·통화점) |
| `CaseworkerKpiHeader` | `components/app/caseworker-kpi-header.tsx` | KPI 4칸 그리드 헤더 |
| `CareReportPanel` | `components/app/care-report-panel.tsx` | AI 보고서 슬라이드 패널 |
| `ScoreBadge` | `caseworker-elder-card.tsx` 내부 | 점수 배지 (inline) |
| `FlagBadge` | `caseworker-elder-card.tsx` 내부 | 위험 플래그 배지 (inline) |
| `CallDots` | `caseworker-elder-card.tsx` 내부 | 통화 응답 이력 점 그래프 (inline) |

### 필터 버튼 패턴 (인라인, 컴포넌트화 전)

```tsx
// 활성
"rounded-xl px-3.5 py-2 text-sm font-semibold bg-blue-600 text-white shadow-sm"
// 비활성
"rounded-xl px-3.5 py-2 text-sm font-semibold bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300"
```

### 검색 입력 패턴

```tsx
"w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm
 text-slate-800 placeholder-slate-400 shadow-sm
 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
```

### 빈 상태(Empty State) 패턴

```tsx
"rounded-2xl bg-white px-8 py-12 text-center shadow-sm ring-1 ring-slate-200"
// 내부 텍스트: text-slate-400
```

---

## 7. 신규 화면 체크리스트

신규 화면 PR 전에 아래를 확인한다.

- [ ] 색상은 위 토큰 또는 Tailwind 시맨틱 클래스만 사용
- [ ] 카드는 `rounded-2xl shadow-sm ring-1` 패턴 준수
- [ ] 새 컴포넌트를 만들었다면 6번 목록에 추가
- [ ] 기존 화면을 수정하지 않음
- [ ] 다크모드 `globals.css` 재매핑 범위 안의 클래스 사용 (`bg-white`, `bg-slate-*`, `text-slate-*`)
