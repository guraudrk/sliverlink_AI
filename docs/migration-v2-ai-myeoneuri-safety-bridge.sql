-- =============================================================
-- SilverLink V2 — AI 며느리 안전 알림 연동 마이그레이션
-- 목적: safety_alerts에서 통화 녹음 없이 AI 며느리가 직접 알림을 생성할 수 있도록
--       call_id를 nullable로 변경하고 source 컬럼을 추가한다.
-- =============================================================
-- 변경 내용:
--   1. safety_alerts.call_id  — NOT NULL 제약 해제 (nullable)
--   2. safety_alerts.source   — 신규 컬럼 (기본값 'call_recording')
-- =============================================================
-- 실행 전 확인:
--   - 기존 데이터가 있으면 source가 'call_recording'으로 자동 채워진다.
--   - call_id가 NULL인 행은 ai_myeoneuri 소스임을 의미한다.
-- =============================================================

BEGIN;

-- Step 1. call_id NOT NULL 제약 해제
ALTER TABLE public.safety_alerts
  ALTER COLUMN call_id DROP NOT NULL;

-- Step 2. source 컬럼 추가
--   기본값 'call_recording' → 기존 레코드 자동 보호
ALTER TABLE public.safety_alerts
  ADD COLUMN IF NOT EXISTS source TEXT
    NOT NULL
    DEFAULT 'call_recording'
    CHECK (source IN ('call_recording', 'ai_myeoneuri'));

-- (검증) 컬럼 확인용 — 실행 결과에서 source와 call_id nullable 여부를 눈으로 확인한다.
-- SELECT column_name, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'safety_alerts'
-- ORDER BY ordinal_position;

COMMIT;
