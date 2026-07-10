# Day 30 — 통화 녹음 기능 (expo-av + Supabase Storage)

## Executive Summary

| 관점 | 내용 |
|---|---|
| **Problem** | 가족이 어르신과 통화한 내용을 기록할 방법이 없다. 통화가 끝나면 사라진다. |
| **Solution** | 앱에서 "녹음 시작" 버튼을 누르면 마이크로 통화 내용을 녹음하고 Supabase Storage에 업로드한다. |
| **Function / UX** | 어르신 선택 → 빨간 녹음 버튼 → 타이머 → 정지 → 자동 업로드. 녹음 목록에서 재생 가능. |
| **Core Value** | Day 31(AI 분석)의 입력 데이터 확보. `call_recordings` 테이블이 분석 파이프라인의 시작점. |

---

## 1. Day 30 범위

### IN 범위
- `expo-av` 설치 + 마이크 권한 요청
- 어르신 선택 → 녹�� 시작/정지 UI (큰 빨간 버튼 + 타이머)
- 녹음 파일(.m4a) → Supabase Storage 업로드
- `call_recordings` 테이블 신규 생성 + RLS
- 녹음 목록 화면 (날짜, 어르신, 시간, 상태 뱃지)
- 녹음 파일 재��� (목록 내 재생 버튼)

### OUT 범위 (Day 31에서)
- AI 분석 (Gemini 오디오 → 전사 → 신호 감지)
- `transcript`, `ai_summary`, `risk_level` 컬럼 채우기
- 웹 대시보드 연동

---

## 2. 데이터 모델

### 신규 테이블 `call_recordings`

```sql
CREATE TABLE call_recordings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id        uuid NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
  audio_url        text,
  duration_sec     integer,
  file_size_bytes  bigint,
  recorded_at      timestamptz DEFAULT now(),
  status           text NOT NULL DEFAULT 'pending',
    -- pending | transcribing | analyzed | failed
  transcript       text,
  ai_summary       text,
  risk_level       text,
    -- none | low | medium | high
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_full_access" ON call_recordings
  FOR ALL USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);
```

### Supabase Storage 버킷 `call-recordings`
- **Public**: false (비공개)
- **파일 경로**: `{owner_user_id}/{parent_id}/{timestamp}.m4a`
- **RLS**: Storage 정책으로 `owner_user_id` 폴더만 접근 허용

---

## 3. 화면 설계

### 3-1. 녹음 탭 (`record.tsx`)
```
┌─────────────────────────────┐
│  통화 녹음              ⚙️  │
│─────────────────────────────│
│                             │
│  어르신 선택                 │
│  ┌─────────────────────┐   │
│  │ 홍길동 아버지 ▼      │   │
│  └───────────��─────────┘   │
│                             │
│         [대기 중]            │
│                             │
│       ┌─────────┐          │
│       │   🎙️   │          │  ← 큰 빨간 원형 버튼
│       │  녹음   │          │
│       │  시작   │          │
│       └─────────┘          │
│                             │
│  💡 통화 중에 버튼을 누르면  │
│     대화 내용이 녹음돼요     │
│                             │
└─────────────────────────────┘

[녹음 중 상태]
│
│       ┌─────────┐
│       │   ⏹   │  ← 정지 버튼 (빨간 테두리 + 펄스 애니메이션)
│       │  00:42  │  ← 타이머
│       └─────────┘
│
│  🔴 녹음 중 · 홍길동 아버지
```

### 3-2. 녹음 목록 탭 (`recordings.tsx`)
```
┌─────────────────────────────┐
│  녹음 기록                   │
│─────────────────────────────│
│  ┌─────────────────────┐   │
│  │ 👴 홍길동 아버지      │   │
│  │ 오늘 오후 2:30       │   │
│  │ 1분 42초  [대기 중]  │   │
│  │              ▶ 재생  │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ 👵 이순자 어머니      │   │
│  │ 어제 오전 10:15      │   │
│  │ 3분 07초  [분석완료] │   │
│  │              ▶ 재생  │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

---

## 4. 슬라이스 구현 순서

### Slice 1 — Supabase Storage 버킷 + 테이블 생성
사용자가 Supabase SQL Editor에서 실행할 SQL 제공.

### Slice 2 — `expo-av` 설치 + 마이크 권한
```bash
npx expo install expo-av
```
`app.json` plugins에 `expo-av` 추가.

### Slice 3 — 녹음 탭 UI + 녹음 로직
- 어르신 선택 Picker
- 녹음 시작/정지 버튼
- 타이머 (1초마다 카운트)
- 업로드 → `call_recordings` INSERT

### Slice 4 — 녹음 목록 + 재생
- `call_recordings` ��회 (parent_profiles JOIN)
- 재생 버튼 → `Audio.Sound.createAsync(url)` → `sound.playAsync()`
- 상태 뱃지 (대기 중 / 분석 중 / 분석 완료 / 실패)

---

## 5. 안전 규칙

- 녹음은 **사용자가 버튼을 누를 때만** 시작 (자동 녹음 없음)
- 오디오 파일은 PII — Storage 버킷은 반드시 비공개
- `owner_user_id` 폴더 외 접근 차단 (Storage RLS 정책)
- 업로드 실패 시 로컬 파일도 삭제 (기기에 남기지 않음)

---

## 6. 성공 기준

| # | 기준 |
|---|---|
| 1 | 어르신 선택 후 녹음 시작 → 타이머 동작 |
| 2 | 정지 → Supabase Storage에 .m4a 파일 업로드됨 |
| 3 | `call_recordings` 테이블에 행 생성, `status = 'pending'` |
| 4 | 목록 화면에서 방금 녹음 표시 |
| 5 | 재생 버튼 → 오디오 재생 |
| 6 | `npx tsc --noEmit` clean |
