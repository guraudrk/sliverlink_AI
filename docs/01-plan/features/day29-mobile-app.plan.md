# Day 29 — 모바일 앱 기반 구축 (Expo + 전화번호부 + Supabase Auth)

## Executive Summary

| 관점 | 내용 |
|---|---|
| **Problem** | SilverLink v2 컨셉은 "가족이 어르신에게 전화 → 앱이 녹음 → AI 분석"인데, 현재 웹 전용이라 모바일 녹음이 불가능하다. |
| **Solution** | Expo 모바일 앱을 신규 생성해 전화번호부에서 어르신을 등록하고, 기존 Supabase 계정을 공유함으로써 웹 대시보드와 실시간 동기화한다. |
| **Function / UX Effect** | 사용자가 앱에서 전화번호부를 열어 어르신을 선택하면 3탭 안에 등록 완료. 웹 대시보드 새로고침 시 동일한 어르신이 표시됨. |
| **Core Value** | 별도 DB 없이 기존 Supabase `parent_profiles` 테이블을 그대로 재사용 — Day 30(녹음) / Day 31(AI 분석) 개발 진입점 확보. |

---

## 1. 배경 및 컨셉 전환 요약

2026-07-10 BM 강의 기반 컨셉 전환:

| | v1 (이전) | v2 (현재) |
|---|---|---|
| 주요 채널 | AI가 어르신에게 TTS 전화 발신 | 가족이 직접 전화 → 앱으로 녹음 |
| 앱 필요 여부 | 웹 전용 | 모바일 앱 필수 |
| 어르신 관여 | 키패드 응답 | 관여 없음 (가족 쪽에서 모든 것 처리) |
| PMF | 로보콜 거부감 → 낮음 | 기존 전화 행동 강화 → 높음 |

Day 29는 이 전환의 **첫 번째 구현 단계**. 웹↔앱 계정 공유 + 전화번호부 연동까지만 구현하고, 녹음은 Day 30에서 다룬다.

---

## 2. 목표 (Day 29 범위)

### IN 범위
- [ ] Expo 모바일 앱 프로젝트 신규 생성 (`silverlink-mobile`)
- [ ] Supabase Auth 연동 (기존 웹 계정 그대로 사용, 이메일/비밀번호 + Google OAuth)
- [ ] `expo-contacts`: 전화번호부 접근 권한 요청
- [ ] 전화번호부에서 연락처 검색 + 선택 → 어르신 등록 폼
- [ ] `parent_profiles` 테이블에 저장 (기존 스키마 재사용, 신규 컬럼 없음)
- [ ] 등록된 어르신 목록 조회 화면
- [ ] 웹 대시보드와 데이터 동기화 확인 (같은 Supabase, 같은 테이블)

### OUT 범위 (Day 30+ 에서 처리)
- 통화 녹음 (`expo-av`) — Day 30
- AI 분석 — Day 31
- 푸시 알림 / 백그라운드 작업
- 앱 스토어 배포 / EAS Build
- 복잡한 UI 디자인 / 애니메이션

---

## 3. 사용자 스토리

### US-01: 첫 로그인
> 나는 자녀/복지사로서 웹에서 쓰던 계정으로 앱에 로그인하고 싶다.
> → 이메일+비밀번호 입력하면 웹 대시보드와 동일한 계정으로 진입.

### US-02: 어르신 등록
> 나는 전화번호부에서 어르신을 찾아 3탭 안에 등록하고 싶다.
> → 연락처 검색 → 선택 → 이름/관계 확인 → 저장.

### US-03: 어르신 목록
> 나는 등록된 어르신 목록을 앱에서 확인하고 싶다.
> → 웹 대시보드 `/parents` 와 동일한 데이터 표시.

### US-04: 웹-앱 동기화
> 나는 앱에서 어르신을 등록하면 웹 대시보드에서도 즉시 보이기를 원한다.
> → 같은 Supabase `parent_profiles` 테이블 사용이므로 자동 동기화.

---

## 4. 기술 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Expo SDK 52** (Managed Workflow) | EAS Build 없이 `expo go`로 즉시 테스트 가능. bare workflow 보다 네이티브 의존성 관리 부담 적음. |
| 언어 | TypeScript | 기존 웹 프로젝트와 일치. |
| 네비게이션 | **Expo Router** (v4, File-based) | Next.js App Router와 유사한 패러다임 → 러닝 커브 최소화. |
| 연락처 | **expo-contacts** | Managed Workflow에서 공식 지원. iOS/Android 모두 동작. |
| Auth | **@supabase/supabase-js** + **AsyncStorage** | 웹과 동일한 Supabase 프로젝트 사용. 세션 토큰을 AsyncStorage에 저장. |
| HTTP | Supabase 클라이언트 직접 사용 | REST API 별도 추가 불필요. |
| 상태관리 | React 내장 (`useState`, `useEffect`) | Day 29 범위에서는 전역 상태 불필요. |
| 스타일링 | **NativeWind** (Tailwind for React Native) | 웹 프로젝트와 클래스명 일치 → 전환 비용 감소. |

