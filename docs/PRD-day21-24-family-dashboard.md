# SilverLink AI — Day 21~24 Family Dashboard PRD

## 0. 문서 정보
- 작성일: 2026-07-07
- 목적: 논문 111편 리서치 기반으로 도출한 신규 기능 4종의 Day별 구현 계획
- 선택된 기능: 사용자가 시급도 순 5개 중 1·3·4·5번 선택
- 전제: 모든 기능은 하드웨어 센서 없이 **기존 통화 트랜스크립트만** 활용하여 구현

## 1. 기능 개요 & 구현 순서

| Day | 기능 | 난이도 | 선택 이유 |
|-----|------|--------|---------|
| Day 21 | 통화 후 가족 브리핑 + 대화 제안 | Easy | 의존성 없음, 즉시 가치, 이후 Day의 기반 |
| Day 22 | 통화 기반 긴급 안전 알림 | Medium | 생명 직결, 독립 구현 가능 |
| Day 23 | 사회적 연결 점수 추적 | Medium | Day 21 트랜스크립트 파이프라인 재사용 |
| Day 24 | 케어 여정 타임라인 | Medium | Day 22·23 누적 데이터 활용 |

---

## 2. 공통 전제 (Day 21~24 전체 적용)

- **데이터 격리**: 모든 신규 테이블에 `owner_user_id` + `elder_id` 필터 강제 (RLS 포함)
- **Claude API**: `claude-opus-4-8` 모델, 스트리밍 불필요 (단일 call transcript 분석)
- **Edge Function 트리거**: `care_call_attempts` INSERT 완료 시 자동 실행
- **안전 규칙**: 실제 Push 알림은 `ENABLE_REAL_NOTIFICATIONS=false`가 기본값

---

## 3. Day 21 — 통화 후 가족 브리핑 + 대화 제안

### 목표
AI 통화가 끝난 직후 5분 이내에, 자녀가 "오늘 부모님 마음이 어떤지 + 이번 주 어떤 이야기를 꺼내면 좋을지"를 즉시 알 수 있게 한다.

### 배경 & 문제
성인 자녀는 부모의 현재 관심사·감정 상태를 체계적으로 과소평가한다 (Berridge & Wetle 2019, Univ. Washington). AI 통화가 끝난 뒤 가족에게 아무 피드백이 없으면 "전화를 왜 거는가" 질문에 답할 수 없다. 주간 리포트(이미 계획된 기능 4)는 일주일 요약이지만, 본 기능은 통화 종료 직후 즉시 발송되는 개별 브리핑이다.

### 사용자 시나리오
1. AI가 어머니와 15분 통화를 마친다
2. 5분 후 자녀 카카오/SMS에 "어머니 통화 끝났어요 — 오늘 어떤 이야기 하셨는지 확인해보세요" 알림
3. 앱 열면 → 오늘 어머니 마음 3가지 + 이번 주 대화 제안 2개 + 주목 사항 1개
4. 자녀가 "어머니, 친구분 요즘 어떻게 지내세요?" 로 자연스럽게 연락

### DB 스키마

```sql
CREATE TABLE call_family_briefs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id     UUID NOT NULL REFERENCES care_call_attempts(id) ON DELETE CASCADE,
  elder_id    UUID NOT NULL,
  owner_user_id UUID NOT NULL,

  -- Claude API 생성 결과
  mind_points         JSONB NOT NULL DEFAULT '[]',
  -- [{text: "이번 주 날씨 춥다고 여러 번 언급", emoji: "🌨️"}]

  conversation_starters JSONB NOT NULL DEFAULT '[]',
  -- [{suggestion: "어머니, 친구분 요즘 어떠세요?", topic: "친구"}]

  attention_item      TEXT,
  -- NULL이면 특이사항 없음

  -- 메타
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at             TIMESTAMPTZ,
  helpful_rating      INT CHECK (helpful_rating BETWEEN 1 AND 5),

  CONSTRAINT fk_elder FOREIGN KEY (elder_id) REFERENCES parents(id)
);

-- RLS
ALTER TABLE call_family_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON call_family_briefs
  USING (owner_user_id = auth.uid());
```

