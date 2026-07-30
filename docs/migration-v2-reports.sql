-- =============================================================
-- SilverLink V2 — reports 테이블 (Day 37 / S1)
-- =============================================================
-- 전제: migration-v2-org-tenancy.sql 이 이미 적용됐어야 한다.
--       is_org_member / is_org_admin / can_access_parent 함수 사용.
-- =============================================================
-- 실행 순서:
--   1. reports 테이블 생성
--   2. RLS 활성화 + 정책
--   3. 인덱스
-- =============================================================

BEGIN;

-- ============================================================
-- Step 1. reports 테이블
-- ============================================================

CREATE TABLE public.reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 테넌트 스코프
  org_id        uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id     uuid        REFERENCES public.parent_profiles(id) ON DELETE SET NULL,

  -- 배치 단위 그룹핑: 같은 배치 실행에서 생성된 리포트들은 같은 report_set_id를 공유
  report_set_id uuid        NOT NULL,

  -- 분석 기간
  period_start  date        NOT NULL,
  period_end    date        NOT NULL,

  -- AI 생성 결과
  summary_md    text,                      -- 마크다운 형식 요약 (화면 미리보기)
  paste_text    text,                      -- 복붙용 평문 (Day 38 F5에서 포맷 확정)
  risk_level    text        NOT NULL DEFAULT 'normal'
                            CHECK (risk_level IN ('critical', 'warning', 'normal')),

  -- 생성 상태 (S5 재시도 지원)
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'generating', 'done', 'error')),
  error_msg     text,                      -- status='error'일 때만 사용

  -- 메타
  generated_at  timestamptz,
  model         text,                      -- 실제 사용된 모델명 (e.g. "claude-sonnet-4-6")
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 2. RLS 정책
-- ============================================================

-- 조회: 같은 기관 멤버 전체
CREATE POLICY "reports_select_member"
ON public.reports FOR SELECT
USING (is_org_member(org_id));

-- 생성: 같은 기관 멤버 (배치 API가 authenticated 사용자 세션으로 호출)
CREATE POLICY "reports_insert_member"
ON public.reports FOR INSERT
WITH CHECK (is_org_member(org_id));

-- 수정: 기관 관리자만 (상태 정정, 재시도 트리거 등)
CREATE POLICY "reports_update_admin"
ON public.reports FOR UPDATE
USING (is_org_admin(org_id));

-- 삭제: 기관 관리자만
CREATE POLICY "reports_delete_admin"
ON public.reports FOR DELETE
USING (is_org_admin(org_id));

-- ============================================================
-- Step 3. 인덱스
-- ============================================================

-- 기관 + 배치 단위 조회 (배치 진행 상황 추적)
CREATE INDEX idx_reports_org_set
  ON public.reports (org_id, report_set_id);

-- 기관 + 기간 최신순 조회 (대시보드 최신 리포트 목록)
CREATE INDEX idx_reports_org_period
  ON public.reports (org_id, period_start DESC);

-- 어르신 단위 이력 조회 ("이 어르신 지난 4주치 리포트 보여줘")
CREATE INDEX idx_reports_parent_period
  ON public.reports (parent_id, period_start DESC)
  WHERE parent_id IS NOT NULL;

-- 상태별 조회 (pending/error 건 재시도 대상 추출)
CREATE INDEX idx_reports_status
  ON public.reports (org_id, status)
  WHERE status IN ('pending', 'error');

COMMIT;
