# SilverLink AI — Day 19: 발송 기록 대시보드 + 자동 알림 크론 (PRD)

## 0. 문서 정보

Day 17에서 실제 SMS·음성 발송이 완성됐지만, 보낸 이후의 기록을 한눈에 볼 수 있는 UI가 없다. 또한 사용자가 매번 발송 버튼을 직접 눌러야 하는 수동 구조다. Day 19에서는 이 두 가지를 함께 해결한다.

- **발송 기록 대시보드**: `delivery_attempts` 테이블에 이미 쌓이고 있는 기록을 볼 수 있는 UI
- **자동 알림 크론**: Vercel Cron Job으로 기한 임박 `care_tasks`를 자동으로 발송 큐에 등록

## 1. 목표

| 목표 | 완료 기준 |
|---|---|
| 발송 기록을 대시보드에서 볼 수 있다 | `/dashboard/deliveries` 에서 채널·상태·수신자·타임스탬프를 카드 목록으로 표시 |
| 발송 상세를 확인할 수 있다 | 클릭 시 모달: 음성이면 voiceReplied·키 번호, SMS면 messageId, 실패면 에러 메시지 |
| 케어 업무 기한이 되면 자동으로 알림 큐가 생성된다 | Vercel Cron이 실행되면 `scheduled_for <= now()` 인 prepared 큐 항목이 자동 발송 처리됨 |
| 크론을 수동으로 트리거할 수 있다 | `POST /api/cron/check-due-tasks` 엔드포인트로 테스트 가능 |

## 2. 배경 및 제약

- `delivery_attempts` 테이블은 Day 8부터 운용 중. `getDeliveryAttemptById`, `updateDeliveryAttemptStatus` 함수는 이미 존재. `listDeliveryAttempts` 함수 누락.
- `notification_queue` 테이블에 `scheduled_for`, `status`(`prepared`/`sent`/`failed`) 필드 존재.
- Vercel Cron Jobs는 `vercel.json`의 `crons` 배열로 설정, `/api/cron/*` 라우트를 주기적으로 호출한다. Vercel이 보내는 요청 헤더에 `Authorization: Bearer <CRON_SECRET>`을 검증해 외부 요청과 구별한다.
- 크론 실행 시 실제 발송 여부는 기존 `ENABLE_REAL_SMS` / `ENABLE_REAL_CALLS` 플래그를 그대로 따른다 — 새 플래그 추가 없음.

## 3. 아키텍처

### 3-1. 발송 기록 대시보드

```
/dashboard/deliveries (Server Component)
  └── createSupabaseServerClient()
       └── listDeliveryAttempts(supabase)     ← repo 신규 함수
            └── delivery_attempts (RLS 자동 적용)

클릭
  └── DeliveryDetailModal (Client, dynamic import)
       └── channel별 상세: voiceReplied / messageId / error_message / response_payload
```

### 3-2. 자동 알림 크론

```
Vercel Cron (vercel.json)  →  POST /api/cron/check-due-tasks
                                │  Authorization: Bearer CRON_SECRET 검증
                                ▼
                         checkDueTasks() 함수
                                │
                   notification_queue 조회
                   WHERE status = 'prepared'
                     AND scheduled_for <= now()
                                │
                   각 항목에 대해 기존 발송 로직 호출
                   (ENABLE_REAL_SMS/CALLS 플래그 준수)
                                │
                   delivery_attempts 생성 + queue status 갱신
```

## 4. Slice별 상세

### Slice 1 — 데이터 레이어
- `src/lib/supabase/delivery-attempts-repo.ts`에 `listDeliveryAttempts(supabase)` 추가
  - `delivery_attempts` 전체를 `created_at DESC` 순으로 최근 100건 조회
  - RLS가 `owner_user_id`로 자동 필터링
  - 반환 타입: `DeliveryAttemptSummary[]` (id, channel, status, external_message_id, error_message, response_payload, created_at)
- `GET /api/delivery-attempts` 라우트 신규 (인증 필수)

### Slice 2 — 발송 기록 목록 페이지
- `/dashboard/deliveries` 신규 Server Component 페이지
- `listDeliveryAttempts(supabase)` 서버에서 직접 호출 (API 우회)
- 채널별 라벨·아이콘, 상태 배지(sent=초록/failed=빨강/answered=파랑), 수신 전화번호, 타임스탬프
- `loading.tsx` 스켈레톤 추가
- 빈 상태 안내 메시지

### Slice 3 — 발송 상세 모달
- `DeliveryDetailModal` (Client Component, `next/dynamic` lazy-load)
- **음성 채널**: `voiceReplied` 여부 + `replyKey`(1번=완료/2번=도움요청) + `voiceDuration`
- **SMS 채널**: Solapi `messageId`, 발송 시각
- **실패**: `error_code` + `error_message`
- `response_payload` JSON을 접기/펼치기 섹션으로 표시

### Slice 4 — 진입점 연결
- 모바일 하단 탭 5개 중 "응답"(ChatIcon) 탭을 "발송기록"으로 변경 OR 대시보드 홈 카드에 추가
  - 판단 기준: 하단 탭 수를 늘리기 어려우면 대시보드 홈 카드 추가
- 대시보드 홈의 nav grid에 "발송 기록" 카드 추가

### Slice 5 — 크론 로직 함수
- `src/lib/silverlink/cron/check-due-tasks.ts` 신규
  - `notification_queue`에서 `status = 'prepared'` AND `scheduled_for <= now()` 항목 조회
  - 각 항목에 대해 parent_profile에서 전화번호 조회 → 기존 `SolapiSmsProvider` / `SolapiVoiceProvider` 호출
  - 발송 결과를 `delivery_attempts`에 기록, `notification_queue.status` 갱신(`sent`/`failed`)
  - 처리한 항목 수 반환

### Slice 6 — Vercel Cron 배포
- `/api/cron/check-due-tasks` POST 라우트
  - `Authorization: Bearer ${CRON_SECRET}` 헤더 검증 (없거나 틀리면 401)
  - `checkDueTasks()` 호출, 처리 결과 JSON 반환
  - `export const maxDuration = 60` (Vercel 타임아웃 설정)
- `vercel.json` 신규 (또는 수정): `crons: [{ path: "/api/cron/check-due-tasks", schedule: "0 0 * * *" }]` (매일 UTC 00:00)
- `.env.example` + `docs/deployment-guide.md`에 `CRON_SECRET` 추가
- 수동 트리거: `curl -X POST https://silverlink-ai.vercel.app/api/cron/check-due-tasks -H "Authorization: Bearer <SECRET>"` 로 테스트

## 5. 안전 규칙

- 크론 발송도 기존 `ENABLE_REAL_SMS` / `ENABLE_REAL_CALLS` 플래그를 따른다. 플래그가 `false`이면 크론이 실행돼도 실제 발송은 없다.
- `CRON_SECRET`은 `.env.local` / Vercel 환경변수에만 보관, 채팅·커밋·문서에 값 노출 금지.
- 크론 엔드포인트는 인증 없이 절대 실행되지 않는다(외부에서 임의 트리거 방지).

## 6. 완료 기준

- [ ] `/dashboard/deliveries`에서 발송 기록 목록을 볼 수 있다
- [ ] 카드 클릭 시 상세 모달이 열리며 채널별 정보가 표시된다
- [ ] `POST /api/cron/check-due-tasks`를 수동 호출하면 prepared 큐 항목이 처리된다
- [ ] `vercel.json`에 cron 설정이 있어 Vercel에 배포 시 자동 스케줄링된다
- [ ] `npx tsc --noEmit` 클린, `npm run build` 성공
