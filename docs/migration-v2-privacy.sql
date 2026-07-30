-- Day 40 F7: 개인정보 처리 기본 세트
-- 실행: Supabase → SQL Editor 에 붙여넣고 Run

-- ─────────────────────────────────────────────
-- S1: 녹음 파기 정책
-- recording_retention_days:
--   NULL  = 분석 완료 즉시 파기 (기본값)
--   N > 0 = N일 보관 후 파기 (기관 옵트인)
-- ─────────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS recording_retention_days int DEFAULT NULL;

-- ─────────────────────────────────────────────
-- S2: 어르신 동의 획득 절차
-- consent_given_at: 동의 일자 (NULL = 미동의)
-- consent_method: 서면/구두/대리 등
-- ─────────────────────────────────────────────
ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS consent_given_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consent_method    text        DEFAULT NULL;

-- ─────────────────────────────────────────────
-- S3: 접근 로그
-- 누가 언제 어떤 어르신 데이터를 조회했는가
-- action: 'report_view' | 'csv_download' | 'data_delete'
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.access_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL,
  parent_id   uuid        REFERENCES public.parent_profiles(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  accessed_at timestamptz DEFAULT now()
);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "access_logs_select_admin" ON public.access_logs;

-- 기관 관리자만 로그 조회 가능
CREATE POLICY "access_logs_select_admin"
  ON public.access_logs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_access_logs_org_at
  ON public.access_logs (org_id, accessed_at DESC);