### API & 서버 로직

**Edge Function: `generate-family-brief`**
- 트리거: `care_call_attempts` 테이블 INSERT 완료 + `status = 'completed'`
- 실행:
  1. 해당 `care_call_attempts.transcript` 또는 `call_script` + `summary` 조회
  2. Claude API 호출 (JSON mode):
  ```
  시스템: "가족 보호자에게 보내는 따뜻한 브리핑을 생성한다.
  의료 진단·약 처방 금지. 평이한 언어. 임상 용어 금지."

  사용자: "{transcript 전문}"

  출력 JSON:
  {
    "mind_points": [{"text": "...", "emoji": "..."}],
    "conversation_starters": [{"suggestion": "...", "topic": "..."}],
    "attention_item": "..." | null
  }
  ```
  3. 결과를 `call_family_briefs` 테이블에 INSERT
  4. (ENABLE_REAL_NOTIFICATIONS=true일 때) 카카오/SMS 알림 발송

**API Route: GET `/api/calls/[callId]/brief`**
- 인증 필수, `owner_user_id` 검증
- `call_family_briefs` where `call_id = callId` 반환

**API Route: PATCH `/api/calls/[callId]/brief/read`**
- `read_at = NOW()` 업데이트

### UI 컴포넌트

**통화 상세 페이지 (`/dashboard/calls/[callId]`)에 탭 추가:**
- 기존: `스크립트` | `요약`
- 변경: `스크립트` | `요약` | `**가족 브리핑**`

**가족 브리핑 탭 레이아웃:**
```
┌─────────────────────────────────┐
│  💭 오늘 어머니의 마음           │
│  • 이번 주 날씨 춥다고 여러 번  │
│  • 오래된 친구 이야기 기분 좋게 │
│  • 무릎 통증 걱정, 병원은 미룸  │
├─────────────────────────────────┤
│  💬 이번 주 대화 제안            │
│  → "친구분 요즘 어떠세요?"      │
│  → "무릎은 좀 어떠세요?"        │
├─────────────────────────────────┤
│  📌 주목 사항                    │
│  난방이 잘 안 된다고 하셨어요    │
└─────────────────────────────────┘
```

**알림 뱃지:** Calls 페이지 메뉴에 읽지 않은 브리핑 수 뱃지

### 성공 기준
- [ ] 통화 완료 후 5분 이내 `call_family_briefs` 레코드 자동 생성
- [ ] 가족 브리핑 탭에서 3파트 모두 렌더링
- [ ] `tsc --noEmit` 클린
- [ ] RLS로 다른 `owner_user_id` 접근 차단 확인

### 변경 예상 파일
- 신규: `supabase/migrations/xxx_call_family_briefs.sql`
- 신규: `supabase/functions/generate-family-brief/index.ts`
- 신규: `src/app/api/calls/[callId]/brief/route.ts`
- 수정: `src/components/calls/care-call-panel.tsx` (탭 추가)
- 신규: `src/components/calls/family-brief-tab.tsx`

---

## 4. Day 22 — 통화 기반 긴급 안전 알림

### 목표
AI 통화 트랜스크립트에서 낙상·의료 위기·식사 중단·위기 표현 등 4가지 급성 안전 신호를 자동 감지하여 즉시 가족에게 알린다.

### 배경 & 문제
현재 SilverLink에서 통화 결과는 `risk_level`(none/low/medium/high)로만 기록된다. 그러나 가족이 이를 확인하는 것은 직접 앱을 열었을 때뿐이다 — 급성 위기 상황에서 최대 7일이 지나도록 가족이 모를 수 있다. Gaugler 18개월 연구 시리즈(Univ. Minnesota, 2021)에 따르면 "조기 건강 경고 알림"이 가족 보호자가 원격 모니터링에서 가장 크게 가치를 두는 혜택이다.

