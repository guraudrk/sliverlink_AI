# Tasks: Day 19 — 발송 기록 대시보드 + 자동 알림 크론

기준 문서: `docs/PRD-day19-delivery-history-cron.md`

## 중요 — 안전 규칙
- 크론 발송도 `ENABLE_REAL_SMS` / `ENABLE_REAL_CALLS` 플래그를 그대로 따른다. 플래그가 `false`면 크론이 돌아도 실제 발송 없음.
- `CRON_SECRET` 값은 채팅·커밋·문서에 노출 금지. 변수명만 다룬다.
- 크론 엔드포인트(`/api/cron/check-due-tasks`)는 `Authorization: Bearer` 헤더 검증 필수 — 없으면 401.

## Relevant Files (예상)
- `src/lib/supabase/delivery-attempts-repo.ts` — `listDeliveryAttempts` 추가
- `src/app/api/delivery-attempts/route.ts` (신규) — GET 엔드포인트
- `src/app/(protected)/dashboard/deliveries/page.tsx` (신규) — 발송 기록 페이지
- `src/app/(protected)/dashboard/deliveries/loading.tsx` (신규) — 스켈레톤
- `src/components/deliveries/delivery-detail-modal.tsx` (신규) — 상세 모달
- `src/lib/silverlink/cron/check-due-tasks.ts` (신규) — 크론 로직
- `src/app/api/cron/check-due-tasks/route.ts` (신규) — 크론 엔드포인트
- `vercel.json` (신규 또는 수정) — cron 스케줄
- `.env.example`, `docs/deployment-guide.md`, `README.md`, `docs/work-log.md`

---

## Slice 1 — 데이터 레이어

- [ ] 1.1 `delivery-attempts-repo.ts`에 `DeliveryAttemptSummary` 타입 추가
  - 필드: id, channel, status, external_message_id, error_code, error_message, response_payload, created_at, parent_id
- [ ] 1.2 `listDeliveryAttempts(supabase)` 함수 구현
  - `delivery_attempts` 테이블, `created_at DESC`, limit 100
  - RLS가 자동으로 `owner_user_id` 필터링 — 별도 조건 불필요
- [ ] 1.3 `GET /api/delivery-attempts` 라우트 신규
  - 인증 확인 (미인증 → 401)
  - `listDeliveryAttempts(supabase)` 호출, `{ ok: true, attempts }` 반환
- [ ] 1.4 `npx tsc --noEmit` 클린 확인

## Slice 2 — 발송 기록 목록 페이지

- [ ] 2.1 `src/app/(protected)/dashboard/deliveries/page.tsx` 신규 (Server Component)
  - `createSupabaseServerClient()` + `listDeliveryAttempts(supabase)` 직접 호출
  - 결과를 `DeliveriesClient`에 props로 전달
- [ ] 2.2 `deliveries-client.tsx` 신규 (Client Component)
  - 채널별 라벨·배지 색상:
    - `voice_call` → 파랑 "AI 전화"
    - `sms` → 초록 "SMS"
    - `kakao_alimtalk` → 노랑 "카카오"
  - 상태 배지: `answered`=파랑, `sent`=초록, `failed`=빨강, 그 외=회색
  - 카드 클릭 → `DeliveryDetailModal` 열기 (dynamic import)
- [ ] 2.3 `loading.tsx` 스켈레톤 추가
- [ ] 2.4 빈 상태 안내: "아직 발송 기록이 없어요."
- [ ] 2.5 `npx tsc --noEmit` 클린, `npm run build` 확인

## Slice 3 — 발송 상세 모달

- [ ] 3.1 `src/components/deliveries/delivery-detail-modal.tsx` 신규 (Client Component)
- [ ] 3.2 채널별 표시 분기:
  - **voice_call**: `response_payload`에서 `voiceReplied`, `replyKey`, `voiceDuration` 파싱 후 표시
    - replyKey 1 = "1번 (완료)", 2 = "2번 (도움 요청)", null = "응답 없음"
  - **sms**: `external_message_id`(Solapi messageId), 발송 시각
  - **공통**: `status`, `created_at`, `error_code`/`error_message`(있을 때만)
