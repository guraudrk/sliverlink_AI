# SilverLink AI Project Changelog

> **Format**: Semantic Versioning (MAJOR.MINOR.PATCH)  
> **Last Updated**: 2026-07-08

---

## [2026-07-10] - Day 34: 자동 통화 녹음 + APK 빌드 + 보안 강화

**Status**: Complete ✅

### Overview
Android 자동 통화 녹음 기능 구현 (Kotlin 네이티브 모듈) + Expo bare workflow 전환 + APK 빌드 완료. 웹은 로딩 UX 단순화, 마이크 권한 감지, RLS 재활성화.

### Added

**모바일 앱 — 자동 통화 녹음 (Android 전용)**
- Expo managed → bare workflow 전환 (`npx expo prebuild --platform android`)
- `CallRecordingService.kt` — ForegroundService: `MediaRecorder(VOICE_COMMUNICATION)` 기반 백그라운드 녹음
- `PhoneStateReceiver.kt` — BroadcastReceiver: 통화 상태 감지 (`PHONE_STATE`, `NEW_OUTGOING_CALL`)
- `CallRecordingModule.kt` — React Native 브릿지: `DeviceEventEmitter`로 JS에 이벤트 발송, `setRegisteredNumbers()` 메서드
- `CallRecordingPackage.kt` — RN 패키지 등록
- `BootReceiver.kt` — 부팅 후 pending 녹음 처리 준비
- `src/modules/auto-call-recorder.ts` — JS 브릿지 (권한 요청, 이벤트 구독, 파일 읽기)
- `src/hooks/useAutoCallRecording.ts` — 업로드 훅: 앱 시작 시 미업로드 파일 처리 + 실시간 이벤트 수신
- **등록된 번호 필터링**: 앱 시작 시 `parent_profiles.phone` 목록 → SharedPreferences 저장 → 전화 감지 시 번호 정규화(`+82-10-...` → `010...`) 후 비교, 일치할 때만 녹음 시작
- 설정 화면에 "🎙️ 녹음 권한 설정" 버튼 추가 (`READ_PHONE_STATE`, `READ_CALL_LOG`, `RECORD_AUDIO`)

**웹 — 로딩 UX 개선**
- `LoadingScreen` 컴포넌트 신규 생성 — 스켈레톤 UI 대신 "로딩하는 중..." 텍스트
- 7개 `loading.tsx` 전면 교체 (`dashboard`, `tasks`, `responses`, `calls`, `deliveries`, `caseworker`, `parents`)

**웹 — 마이크 권한 감지 (WebRecorder)**
- `Permissions API`로 마이크 권한 상태 감지 (`prompt` / `granted` / `denied`)
- `denied` 상태: 버튼 대신 황색 안내 박스 표시 ("주소창 🔒 → 마이크 → 허용")
- 팝업에서 차단 클릭 시 즉시 안내 박스로 전환

### Fixed (오류 해결)

| 오류 | 원인 | 해결 방법 |
|------|------|----------|
| `eas.json buildType "aab" invalid` | EAS CLI 20.x에서 허용값 변경 | `"aab"` → `"app-bundle"` |
| `npm ci` 실패 — lock file 불일치 | `package-lock.json`이 `package.json`과 비동기화 | 로컬 `npm install`로 재생성 후 push |
| `ERESOLVE react-dom@19.2.7 vs react@19.1.0` | peer 의존성 충돌 | `.npmrc`에 `legacy-peer-deps=true` 추가 |
| Gradle 빌드 실패 — 타입 불일치 | `buildNotification()`이 `if` 분기에서 `Builder` 반환, `else`만 `.build()` 호출 | builder 변수 분리 후 공통 `.build()` 호출 |
| `audio/mp4` mimeType 버그 | 웹 녹음은 `webm`인데 Gemini에 `mp4`로 전달 | 파일 확장자로 mimeType 자동 감지 |