### 4가지 급성 신호 카테고리
| 카테고리 | 탐지 키워드/패턴 예시 |
|---------|-------------------|
| `fall` | 넘어졌다, 쓰러졌다, 미끄러졌다, 일어나기 힘들다 |
| `medical` | 흉통, 숨이 차다, 고열, 두통이 심하다, 응급 |
| `nutrition` | 이틀 넘게 못 먹었다, 삼키기 어렵다, 밥 먹기 싫다 (반복) |
| `crisis` | 죽고 싶다, 아무도 없다, 사라지고 싶다, 포기하고 싶다 |

### DB 스키마

```sql
CREATE TABLE safety_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id        UUID NOT NULL,
  owner_user_id   UUID NOT NULL,
  call_id         UUID NOT NULL REFERENCES care_call_attempts(id),

  alert_type      TEXT NOT NULL CHECK (alert_type IN ('fall','medical','nutrition','crisis')),
  severity        TEXT NOT NULL CHECK (severity IN ('high','critical')),
  trigger_excerpt TEXT NOT NULL,     -- 감지된 발화 발췌
  confidence      FLOAT NOT NULL,    -- 0.0–1.0

  notified_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_by     UUID,          -- 확인한 가족 user_id
  acknowledged_at     TIMESTAMPTZ,
  false_positive      BOOLEAN DEFAULT FALSE,

  CONSTRAINT fk_elder FOREIGN KEY (elder_id) REFERENCES parents(id)
);

CREATE TABLE alert_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_user_id  UUID NOT NULL,
  elder_id        UUID NOT NULL,
  alert_types     TEXT[] NOT NULL DEFAULT '{fall,medical,nutrition,crisis}',
  notify_push     BOOLEAN DEFAULT TRUE,
  notify_sms      BOOLEAN DEFAULT FALSE,
  notify_email    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (family_user_id, elder_id)
);

-- RLS
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON safety_alerts
  USING (owner_user_id = auth.uid());

ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON alert_subscriptions
  USING (family_user_id = auth.uid());
```

### API & 서버 로직

**Edge Function: `analyze-safety-alert`**
- 트리거: `care_call_attempts` INSERT + `status = 'completed'` (Day 21 브리핑 함수와 동시 실행)
- Claude API 호출 (JSON mode):
  ```
  시스템: "통화 트랜스크립트에서 급성 안전 위험 신호를 감지한다.
  오경보를 최소화하기 위해 confidence < 0.8 이면 NONE 반환.
  확실한 증거가 있을 때만 알림 생성."

  출력 JSON:
  {
    "alert_found": true/false,
    "alert_type": "fall" | "medical" | "nutrition" | "crisis" | null,
    "severity": "high" | "critical" | null,
    "trigger_excerpt": "...",
    "confidence": 0.0–1.0
  }
  ```
- `confidence >= 0.8` 이고 `alert_found = true`일 때만 `safety_alerts` INSERT
- `alert_subscriptions` 조회 → 등록된 가족에게 알림 발송

**알림 메시지 템플릿:**
```
[SilverLink 긴급 알림]
{elder_name}님 통화에서 {alert_type_label} 관련 내용이 감지되었습니다.
관련 발언: "{trigger_excerpt}"
앱에서 확인하거나 직접 연락해보세요.
```

**API Routes:**
- `GET /api/alerts` — 내 알림 목록 (페이지네이션)
- `PATCH /api/alerts/[alertId]/acknowledge` — 확인 처리
- `PATCH /api/alerts/[alertId]/false-positive` — 오경보 신고
- `GET /api/alerts/subscriptions` — 내 구독 설정 조회
- `PUT /api/alerts/subscriptions` — 구독 설정 변경

### UI 컴포넌트

