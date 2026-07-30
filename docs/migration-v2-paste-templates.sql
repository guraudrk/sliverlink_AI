-- Day38 S2: 기관별 붙여넣기 템플릿 테이블
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS public.paste_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template    text        NOT NULL,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (org_id)  -- 기관당 하나
);

-- 변경 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_paste_template_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER paste_templates_updated_at
  BEFORE UPDATE ON public.paste_templates
  FOR EACH ROW EXECUTE FUNCTION update_paste_template_timestamp();

-- RLS
ALTER TABLE public.paste_templates ENABLE ROW LEVEL SECURITY;

-- org 멤버: 조회
CREATE POLICY "paste_templates_select_member"
  ON public.paste_templates FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- org admin: 생성·수정·삭제
CREATE POLICY "paste_templates_all_admin"
  ON public.paste_templates FOR ALL
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