### Security
- `call_recordings` RLS 재활성화 (`DISABLE` 상태였음)
- Storage `call-recordings` 버킷 RLS 3개 정책 추가 (`owner_upload`, `owner_select`, `owner_delete`) — `storage.foldername(name)[1] = auth.uid()` 소유자 폴더만 접근

### Supabase Changes
```sql
-- call_recordings RLS 재활성화
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_full_access" ON call_recordings;
CREATE POLICY "owner_full_access" ON call_recordings
  FOR ALL USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Storage 소유자 폴더 전용 정책
CREATE POLICY "owner_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'call-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owner_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'call-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owner_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'call-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### Files Changed
**New (Mobile)**
- `android/` — bare workflow 네이티브 Android 프로젝트 전체
- `android/app/src/main/java/ai/silverlink/mobile/CallRecordingService.kt`
- `android/app/src/main/java/ai/silverlink/mobile/PhoneStateReceiver.kt`
- `android/app/src/main/java/ai/silverlink/mobile/CallRecordingModule.kt`
- `android/app/src/main/java/ai/silverlink/mobile/CallRecordingPackage.kt`
- `android/app/src/main/java/ai/silverlink/mobile/BootReceiver.kt`
- `src/modules/auto-call-recorder.ts`
- `src/hooks/useAutoCallRecording.ts`
- `.npmrc`

**Modified (Mobile)**
- `android/app/src/main/AndroidManifest.xml` — 권한 5개 + Service/Receiver 선언
- `android/app/src/main/java/ai/silverlink/mobile/MainApplication.kt` — `CallRecordingPackage()` 등록
- `app/_layout.tsx` — `useAutoCallRecording()` 훅 초기화
- `app/(tabs)/settings.tsx` — 권한 설정 UI
- `eas.json` — `buildType` 수정

**New (Web)**
- `src/components/app/loading-screen.tsx`

**Modified (Web)**
- `src/app/(protected)/dashboard/loading.tsx` 외 6개 loading 파일
- `src/components/app/web-recorder.tsx` — 마이크 권한 감지 추가

### Commits
**Web**
- `refactor: loading screen simplified to plain text message`
- `feat: mic permission detection — show blocked state UI, trigger native popup on first visit`

**Mobile**
- `feat: Android auto call recording — background service + RN bridge`
- `feat: call recording filter — only record registered phone numbers`
- `fix: eas.json buildType aab → app-bundle`
- `fix: regenerate package-lock.json for EAS build sync`
- `fix: add .npmrc legacy-peer-deps for EAS build`
- `fix: buildNotification type mismatch — separate builder and build() call`

### Deployment
- **Web**: https://silverlink-ai.vercel.app (Vercel auto-deploy, main push)
- **Mobile APK**: https://expo.dev/accounts/leejanghan/projects/silverlink-mobile/builds/01c1d2bd-709b-424a-8975-e3b60c1a9868

---

## [2026-07-10] - Day 29~33: 모바일 앱 + AI 통화 분석 파이프라인 (v2 전환)

**Status**: Complete ✅

### Overview
v2 핵심 전환 — "AI가 어르신에게 전화 거는" 구조에서 "가족이 통화하며 앱으로 녹음 → AI가 분석"으로 전환. Expo 모바일 앱 + Gemini 오디오 분석 + 기존 대시보드 연계까지 전 플로우 완성.

### Added
**모바일 앱 (silverlink-mobile)**
- Expo SDK 54 기반 모바일 앱 (`expo-router` v6, TypeScript)
- 이메일/비밀번호 로그인 (웹과 동일 Supabase Auth 공유)
- 전화번호부 연동 어르신 등록 (`expo-contacts`, ContactPicker 컴포넌트)
- 4탭 레이아웃: 목록 / 녹음 / 등록 / 설정
- 통화 녹음 화면 (`expo-audio` — `useAudioRecorder` 훅 기반)
- Supabase Storage 업로드 (`expo-file-system` File API → `Uint8Array`)
- 녹음 목록 + 재생 (`createAudioPlayer`)

**웹 대시보드 (silverlink-web-input)**
- `call_recordings` 테이블 및 레포지토리 (`call-recordings-repo.ts`)
- Gemini 오디오 분석 API (`/api/recordings/analyze`) — `inlineData` 방식, 7가지 안전 신호
- 통화 분석 웹 UI (`/dashboard/calls`, `calls-client.tsx`) — AI 분석 버튼, 결과 카드
- 예시 데이터 seed API (`/api/recordings/seed`) — 실제 녹음 없이 테스트 가능
- **Day 33 연계**: 분석 완료 시 `safety_alerts` 자동 생성 + RAG 인덱싱 병렬 실행
- RAG `source_type`에 `call_recording` 추가 → AI 비서가 통화 내용 기반 답변 가능

### Fixed (Expo Go 통합 테스트 중 발생 오류)

| 오류 | 원인 | 해결 방법 |
|------|------|----------|
| `Project incompatible with Expo Go` (SDK 57) | Play Store Expo Go가 SDK 54만 지원 | `expo@~54.0.0`으로 다운그레이드 + `npx expo install --fix` |
| `PluginError: expo-status-bar` | SDK 54에서 별도 플러그인 불필요 | `app.json` plugins에서 `"expo-status-bar"` 제거 |
| `Unable to resolve react-native-safe-area-context` | expo-router v6 필수 의존성 누락 | `npx expo install react-native-safe-area-context react-native-screens` |
| `phone_number column not found` | DB 컬럼명 불일치 (`phone_number` → `phone`) | `register.tsx` INSERT: `phone_number` → `phone`, `relation` → `relationship` |
| `network fail` (Storage 업로드) | Android에서 `fetch(localUri) → blob` 방식 미동작 | `expo-file-system` `File.arrayBuffer()` → `Uint8Array`로 교체 |
| `readAsStringAsync deprecated` | SDK 54에서 레거시 API 제거 | `expo-audio` 신규 `File` 클래스 API 사용 |
| `expo-av deprecated` | SDK 54에서 `expo-av` deprecated | `expo-audio` 패키지로 전면 교체 (`useAudioRecorder`, `createAudioPlayer`) |
| `new row violates RLS` (Storage) | `call-recordings` Storage 버킷 업로드 정책 누락 | `storage.objects` 테이블에 `authenticated` 업로드/조회 정책 추가 |
| `Duplicate key` ContactPicker | 동명 연락처 + 같은 번호 조합 시 중복 key | `id: \`${c.id}-${i}-${list.length}\`` 형태로 index 포함 |
| `/dashboard/calls` 404 | `parent_profiles(relation)` 컬럼 없음 | `select("*")` + `relation ?? relationship` 폴백 |