**알림 이력 페이지: `/dashboard/alerts`**
```
┌─────────────────────────────────────┐
│  🚨 긴급 알림 이력                   │
│                                     │
│  🔴 낙상 의심 — 오늘 오후 2:13      │
│  "어제 넘어져서 무릎이..."           │
│  [확인했어요] [오경보 신고]          │
│                                     │
│  🟡 식사 위기 — 어제                 │
│  "이틀째 밥을 못 먹고 있어요"        │
│  ✅ 확인됨 (딸 김지현, 3시간 전)    │
└─────────────────────────────────────┘
```

**대시보드 홈에 알림 뱃지:** 미확인 급성 알림이 있으면 상단에 붉은 배너 표시

**구독 설정 UI:** `/dashboard/settings/alerts`에서 알림 유형별 ON/OFF + 수신 방법 선택

### 성공 기준
- [ ] confidence < 0.8 트랜스크립트에서 알림 미생성 확인
- [ ] 급성 신호 포함 Mock 트랜스크립트에서 알림 자동 생성
- [ ] 알림 확인·오경보 신고 동작
- [ ] `tsc --noEmit` 클린

### 변경 예상 파일
- 신규: `supabase/migrations/xxx_safety_alerts.sql`
- 신규: `supabase/functions/analyze-safety-alert/index.ts`
- 신규: `src/app/api/alerts/route.ts`
- 신규: `src/app/api/alerts/[alertId]/acknowledge/route.ts`
- 신규: `src/app/api/alerts/subscriptions/route.ts`
- 신규: `src/app/(protected)/dashboard/alerts/page.tsx`
- 신규: `src/components/alerts/alert-card.tsx`
- 수정: `src/app/(protected)/dashboard/page.tsx` (미확인 알림 배너)

---

## 5. Day 23 — 사회적 연결 점수 추적

### 목표
매 통화 트랜스크립트에서 사회 활동 이벤트를 추출하고 주간 점수(0–100)를 산출하여, 가족이 부모의 사회적 고립 여부를 숫자로 파악할 수 있게 한다.

### 배경 & 문제
한국은 65세 이상 독거 노인 약 120만 명, OECD 최고 노인 자살률. 사회적 고립이 우울·자살의 가장 강력한 예측 인자임에도 가족은 부모의 사회 활동량을 전혀 알 수 없다. 28편 메타분석(Qirtas 2022, Ireland)에서 이동성·사회 상호작용이 고립·외로움을 수주 앞서 예측하는 지표로 확인됨.

### 사회 이벤트 5가지 유형
| 유형 | 예시 발화 |
|------|---------|
| `family_contact` | "딸이 주말에 왔어요", "아들이 전화했어요" |
| `peer_contact` | "옆집 분과 이야기했어요", "오랜 친구 만났어요" |
| `community_activity` | "경로당 갔어요", "교회 나갔어요", "식사 모임 했어요" |
| `outing` | "시장 갔어요", "산책했어요", "병원 다녀왔어요" |
| `isolation_signal` | "아무도 안 왔어요", "나가질 못했어요", "혼자였어요" |

### 주간 점수 산식
```
score = (접촉 빈도 40점) + (활동 다양성 30점) + (주도성 30점) - (고립 신호 패널티)

- 접촉 빈도: 인간 상호작용 이벤트 수 × 10 (최대 40)
- 활동 다양성: 서로 다른 유형 수 × 8 (최대 32, 상한 30)
- 주도성: family_contact/peer_contact/community_activity 이벤트 중 본인 계획한 것 비율 × 30
- 고립 신호 패널티: isolation_signal 이벤트 수 × 15 (최대 -45)
```

### DB 스키마

