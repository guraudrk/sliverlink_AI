-- ──────────────────────────────────────────────────────────────────
-- V2 성능 인덱스 마이그레이션
-- 대상: listElderSummaries 4개 병렬 쿼리 (어르신 60명 기준)
-- 실행 방법: Supabase SQL Editor에 전체 붙여넣기 후 실행
-- ──────────────────────────────────────────────────────────────────

BEGIN;

-- ① social_scores: parent_id IN (...) + ORDER BY week_start DESC
--    복합 인덱스로 "parent별 최신 주 점수" 조회를 인덱스 스캔으로 처리
--    예상 행수: 어르신 60명 × 주차 N = 시간이 지날수록 선형 증가
CREATE INDEX IF NOT EXISTS idx_social_scores_parent_week
  ON public.social_scores (parent_id, week_start DESC);

-- ② care_call_attempts: parent_id IN (...) + created_at >= (14일 전) + ORDER BY created_at DESC
--    날짜 범위 필터 + 정렬 모두 커버하는 복합 인덱스
--    예상 행수: 어르신 60명 × 일 1회 × 365일 = 21,900행/년
CREATE INDEX IF NOT EXISTS idx_care_call_attempts_parent_created
  ON public.care_call_attempts (parent_id, created_at DESC);

-- ③ safety_alerts: elder_id IN (...) + acknowledged_at IS NULL
--    부분 인덱스(partial index): 미확인 알림만 인덱싱 → 인덱스 크기 최소화
--    acknowledged_at이 채워지면 인덱스에서 자동 제외됨
CREATE INDEX IF NOT EXISTS idx_safety_alerts_unacked
  ON public.safety_alerts (elder_id)
  WHERE acknowledged_at IS NULL;

COMMIT;

-- ──────────────────────────────────────────────────────────────────
-- 검증 쿼리 (실행 후 아래로 인덱스 생성 확인)
-- ──────────────────────────────────────────────────────────────────
-- SELECT indexname, tablename, indexdef
-- FROM pg_indexes
-- WHERE indexname IN (
--   'idx_social_scores_parent_week',
--   'idx_care_call_attempts_parent_created',
--   'idx_safety_alerts_unacked'
-- );