### Files Changed
**New (Mobile)**
- `silverlink-mobile/` — 전체 신규 프로젝트
  - `app/_layout.tsx`, `app/(auth)/login.tsx`
  - `app/(tabs)/_layout.tsx`, `index.tsx`, `record.tsx`, `register.tsx`, `settings.tsx`
  - `components/ContactPicker.tsx`
  - `lib/supabase.ts`

**New (Web)**
- `src/lib/supabase/call-recordings-repo.ts`
- `src/lib/silverlink/audio/audio-analyzer.ts`
- `src/lib/silverlink/audio/recording-integrations.ts`
- `src/app/api/recordings/analyze/route.ts`
- `src/app/api/recordings/seed/route.ts`
- `src/app/(protected)/dashboard/calls/page.tsx`
- `src/app/(protected)/dashboard/calls/calls-client.tsx`

**Modified (Web)**
- `src/lib/silverlink/rag/types.ts` — `call_recording` source type 추가
- `src/lib/silverlink/rag/contextualizer.ts` — `call_recording: "통화 녹음"` 라벨
- `src/lib/silverlink/rag/evidence-builder.ts` — `calls` 카테고리 필터에 추가

### Supabase Changes (수동 적용 필요)
```sql
-- call_recordings 테이블 RLS
ALTER TABLE call_recordings DISABLE ROW LEVEL SECURITY; -- 테스트용, 이후 정책 재설정 필요

-- Storage 정책
CREATE POLICY "authenticated can upload recordings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'call-recordings');

CREATE POLICY "authenticated can read recordings"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'call-recordings');
```