```sql
CREATE TABLE social_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id     UUID NOT NULL REFERENCES care_call_attempts(id) ON DELETE CASCADE,
  elder_id    UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'family_contact','peer_contact','community_activity','outing','isolation_signal'
  )),
  description TEXT NOT NULL,     -- 원문 발화 발췌
  is_proactive BOOLEAN DEFAULT FALSE,  -- 본인이 계획/주도한 이벤트 여부
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE social_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id            UUID NOT NULL,
  owner_user_id       UUID NOT NULL,
  week_start          DATE NOT NULL,    -- 해당 주의 월요일
  score               INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  contact_count       INT NOT NULL DEFAULT 0,
  activity_type_count INT NOT NULL DEFAULT 0,
  isolation_count     INT NOT NULL DEFAULT 0,
  trend               TEXT CHECK (trend IN ('improving','stable','declining')),
  computed_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (elder_id, week_start)
);

-- RLS
ALTER TABLE social_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON social_events USING (owner_user_id = auth.uid());

ALTER TABLE social_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON social_scores USING (owner_user_id = auth.uid());
```

### API & 서버 로직

**Edge Function: `extract-social-events`**
- 트리거: Day 21·22 Edge Function과 동시 실행 (같은 care_call_attempts INSERT 트리거)
- Claude API 호출:
  ```
  시스템: "통화 트랜스크립트에서 사회 활동 이벤트를 JSON 배열로 추출한다.
  명확히 언급된 것만 추출. 추측 금지."

  출력 JSON:
  {
    "events": [
      {
        "event_type": "family_contact",
        "description": "딸이 주말에 방문했다고 언급",
        "is_proactive": false
      }
    ]
  }
  ```
- 이벤트 INSERT 후, 해당 주의 `social_scores` 재계산 (upsert)
- 직전 주와 비교해 `trend` 결정 (15점 이상 변화 시 improving/declining, 나머지 stable)
- 2주 연속 30점 이상 하락 시 `safety_alerts` 에 `alert_type = 'crisis'` 생성 검토

**API Routes:**
- `GET /api/elders/[elderId]/social-score` — 현재 주 + 최근 8주 스코어 배열 반환
- `GET /api/elders/[elderId]/social-events` — 최근 통화별 소셜 이벤트 목록

### UI 컴포넌트

**부모님 상세 페이지에 소셜 카드 추가:**
```
┌──────────────────────────────────────┐
│  👥 사회적 연결                       │
│                                      │
│  이번 주 점수: 73점 🟢                │
│  ┌─ 8주 스파크라인 차트 ─────────┐   │
│  │  ●──●──●──●──●──●──●──●     │   │
│  │ 65  68  72  70  74  71  69  73 │   │
│  └───────────────────────────────┘   │
│                                      │
│  이번 주 활동                         │
│  👨‍👩‍👧 딸이 주말에 방문                   │
│  🏘️ 경로당 화요일 식사 모임           │
│  🚶 목요일 시장 다녀옴               │
└──────────────────────────────────────┘
```
- 점수 색상 코딩: 70+ 초록 / 50–70 노랑 / 50 미만 빨강
- 2주 연속 하락 시 카드에 경고 뱃지

### 성공 기준
- [ ] 통화 후 자동으로 social_events 추출 및 social_scores 계산
- [ ] 8주 스파크라인 차트 렌더링
- [ ] 점수 70+ → 초록, 50 미만 → 빨강 색상
- [ ] `tsc --noEmit` 클린

### 변경 예상 파일
- 신규: `supabase/migrations/xxx_social_tracking.sql`
- 신규: `supabase/functions/extract-social-events/index.ts`
- 신규: `src/app/api/elders/[elderId]/social-score/route.ts`
- 신규: `src/components/elders/social-score-card.tsx`
- 수정: `src/app/(protected)/dashboard/parents/[parentId]/page.tsx` (소셜 카드 추가)

---

## 6. Day 24 — 케어 여정 타임라인

### 목표
수개월에 걸친 부모의 웰빙 궤적을 스크롤 가능한 타임라인으로 시각화하고, 가족이 "방문", "입원", "투약 변경" 같은 생활 이벤트를 직접 주석으로 추가할 수 있게 한다.