- [ ] 3.3 `response_payload` JSON 접기/펼치기 (`<details>` 태그 활용)
- [ ] 3.4 ESC 키·배경 클릭으로 닫기
- [ ] 3.5 `deliveries-client.tsx`에서 `dynamic(() => import(...), { ssr: false })`로 lazy-load

## Slice 4 — 진입점 연결

- [ ] 4.1 대시보드 홈(`/dashboard/page.tsx`) nav grid에 "발송 기록" 카드 추가
  - href: `/dashboard/deliveries`, 설명: "SMS · 음성 발송 이력"
- [ ] 4.2 모바일 하단 탭 판단:
  - 5탭 한도 내 변경 여부 검토 (기존: 홈/일정/응답/부모님/AI비서)
  - 필요하면 "응답 기록"(chat 아이콘)을 "발송 기록"으로 교체하거나 대시보드 홈 카드로만 처리
- [ ] 4.3 `npm run build` 최종 확인

## Slice 5 — 크론 로직 함수

- [ ] 5.1 현재 `notification_queue` 스키마 확인 (scheduled_for, status 필드 정확한 값 파악)
- [ ] 5.2 `src/lib/silverlink/cron/check-due-tasks.ts` 신규
  - `notification_queue`에서 `status = 'prepared'` AND `scheduled_for <= now()` 조회 (service role client 필요 여부 검토 — RLS에서 크론이 특정 user로 동작하지 않으므로)
  - 조회된 각 항목에 대해:
    1. `parent_profiles`에서 `phone` 조회
    2. `ENABLE_REAL_SMS`/`ENABLE_REAL_CALLS` 플래그에 따라 실제/Mock 발송
    3. `delivery_attempts` 생성, `notification_queue.status` 갱신
  - 처리 성공/실패 건수 반환
- [ ] 5.3 `npx tsc --noEmit` 클린 확인

> ⚠️ **service role key 미사용 원칙**: 크론이 특정 user 세션 없이 실행될 때 RLS를 어떻게 처리할지 설계 시 주의. SECURITY DEFINER RPC 패턴(Day17 웹훅에서 이미 사용) 또는 별도 접근 방식 검토.

## Slice 6 — Vercel Cron 배포

- [ ] 6.1 `/api/cron/check-due-tasks/route.ts` 신규 (POST)
  - `Authorization: Bearer` 헤더에서 `CRON_SECRET` 검증 (없거나 틀리면 401)
  - `checkDueTasks()` 호출, 처리 결과 JSON 반환
  - `export const maxDuration = 60` (Vercel Function 타임아웃)
- [ ] 6.2 `vercel.json` 신규 또는 수정
  ```json
  {
    "crons": [{ "path": "/api/cron/check-due-tasks", "schedule": "0 0 * * *" }]
  }
  ```
  - 스케줄: 매일 UTC 00:00 (한국 시간 오전 9시)
- [ ] 6.3 `.env.example`에 `CRON_SECRET=` 추가 (설명 포함)
- [ ] 6.4 `docs/deployment-guide.md`에 CRON_SECRET 등록 절차 추가
- [ ] 6.5 수동 트리거로 로컬 테스트:
  - `npm run dev` 실행 후 `curl -X POST http://localhost:3000/api/cron/check-due-tasks -H "Authorization: Bearer <로컬_SECRET>"` 로 확인
- [ ] 6.6 Vercel 배포 후 Vercel 대시보드 → Cron Jobs 탭에서 스케줄 등록 확인

## 문서화

- [ ] D.1 `README.md` 10장 "발송 기록 페이지" 항목 구현 완료로 표시
- [ ] D.2 `README.md`에 Day19 섹션 추가
- [ ] D.3 `docs/work-log.md`에 Day19 항목 작성
- [ ] D.4 git commit + push