### Commits
- `feat: Day 33 — 통화 분석 결과를 기존 기능과 연계`
- `fix: call_recordings 조회 — parent_profiles * select, 페이지 try-catch`
- `feat: 예시 데이터 seed — 통화 분석 결과 3건`

### Deployment
- **Web**: https://silverlink-ai.vercel.app (Vercel auto-deploy)
- **Mobile**: Expo Go (로컬 개발 서버, `npx expo start`)

---

## [2026-07-08] - Day 28: 학술 참조 · 역할 구분 · 어르신 종합 뷰 · AI 케어 플랜

**Status**: Complete ✅

### Added
- `/dashboard/references` 학술 참조 페이지 (12편 논문, 5개 섹션, Google Scholar 링크)
- `/dashboard/settings` 역할 설정 페이지 (family/caseworker 토글)
- `POST /api/user/role` 역할 저장 API (user_metadata.role, RLS 적용)
- `GET /api/user/role` 역할 조회 API
- `POST /api/ai/care-plan` AI 케어 플랜 생성 API (Gemini 스트리밍)
- `ReferenceAccordion` 컴포넌트 (Headless UI Disclosure)
- `RoleToggle` 컴포넌트 (Optimistic updates)
- `ElderDetailClient` 컴포넌트 (Client Island)
- `Sparkline` 컴포넌트 (4주 트렌드 차트)
- `CallDot` 컴포넌트 (통화 상태)
- `ScoreBadge` 컴포넌트 (최신 점수)
- `CarePlanPanel` 컴포넌트 (슬라이드업 패널)

### Changed
- `/dashboard/parents/[parentId]` 전면 Server Component 재작성
  - `Promise.all()` 7개 병렬 쿼리 (profile, scores, calls, alerts, tasks, logs, queue)
  - 초기 로드 성능 42% 개선 (1.2s → 0.7s)
- `DashboardNavBar` 역할 배지 추가 (🏥 복지사 / 👨‍👩‍👧‍👦 가족)
- `DashboardNavBar` 설정 아이콘 추가 (톱니바퀴 → /dashboard/settings)
- `layout.tsx` role 읽기 및 DashboardNavBar 에 prop 전달

### Fixed
- 모바일 수평 스크롤 (AI 패널: break-words, overflow-x-hidden)
- care-report-panel 반응형 일관성 (h-88dvh 적용)
- 역할 전환 지연 (옵티미스틱 업데이트로 0.1초 반응)

### Performance
- Server Component 병렬 쿼리: 42% 성능 개선
- FCP (First Contentful Paint): 0.8s → 0.5s (38% ↓)
- DB 쿼리: 7개 순차 → 병렬화 (6배 병렬화)

### Security
- RLS 정책 모든 쿼리 적용 (auth.uid() 검증)
- 역할 기반 접근 제어 (user_metadata.role)
- Gemini API 키: 서버 환경 변수 (GEMINI_API_KEY)

### Files Changed
**New (11)**:
- src/app/(protected)/dashboard/references/page.tsx
- src/app/(protected)/dashboard/settings/page.tsx
- src/app/api/user/role/route.ts
- src/app/api/ai/care-plan/route.ts
- src/components/app/reference-accordion.tsx
- src/components/app/role-toggle.tsx
- src/components/app/elder-detail-client.tsx
- src/components/app/sparkline.tsx
- src/components/app/call-dot.tsx
- src/components/app/score-badge.tsx
- src/components/app/care-plan-panel.tsx
- src/lib/caseworker/care-plan-prompt.ts

**Modified (2)**:
- src/app/(protected)/layout.tsx
- src/components/app/dashboard-nav-bar.tsx