### 배경 & 문제
Gaugler 18개월 연구(Univ. Minnesota, 2021–2022)에서 종단 데이터가 가족의 케어 의사결정 방식을 바꾸는 것이 확인됨. 현재 SilverLink는 매 통화 스냅샷만 존재하고, "지난 3개월 동안 아버지가 좋아지고 있는지 나빠지고 있는지" 질문에 아무도 답할 수 없다. 또한 "방문 후 어머니 상태가 좋아졌다"는 패턴을 확인하는 것은 가족이 케어에 더 적극적으로 참여하는 동기가 된다.

### 4개 추적 트랙
| 트랙 | 데이터 출처 |
|------|----------|
| 전반적 웰빙 점수 | 기존 `care_call_attempts.risk_level` 역산 |
| 사회적 연결 점수 | Day 23 `social_scores.score` |
| 알림 발생 횟수 | Day 22 `safety_alerts` 월별 집계 |
| 월별 통화 횟수 | `care_call_attempts` 월별 COUNT |

### DB 스키마

```sql
CREATE TABLE monthly_aggregates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id            UUID NOT NULL,
  owner_user_id       UUID NOT NULL,
  month               DATE NOT NULL,    -- 월의 1일 (ex: 2026-07-01)
  avg_wellbeing_score FLOAT,            -- risk_level → 숫자 변환 평균
  avg_social_score    FLOAT,            -- social_scores 월 평균
  alert_count         INT DEFAULT 0,    -- safety_alerts 발생 건수
  call_count          INT DEFAULT 0,    -- care_call_attempts 완료 건수
  computed_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (elder_id, month)
);

CREATE TABLE family_timeline_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id        UUID NOT NULL,
  owner_user_id   UUID NOT NULL,
  note_date       DATE NOT NULL,
  note_text       TEXT NOT NULL,
  note_category   TEXT NOT NULL CHECK (note_category IN (
    'visit','medical','medication_change',
    'life_event','care_change','hospitalization','other'
  )),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quarterly_narratives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id        UUID NOT NULL,
  owner_user_id   UUID NOT NULL,
  quarter_start   DATE NOT NULL,        -- 분기의 첫날 (ex: 2026-07-01)
  narrative_text  TEXT NOT NULL,        -- Claude API 생성 텍스트
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  requested_by    UUID,
  UNIQUE (elder_id, quarter_start)
);

-- RLS
ALTER TABLE monthly_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON monthly_aggregates USING (owner_user_id = auth.uid());

ALTER TABLE family_timeline_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON family_timeline_notes USING (owner_user_id = auth.uid());

ALTER TABLE quarterly_narratives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner only" ON quarterly_narratives USING (owner_user_id = auth.uid());
```

### API & 서버 로직

**Supabase 스케줄 함수: `compute-monthly-aggregates`**
- 매월 1일 오전 1시 실행
- 전월 데이터를 집계하여 `monthly_aggregates` UPSERT

**API Routes:**
- `GET /api/elders/[elderId]/timeline` — 최근 12개월 집계 + 가족 주석 반환
- `POST /api/elders/[elderId]/timeline/notes` — 가족 주석 추가
- `DELETE /api/elders/[elderId]/timeline/notes/[noteId]` — 주석 삭제
- `POST /api/elders/[elderId]/timeline/narrative` — 분기 내러티브 온디맨드 생성

**분기 내러티브 생성 (Claude API):**
```
시스템: "노인 케어 여정을 가족이 이해할 수 있는 따뜻한 한국어로 요약한다.
클리닉 보고서 형식 금지. 희망적인 톤. 3–4문단."

입력: {monthly_aggregates 3개월치} + {family_timeline_notes 3개월치}

출력: 자연어 내러티브 (3–4문단)
```

### UI 컴포넌트

**새 페이지: `/dashboard/parents/[parentId]/timeline`**