---

## 5. 프로젝트 구조

```
c:\dev\silverlink-ai\
├── silverlink-web-input/       ← 기존 웹 (Next.js)
└── silverlink-mobile/          ← 신규 모바일 앱 (Expo)  ← Day 29에서 생성
    ├── app/
    │   ├── _layout.tsx             # Root layout + Auth guard
    │   ├── (auth)/
    │   │   ├── _layout.tsx
    │   │   └── login.tsx           # 로그인 화면
    │   └── (tabs)/
    │       ├── _layout.tsx         # Tab navigator
    │       ├── index.tsx           # 어르신 목록 탭
    │       └── register.tsx        # 어르신 등록 탭 (전화번호부)
    ├── components/
    │   ├── ElderListItem.tsx        # 어르신 목록 항목
    │   └── ContactPicker.tsx        # 전화번호부 선택 UI
    ├── lib/
    │   └── supabase.ts              # Supabase 클라이언트 (AsyncStorage 세션)
    ├── app.json
    ├── package.json
    └── tsconfig.json
```

---

## 6. 화면 설계 (Text Mockup)

### 6-1. 로그인 화면 (`login.tsx`)
```
┌─────────────────────────────┐
│         SilverLink AI       │
│        [💙 앱 아이콘]        │
│                             │
│  이메일                      │
│  ┌─────────────────────┐   │
│  │ user@example.com    │   │
│  └─────────────────────┘   │
│  비밀번호                    │
│  ┌─────────────────────┐   │
│  │ ••••••••            │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │     로그인          │   │
│  └─────────────────────┘   │
│                             │
│  ── 또는 ──                 │
│  ┌─────────────────────┐   │
│  │  G  Google로 로그인  │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### 6-2. 어르신 목록 탭 (`index.tsx`)
```
┌─────────────────────────────┐
│  SilverLink AI        ⚙️   │
│─────────────────────────────│
│  등록된 어르신                │
│                             │
│  ┌─────────────────────┐   │
│  │ 👴 홍길동 아버지      │   │
│  │  📞 010-1234-5678   │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ 👵 이순자 어머니      │   │
│  │  📞 010-9876-5432   │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  + 어르신 등록하기   │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### 6-3. 어르신 등록 탭 (`register.tsx`)
```
┌─────────────────────────────┐
│  어르신 등록                  │
│─────────────────────────────│
│                             │
│  ┌─────────────────────┐   │
│  │ 🔍 연락처 검색...    │   │
│  └─────────────────────┘   │
│                             │
│  [전화번호부에서 선택하기]     │
│                             │
│  ── 또는 직접 입력 ──        │
│                             │
│  이름 *                     │
│  ┌─────────────────────┐   │
│  │                     │   │
│  └─────────────────────┘   │
│  전화번호                    │
│  ┌─────────────────────┐   │
│  │                     │   │
│  └─────────────────────┘   │
│  관계 *                     │
│  ┌─────────────────────┐   │
│  │ 아버지 ▼            │   │
│  └─────────────────────┘   │
│  메모 (선택)                 │
│  ┌─────────────────────┐   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │      등록하기        │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### 6-4. 전화번호부 선택 (ContactPicker — Modal)
```
┌─────────────────────────────┐
│  ✕  연락처 선택              │
│─────────────────────────────│
│  🔍 이름으로 검색...          │
│─────────────────────────────│
│  김철수    010-1111-2222    │
│  박영희    010-3333-4444    │
│  이순자    010-5555-6666    │
│  홍길동    010-7777-8888    │
│  ...                        │
└─────────────────────────────┘
```

---

## 7. 데이터 모델

### 7-1. 기존 테이블 재사용 — `parent_profiles`

```sql
-- 기존 스키마 (변경 없음)
CREATE TABLE parent_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  relation        text NOT NULL,          -- 아버지/어머니/할아버지/할머니/기타
  phone_number    text,
  care_context    text,
  daily_routine   text,
  medication_notes text,
  communication_style text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