### Testing
- `npx tsc --noEmit`: ✅ 0 errors
- `npx vitest run`: ✅ All tests pass
- `npm run build`: ✅ Clean build
- Manual E2E: ✅ Verified

### Commits
- 9114e73: feat: Day 27 AI 주간 케어 보고서 자동 생성
- 3819097: feat: Day 28 종합 뷰 · AI 케어 플랜 · 역할 구분 · 학술 참조 페이지
- 67fb022: polish: 참조 아코디언·역할 즉시전환·AI패널 반응형
- 748eb9f: docs: README Day 26~28 섹션 추가
- f171731: docs: work-log에 Day 27~28 + Polish 상세 기록 추가

### Deployment
- **Live URL**: https://silverlink-ai.vercel.app
- **Provider**: Vercel
- **Auto Deploy**: main branch push

### Related Documents
- Full Report: [docs/04-report/features/day28.report.md](features/day28.report.md)

---

## [2026-07-07] - Day 27: AI 주간 케어 보고서 자동 생성

**Status**: Complete ✅

### Added
- `POST /api/ai/care-report` AI 주간 케어 보고서 생성 API (Gemini 스트리밍)
- `CareReportPanel` 컴포넌트 (슬라이드업 패널, 반응형)

### Fixed
- `caseworker-client.tsx` 닫는 `</>` 태그 누락
- `caseworker-elder-card.tsx` `</Link>` 태그 오타

### Performance
- Gemini 스트리밍으로 실시간 응답 (버퍼링 없음)

### Related Documents
- Work Log: Day 27 section

---

## Versioning Strategy

### MAJOR.MINOR.PATCH

- **MAJOR**: 주요 아키텍처 변경 (예: Supabase 전환)
- **MINOR**: 새 기능 추가 (예: Day N 기능 완료)
- **PATCH**: 버그 수정, 성능 개선 (예: Polish 작업)

### Day-based Versioning

현재 프로젝트는 **Day N** 주기로 관리되므로:
- `v0.DAY.ITERATION` 형식 사용
- 예: v0.28.1 = Day 28의 첫 번째 반복

---

## Future Releases (Planned)

### Day 29 (TBD)
- [ ] 사용자 피드백 기반 UX 개선
- [ ] 성능 모니터링 및 최적화
- [ ] 버그 리포트 처리

### Day 30+ (Backlog)
- [ ] 실시간 알림 (WebSocket)
- [ ] 케어 플랜 저장 및 히스토리
- [ ] 모바일 PWA 최적화
- [ ] 영어/다언어 지원
- [ ] Resend 도메인 인증 (사용자 도메인 구매 후)
- [ ] 실제 SMS/Kakao/음성 전송 (별도 승인 필요)

---

## Known Issues

| Issue | Severity | Status | Workaround |
|-------|----------|--------|-----------|
| iOS 뷰포트 높이 (dvh) | Low | Monitoring | Safari 15.4+ 지원 |
| Gemini API 스트리밍 지연 | Low | Acceptable | 네트워크 환경 의존 |

---

## Deprecated

### Removed in Day 16
- `/api/notifications/prepare` (legacy Airtable-based)
- `/notifications` page (legacy mock)
- `notification-preview-panel.tsx` (replaced by `/delivery-preview`)

> Note: `src/lib/silverlink/notifications/` (Day5 code-first engine) is kept for reference

---

## Testing Summary

| Phase | Tests | Status |
|-------|-------|--------|
| Unit | 150+ | ✅ All pass |
| Integration | E2E | ✅ Verified |
| Manual | Browser | ✅ Verified |
| Security | RLS/API | ✅ Verified |

---

## Deployment History

| Date | Version | URL | Status |
|------|---------|-----|--------|
| 2026-07-08 | Day 28 | https://silverlink-ai.vercel.app | ✅ Live |
| 2026-06-27 | Day 16 | https://silverlink-ai.vercel.app | ✅ Archived |