```
┌────────────────────────────────────────────────────┐
│  📈 어머니의 케어 여정                               │
│  [분기 요약 보기] [주석 추가 +]                      │
├────────────────────────────────────────────────────┤
│                        2026년 7월  8월  9월         │
│  웰빙 점수    ───●──●──●──●──●──●──●──●──●        │
│  소셜 점수    ─●───●───●──●────●───●──●─────       │
│  알림 건수    ▁▁▁▁▂▁▁▁▁▁▂▁                          │
│  통화 횟수    ████████████████████████               │
│                                                    │
│  【주석】 7/15 딸 방문 👨‍👩‍👧                           │
│  【주석】 8/3  혈압약 변경 💊                         │
├────────────────────────────────────────────────────┤
│  💬 AI 분기 요약                                    │
│  "지난 3개월 동안 어머니의 전반적 웰빙 점수는..."    │
│  [새 분기 요약 생성]                                │
└────────────────────────────────────────────────────┘
```

**주석 추가 모달:**
```
날짜: [날짜 선택]
유형: [방문] [의료] [투약 변경] [생활 이벤트] [입원] [기타]
내용: [텍스트 입력]
[저장]
```

**분기 비교 패널 (선택 확장):**
이번 분기 vs. 직전 분기 4개 지표 나란히 비교

### 성공 기준
- [ ] 월별 집계 데이터 타임라인 차트 렌더링 (4개 트랙)
- [ ] 가족 주석 추가·삭제 동작
- [ ] Claude API 분기 내러티브 온디맨드 생성
- [ ] 주석이 타임라인 차트에 수직선으로 오버레이
- [ ] `tsc --noEmit` 클린

### 변경 예상 파일
- 신규: `supabase/migrations/xxx_timeline_tables.sql`
- 신규: `supabase/functions/compute-monthly-aggregates/index.ts` (스케줄)
- 신규: `src/app/api/elders/[elderId]/timeline/route.ts`
- 신규: `src/app/api/elders/[elderId]/timeline/notes/route.ts`
- 신규: `src/app/api/elders/[elderId]/timeline/narrative/route.ts`
- 신규: `src/app/(protected)/dashboard/parents/[parentId]/timeline/page.tsx`
- 신규: `src/components/timeline/care-journey-chart.tsx`
- 신규: `src/components/timeline/timeline-note-modal.tsx`
- 신규: `src/components/timeline/quarterly-narrative-card.tsx`

---

## 7. 전체 의존 관계 & 구현 순서

```
Day 21 (통화 브리핑)
    │  ← Edge Function 파이프라인 확립
    ▼
Day 22 (긴급 알림) ─┐
    │                │← 두 Edge Function이 동일 트리거 공유
Day 23 (소셜 점수) ─┘
    │  ← monthly_aggregates에 social_score 포함
    ▼
Day 24 (타임라인)   ← Day 22 알림 건수 + Day 23 소셜 점수 필요
```

## 8. Claude API 호출 전략 (Day 21~24 공통)

| Day | 호출 시점 | 모델 | 스트리밍 |
|-----|---------|------|--------|
| 21 브리핑 | 통화 완료 직후 (Edge Function) | claude-opus-4-8 | 불필요 |
| 22 안전 분석 | 통화 완료 직후 (Edge Function) | claude-opus-4-8 | 불필요 |
| 23 이벤트 추출 | 통화 완료 직후 (Edge Function) | claude-opus-4-8 | 불필요 |
| 24 분기 내러티브 | 온디맨드 (가족 요청 시) | claude-opus-4-8 | 사용 (긴 출력) |

**비용 예상**: 통화 1건 당 3회 API 호출 (Day 21·22·23). 평균 트랜스크립트 ~1,000토큰 → 건당 약 $0.005 (5원 미만)

## 9. 절대 금지 규칙 (Day 21~24)
- `.env.local` 출력 금지
- SUPABASE_SERVICE_ROLE_KEY를 앱 코드에 사용 금지 (Edge Function 내부에서만)
- `ENABLE_REAL_NOTIFICATIONS=false` 기본값 유지
- 사용자가 "지금 진짜로 보내봐"라고 명시할 때만 실제 알림 발송
- 커밋·푸시는 사용자가 해당 턴에 명시적으로 요청할 때만