-- RLS: owner_user_id = auth.uid() (기존 정책 그대로)
```

**모바일에서 신규 추가하는 컬럼: 없음.** 기존 테이블 완전 재사용.

### 7-2. 연락처 → 앱 폼 매핑

| expo-contacts 필드 | parent_profiles 컬럼 | 비고 |
|---|---|---|
| `contact.name` | `display_name` | 기본값, 수정 가능 |
| `contact.phoneNumbers[0].number` | `phone_number` | 기본값, 수정 가능 |
| (사용자 입력) | `relation` | 드롭다운 선택 필수 |
| (사용자 입력) | `care_context` / `medication_notes` | 선택 입력 |

---

## 8. Supabase 클라이언트 설계 (`lib/supabase.ts`)

```typescript
// silverlink-mobile/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,  // React Native에서는 false 필수
    },
  }
);
```

**환경변수** (`silverlink-mobile/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=<기존 웹과 동일한 URL>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<기존 웹과 동일한 ANON KEY>
```

> ⚠️ SERVICE_ROLE_KEY는 절대 모바일 앱에 포함시키지 않는다.
> 웹과 동일한 ANON KEY + RLS 정책으로 보안을 유지한다.

---

## 9. 권한 처리 (`expo-contacts`)

### iOS
```
Info.plist에 자동 추가 (app.json plugin 선언 시):
NSContactsUsageDescription = "어르신을 등록하기 위해 연락처에 접근합니다."
```

### Android
```
AndroidManifest.xml에 자동 추가:
<uses-permission android:name="android.permission.READ_CONTACTS"/>
```

### 권한 요청 플로우
```
앱 첫 실행
    ↓
"연락처에서 선택" 버튼 터치
    ↓
Contacts.requestPermissionsAsync()
    ├── granted → 연락처 목록 표시
    └── denied  → "설정 > 권한에서 연락처를 허용해주세요" 안내 + 설정 앱으로 이동
```

---

## 10. 슬라이스 구현 순서

### Slice 1 — Expo 프로젝트 생성 + 기본 설정
**목표**: `npx create-expo-app silverlink-mobile --template` → TypeScript + Expo Router 프로젝트 생성

```bash
# 실행 위치: c:\dev\silverlink-ai\
npx create-expo-app@latest silverlink-mobile --template blank-typescript
cd silverlink-mobile
npx expo install expo-router expo-linking expo-constants expo-status-bar
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
npx expo install expo-contacts
npx expo install nativewind tailwindcss
```

**`package.json` 주요 scripts**:
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  }
}
```

**`app.json` 핵심 설정**:
```json
{
  "expo": {
    "name": "SilverLink AI",
    "slug": "silverlink-mobile",
    "scheme": "silverlink",
    "plugins": [
      [
        "expo-contacts",
        { "contactsPermission": "어르신을 등록하기 위해 연락처에 접근합니다." }
      ]
    ]
  }
}
```

**성공 기준**: `npx expo start` 후 Expo Go 앱에서 QR 스캔 → 기본 화면 뜨면 OK.

---

### Slice 2 — Supabase Auth 연동 (로그인/로그아웃)

**파일**: `lib/supabase.ts`, `app/(auth)/login.tsx`, `app/_layout.tsx`

**Auth Guard 로직** (`app/_layout.tsx`):
```typescript
// 세션 없으면 /login으로 리다이렉트
// 세션 있으면 (tabs)/로 이동
```

**로그인 화면 동작**:
1. 이메일 + 비밀번호 입력 → `supabase.auth.signInWithPassword()`
2. 성공 시 `_layout.tsx`의 세션 감지 → 자동으로 메인 탭으로 이동
3. 실패 시 에러 메시지 표시

**Google OAuth 처리**:
- `supabase.auth.signInWithOAuth({ provider: 'google' })` + `expo-web-browser` 조합
- Redirect URL: `silverlink://auth/callback` (딥링크 스킴)
- Day 29 범위에서는 이메일/비밀번호만 완성, Google OAuth는 스켈레톤만

**성공 기준**:
- 웹에서 사용하는 `djwls9614@gmail.com` 계정으로 앱 로그인 성공
- 로그인 후 어르신 목록 탭 표시

---

### Slice 3 — 어르신 목록 화면 (`index.tsx`)

**파일**: `app/(tabs)/index.tsx`, `components/ElderListItem.tsx`

**데이터 패칭**:
```typescript
const { data } = await supabase
  .from("parent_profiles")
  .select("id, display_name, relation, phone_number")
  .order("created_at", { ascending: false });
```

**RLS 자동 적용**: `owner_user_id = auth.uid()` 조건이 DB 레벨에서 강제되므로
앱에서 별도 필터 불필요.

**UI 요소**:
- `FlatList`로 어르신 목록 렌더링
- 각 항목: 이름, 관계, 전화번호
- 목록이 비어있으면 "등록된 어르신이 없어요 → 등록하기" 빈 상태 화면
- 우상단 설정 아이콘 (로그아웃)

