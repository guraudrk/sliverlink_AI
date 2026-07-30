-- Day 41 S3: 멤버 초대 테이블
-- 실행: Supabase → SQL Editor 에 붙여넣고 Run

CREATE TABLE IF NOT EXISTS public.org_invites (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email text        NOT NULL,
  role          text        NOT NULL DEFAULT 'social_worker'
                            CHECK (role IN ('admin', 'social_worker', 'field_worker')),
  token         text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by    uuid        NOT NULL,
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used_at       timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_invites_select_admin" ON public.org_invites;
DROP POLICY IF EXISTS "org_invites_insert_admin" ON public.org_invites;
DROP POLICY IF EXISTS "org_invites_select_token" ON public.org_invites;

-- 기관 관리자: 초대 목록 조회 + 생성
CREATE POLICY "org_invites_select_admin"
  ON public.org_invites FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "org_invites_insert_admin"
  ON public.org_invites FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 토큰으로 조회 (로그인한 사용자 누구든 — 초대 수락용)
CREATE POLICY "org_invites_select_token"
  ON public.org_invites FOR SELECT
  USING (auth.uid() IS NOT NULL);
