-- Day 39 S1~S4: 자동 발송 스케줄 + 발송 이력 테이블
-- 실행: Supabase → SQL Editor 에 붙여넣고 Run
-- 기본값 '0 23 * * 0' = 매주 일요일 23:00 UTC = 월요일 08:00 KST

CREATE TABLE IF NOT EXISTS public.report_schedules (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cron_expr        text        NOT NULL DEFAULT '0 23 * * 0',
  enabled          boolean     NOT NULL DEFAULT true,
  recipient_emails text[]      NOT NULL DEFAULT '{}',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (org_id)
);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_schedules_select_member" ON public.report_schedules;
DROP POLICY IF EXISTS "report_schedules_all_admin"     ON public.report_schedules;

-- 기관 멤버는 조회 가능
CREATE POLICY "report_schedules_select_member"
  ON public.report_schedules FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- 기관 관리자만 생성·수정·삭제 가능
CREATE POLICY "report_schedules_all_admin"
  ON public.report_schedules FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Day 39 S4: 발송 이력 테이블
-- 성공/실패 모두 기록 → "지난주 것 다시 주세요" 재전송 + 실패 재시도 대상 식별
CREATE TABLE IF NOT EXISTS public.report_send_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start    date,
  period_end      date,
  recipient_email text        NOT NULL,
  elder_count     int         NOT NULL DEFAULT 0,
  status          text        NOT NULL CHECK (status IN ('sent', 'failed', 'retried')),
  error_message   text,
  sent_at         timestamptz DEFAULT now()
);

ALTER TABLE public.report_send_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_send_logs_select_member" ON public.report_send_logs;
DROP POLICY IF EXISTS "report_send_logs_insert_admin"  ON public.report_send_logs;

-- 기관 멤버는 자기 기관 이력만 조회
CREATE POLICY "report_send_logs_select_member"
  ON public.report_send_logs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- 기관 관리자만 이력 삽입 가능 (실제 삽입은 서비스 롤이지만 RLS 정책은 admin으로 제한)
CREATE POLICY "report_send_logs_insert_admin"
  ON public.report_send_logs FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 인덱스: 기관별 최신 이력 조회 성능
CREATE INDEX IF NOT EXISTS idx_report_send_logs_org_sent
  ON public.report_send_logs (org_id, sent_at DESC);