**성공 기준**: 웹에서 등록한 어르신이 앱 목록에 즉시 표시됨.

---

### Slice 4 — 전화번호부 연동 + 어르신 등록 (`register.tsx`)

**파일**: `app/(tabs)/register.tsx`, `components/ContactPicker.tsx`

**전화번호부 접근 플로우**:
```typescript
const { status } = await Contacts.requestPermissionsAsync();
if (status !== "granted") {
  // 권한 거부 안내 Alert
  return;
}
const { data } = await Contacts.getContactsAsync({
  fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
});
```

**ContactPicker 컴포넌트**:
- `Modal` + `FlatList` 구조
- 상단 검색창: 연락처 이름으로 실시간 필터
- 항목 선택 시 → 등록 폼에 이름/전화번호 자동 채움

**등록 폼 필드**:
| 필드 | 타입 | 필수 | 기본값 |
|---|---|---|---|
| 이름 | TextInput | ✅ | 선택한 연락처 이름 |
| 전화번호 | TextInput | ❌ | 선택한 연락처 첫 번째 번호 |
| 관계 | Picker (드롭다운) | ✅ | 없음 (선택 필수) |
| 돌봄 메모 | TextInput (multiline) | ❌ | 없음 |

**관계 옵션**: 아버지, 어머니, 할아버지, 할머니, 기타

**저장 로직**:
```typescript
const { error } = await supabase.from("parent_profiles").insert({
  owner_user_id: user.id,
  display_name: form.name,
  relation: form.relation,
  phone_number: form.phone,
  care_context: form.memo,
});
```

**성공 기준**:
1. 전화번호부에서 연락처 선택 → 폼에 자동 채움
2. 저장 후 목록 탭으로 이동 → 방금 등록한 어르신 표시
3. 웹 대시보드 `/parents` 새로고침 → 동일한 어르신 표시

---

### Slice 5 — 웹-앱 동기화 검증

**수동 검증 시나리오**:
1. 앱 → 전화번호부에서 어르신 등록
2. 웹 → `/parents` 에서 방금 등록된 어르신 확인
3. 웹 → `/parents`에서 어르신 정보 수정
4. 앱 → 목록 화면 Pull-to-Refresh → 수정된 정보 확인

---

## 11. 안전 규칙

- `SUPABASE_SERVICE_ROLE_KEY`는 앱에 절대 포함 금지 (Anon Key만 사용)
- 연락처 접근은 사용자가 명시적으로 버튼을 눌렀을 때만 (`requestPermissionsAsync`)
- 저장 시 `owner_user_id: user.id`를 코드에서 명시적으로 설정
  (RLS with check가 있어도 명시하는 것이 안전)
- `.env` 파일은 `.gitignore`에 추가 필수
- 앱에서 `console.log`에 사용자 정보 출력 금지

---

## 12. 성공 기준 (Day 29 완료 조건)

| # | 기준 | 검증 방법 |
|---|---|---|
| 1 | Expo Go에서 앱 실행 | QR 스캔 후 화면 뜨면 OK |
| 2 | 웹 계정으로 앱 로그인 성공 | `djwls9614@gmail.com` 로그인 후 목록 탭 진입 |
| 3 | 웹 등록 어르신이 앱 목록에 표시 | 웹 `/parents`와 앱 목록 동일 |
| 4 | 전화번호부 권한 요청 후 연락처 선택 가능 | ContactPicker 열림 확인 |
| 5 | 앱에서 어르신 등록 → 웹에 즉시 반영 | Supabase Table Editor 또는 웹 새로고침 |
| 6 | TypeScript 에러 없음 | `npx tsc --noEmit` clean |

---

## 13. 의존성 / 사전 조건

- **Expo Go 앱** 테스트 기기에 설치 필요 (iOS App Store 또는 Android Play Store)
- **실제 기기 또는 에뮬레이터**: 전화번호부 접근은 실기기 권장 (Expo Go 시뮬레이터에서도 dummy 연락처로 테스트 가능)
- **기존 Supabase 프로젝트**: URL + Anon Key (웹 `.env.local`에서 확인)
- **Node.js 18+**: 이미 설치됨 (웹 프로젝트 환경)

---

## 14. 의존 관계 (다음 Day와의 연결)

```
Day 29 완료
    → Day 30: expo-av 녹음 + Supabase Storage 업로드
              (parent_id 선택 UI 재사용)
    → Day 31: Gemini 오디오 분석 API 연동
              (call_recordings 테이블에 분석 결과 저장)
```
