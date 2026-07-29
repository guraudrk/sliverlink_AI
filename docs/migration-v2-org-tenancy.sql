-- =============================================================
-- SilverLink V2 — 기관 멀티테넌시 마이그레이션 (확정판 v3)
-- Day 34 / S3
-- =============================================================
-- 수정 이력:
--   v1: 함수 → 테이블 순서 (42P01: org_members 없음)
--   v2: 테이블 → 함수 순서, but can_access_parent가 pp.org_id 참조
--       → 42703: parent_profiles.org_id 컬럼이 아직 없음
--   v3: 함수를 두 단계로 분리
--       3A: is_org_member / is_org_admin  (org_members만 참조)
--       3B: can_access_parent / can_access_parent_any
--           (pp.org_id 참조 → parent_profiles 컬럼 추가 후에 생성)
-- =============================================================
-- 실행 순서:
--   1.  organizations 테이블
--   2.  org_members 테이블
--   3A. is_org_member / is_org_admin 함수
--   4.  organizations RLS
--   5.  org_members RLS
--   6.  parent_profiles 컬럼 추가 (org_id, assigned_user_id)
--   3B. can_access_parent / can_access_parent_any 함수  ← pp.org_id 존재
--   7.  parent_profiles 트리거
--   8.  parent_profiles RLS
--   9.  인덱스
--  10.  하위 테이블 RLS
--  11.  social_scores unique 변경
--  12.  create_org_with_admin
-- =============================================================

BEGIN;

-- ============================================================
-- Step 1. organizations 테이블
-- ============================================================

CREATE TABLE public.organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  is_demo    boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 2. org_members 테이블
-- ============================================================

CREATE TABLE public.org_members (
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'social_worker',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (org_id, user_id),
  CONSTRAINT role_check CHECK (role IN ('admin', 'social_worker', 'field_worker'))
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 3A. org_members만 참조하는 함수 (parent_profiles 컬럼 불필요)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- Step 4. organizations RLS 정책
-- ============================================================

CREATE POLICY "orgs_select_member"
ON public.organizations FOR SELECT
USING (is_org_member(id));

CREATE POLICY "orgs_update_admin"
ON public.organizations FOR UPDATE
USING (is_org_admin(id))
WITH CHECK (is_org_admin(id));

-- ============================================================
-- Step 5. org_members RLS 정책
-- ============================================================

CREATE POLICY "org_members_select"
ON public.org_members FOR SELECT
USING (user_id = auth.uid() OR is_org_member(org_id));

CREATE POLICY "org_members_insert_admin"
ON public.org_members FOR INSERT
WITH CHECK (is_org_admin(org_id));

CREATE POLICY "org_members_update_admin"
ON public.org_members FOR UPDATE
USING (is_org_admin(org_id))
WITH CHECK (is_org_admin(org_id));

CREATE POLICY "org_members_delete_admin"
ON public.org_members FOR DELETE
USING (is_org_admin(org_id));

-- ============================================================
-- Step 6. parent_profiles 컬럼 추가
-- (이 이후부터 pp.org_id / pp.assigned_user_id 참조 가능)
-- ============================================================

ALTER TABLE public.parent_profiles
  ADD COLUMN org_id           uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- Step 3B. pp.org_id를 참조하는 함수 (parent_profiles 컬럼 추가 후)
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_access_parent(p_parent_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_profiles pp
    JOIN public.org_members m ON m.org_id = pp.org_id
    WHERE pp.id = p_parent_id
      AND pp.org_id IS NOT NULL
      AND m.user_id = auth.uid()
      AND (
        m.role IN ('admin', 'social_worker')
        OR (m.role = 'field_worker' AND pp.assigned_user_id = auth.uid())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_parent_any(p_parent_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_profiles pp
    WHERE pp.id = p_parent_id
      AND pp.org_id IS NULL
      AND pp.owner_user_id = auth.uid()
  )
  OR public.can_access_parent(p_parent_id);
$$;

-- ============================================================
-- Step 7. parent_profiles 불변 필드 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_parent_org_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  BEGIN
    v_role := current_setting('request.jwt.claims', true)::json->>'role';
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;
  IF v_role = 'service_role' OR v_role IS NULL THEN
    RETURN NEW;
  END IF;
  IF (NEW.org_id IS DISTINCT FROM OLD.org_id) OR
     (NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id) THEN
    RAISE EXCEPTION 'org_id and owner_user_id are immutable via client requests.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER parent_profiles_lock_org
  BEFORE UPDATE ON public.parent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_parent_org_change();

-- ============================================================
-- Step 8. parent_profiles RLS 재작성
-- ============================================================

DROP POLICY IF EXISTS "parent_profiles_select_own" ON public.parent_profiles;
DROP POLICY IF EXISTS "parent_profiles_insert_own" ON public.parent_profiles;
DROP POLICY IF EXISTS "parent_profiles_update_own" ON public.parent_profiles;
DROP POLICY IF EXISTS "parent_profiles_delete_own" ON public.parent_profiles;

CREATE POLICY "parent_profiles_select_own"
ON public.parent_profiles FOR SELECT
USING (
  (org_id IS NULL AND auth.uid() = owner_user_id)
  OR can_access_parent(id)
);

CREATE POLICY "parent_profiles_insert_own"
ON public.parent_profiles FOR INSERT
WITH CHECK (
  (org_id IS NULL AND auth.uid() = owner_user_id)
  OR (org_id IS NOT NULL AND is_org_member(org_id))
);

CREATE POLICY "parent_profiles_update_own"
ON public.parent_profiles FOR UPDATE
USING (
  (org_id IS NULL AND auth.uid() = owner_user_id)
  OR can_access_parent(id)
)
WITH CHECK (
  (org_id IS NULL AND auth.uid() = owner_user_id)
  OR can_access_parent(id)
);

CREATE POLICY "parent_profiles_delete_own"
ON public.parent_profiles FOR DELETE
USING (
  (org_id IS NULL AND auth.uid() = owner_user_id)
  OR is_org_admin(org_id)
);

-- ============================================================
-- Step 9. 인덱스 3개
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_parent_profiles_org_id
  ON public.parent_profiles (org_id);

CREATE INDEX IF NOT EXISTS idx_parent_profiles_assigned_user_id
  ON public.parent_profiles (assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_org_members_user_id
  ON public.org_members (user_id);

-- ============================================================
-- Step 10. 하위 테이블 RLS 확장
-- ============================================================

-- ── care_tasks ────────────────────────────────────────────────
DROP POLICY IF EXISTS "care_tasks_select_own" ON public.care_tasks;
DROP POLICY IF EXISTS "care_tasks_insert_own" ON public.care_tasks;
DROP POLICY IF EXISTS "care_tasks_update_own" ON public.care_tasks;
DROP POLICY IF EXISTS "care_tasks_delete_own" ON public.care_tasks;

CREATE POLICY "care_tasks_select_own" ON public.care_tasks FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "care_tasks_insert_own" ON public.care_tasks FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (parent_id IS NULL OR can_access_parent_any(parent_id))
);

CREATE POLICY "care_tasks_update_own" ON public.care_tasks FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(parent_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "care_tasks_delete_own" ON public.care_tasks FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

-- ── message_logs (parent_id NULLABLE) ────────────────────────
DROP POLICY IF EXISTS "message_logs_select_own" ON public.message_logs;
DROP POLICY IF EXISTS "message_logs_insert_own" ON public.message_logs;
DROP POLICY IF EXISTS "message_logs_update_own" ON public.message_logs;
DROP POLICY IF EXISTS "message_logs_delete_own" ON public.message_logs;

CREATE POLICY "message_logs_select_own" ON public.message_logs FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "message_logs_insert_own" ON public.message_logs FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (parent_id IS NULL OR can_access_parent_any(parent_id))
);

CREATE POLICY "message_logs_update_own" ON public.message_logs FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(parent_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "message_logs_delete_own" ON public.message_logs FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

-- ── notification_queue ────────────────────────────────────────
DROP POLICY IF EXISTS "notification_queue_select_own" ON public.notification_queue;
DROP POLICY IF EXISTS "notification_queue_insert_own" ON public.notification_queue;
DROP POLICY IF EXISTS "notification_queue_update_own" ON public.notification_queue;
DROP POLICY IF EXISTS "notification_queue_delete_own" ON public.notification_queue;

CREATE POLICY "notification_queue_select_own" ON public.notification_queue FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "notification_queue_insert_own" ON public.notification_queue FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (parent_id IS NULL OR can_access_parent_any(parent_id))
);

CREATE POLICY "notification_queue_update_own" ON public.notification_queue FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(parent_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "notification_queue_delete_own" ON public.notification_queue FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

-- ── delivery_attempts ─────────────────────────────────────────
DROP POLICY IF EXISTS "delivery_attempts_select_own" ON public.delivery_attempts;
DROP POLICY IF EXISTS "delivery_attempts_insert_own" ON public.delivery_attempts;
DROP POLICY IF EXISTS "delivery_attempts_update_own" ON public.delivery_attempts;
DROP POLICY IF EXISTS "delivery_attempts_delete_own" ON public.delivery_attempts;

CREATE POLICY "delivery_attempts_select_own" ON public.delivery_attempts FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "delivery_attempts_insert_own" ON public.delivery_attempts FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (parent_id IS NULL OR can_access_parent_any(parent_id))
);

CREATE POLICY "delivery_attempts_update_own" ON public.delivery_attempts FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(parent_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "delivery_attempts_delete_own" ON public.delivery_attempts FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

-- ── care_call_schedules ───────────────────────────────────────
DROP POLICY IF EXISTS "care_call_schedules_select_own" ON public.care_call_schedules;
DROP POLICY IF EXISTS "care_call_schedules_insert_own" ON public.care_call_schedules;
DROP POLICY IF EXISTS "care_call_schedules_update_own" ON public.care_call_schedules;
DROP POLICY IF EXISTS "care_call_schedules_delete_own" ON public.care_call_schedules;

CREATE POLICY "care_call_schedules_select_own" ON public.care_call_schedules FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "care_call_schedules_insert_own" ON public.care_call_schedules FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (parent_id IS NULL OR can_access_parent_any(parent_id))
);

CREATE POLICY "care_call_schedules_update_own" ON public.care_call_schedules FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(parent_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "care_call_schedules_delete_own" ON public.care_call_schedules FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

-- ── care_call_attempts ────────────────────────────────────────
DROP POLICY IF EXISTS "care_call_attempts_select_own" ON public.care_call_attempts;
DROP POLICY IF EXISTS "care_call_attempts_insert_own" ON public.care_call_attempts;
DROP POLICY IF EXISTS "care_call_attempts_update_own" ON public.care_call_attempts;
DROP POLICY IF EXISTS "care_call_attempts_delete_own" ON public.care_call_attempts;

CREATE POLICY "care_call_attempts_select_own" ON public.care_call_attempts FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "care_call_attempts_insert_own" ON public.care_call_attempts FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (parent_id IS NULL OR can_access_parent_any(parent_id))
);

CREATE POLICY "care_call_attempts_update_own" ON public.care_call_attempts FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(parent_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "care_call_attempts_delete_own" ON public.care_call_attempts FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

-- ── rag_documents ─────────────────────────────────────────────
DROP POLICY IF EXISTS "rag_documents_select_own" ON public.rag_documents;
DROP POLICY IF EXISTS "rag_documents_insert_own" ON public.rag_documents;
DROP POLICY IF EXISTS "rag_documents_update_own" ON public.rag_documents;
DROP POLICY IF EXISTS "rag_documents_delete_own" ON public.rag_documents;

CREATE POLICY "rag_documents_select_own" ON public.rag_documents FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "rag_documents_insert_own" ON public.rag_documents FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (parent_id IS NULL OR can_access_parent_any(parent_id))
);

CREATE POLICY "rag_documents_update_own" ON public.rag_documents FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(parent_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "rag_documents_delete_own" ON public.rag_documents FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

-- ── social_scores ─────────────────────────────────────────────
DROP POLICY IF EXISTS "owner can select social_scores" ON public.social_scores;
DROP POLICY IF EXISTS "owner can insert social_scores" ON public.social_scores;
DROP POLICY IF EXISTS "owner can update social_scores" ON public.social_scores;
DROP POLICY IF EXISTS "owner can delete social_scores" ON public.social_scores;

CREATE POLICY "social_scores_select_own" ON public.social_scores FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "social_scores_insert_own" ON public.social_scores FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (parent_id IS NULL OR can_access_parent_any(parent_id))
);

CREATE POLICY "social_scores_update_own" ON public.social_scores FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(parent_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "social_scores_delete_own" ON public.social_scores FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

-- ── call_recordings (0-2 확인: ALL 2개 + SELECT/INSERT/UPDATE 각 1개)
DROP POLICY IF EXISTS "users see own recordings"        ON public.call_recordings;
DROP POLICY IF EXISTS "owner_full_access"               ON public.call_recordings;
DROP POLICY IF EXISTS "owner can select own recordings" ON public.call_recordings;
DROP POLICY IF EXISTS "owner can insert own recordings" ON public.call_recordings;
DROP POLICY IF EXISTS "owner can update own recordings" ON public.call_recordings;

CREATE POLICY "call_recordings_select_own" ON public.call_recordings FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "call_recordings_insert_own" ON public.call_recordings FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (parent_id IS NULL OR can_access_parent_any(parent_id))
);

CREATE POLICY "call_recordings_update_own" ON public.call_recordings FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(parent_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(parent_id));

CREATE POLICY "call_recordings_delete_own" ON public.call_recordings FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(parent_id));

-- ── safety_alerts (elder_id = parent_profiles.id FK) ─────────
DROP POLICY IF EXISTS "safety_alerts_select_own" ON public.safety_alerts;
DROP POLICY IF EXISTS "safety_alerts_insert_own" ON public.safety_alerts;
DROP POLICY IF EXISTS "safety_alerts_update_own" ON public.safety_alerts;
DROP POLICY IF EXISTS "safety_alerts_delete_own" ON public.safety_alerts;

CREATE POLICY "safety_alerts_select_own" ON public.safety_alerts FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(elder_id));

CREATE POLICY "safety_alerts_insert_own" ON public.safety_alerts FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (elder_id IS NULL OR can_access_parent_any(elder_id))
);

CREATE POLICY "safety_alerts_update_own" ON public.safety_alerts FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(elder_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(elder_id));

CREATE POLICY "safety_alerts_delete_own" ON public.safety_alerts FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(elder_id));

-- ── call_family_briefs (elder_id, 0-2: SELECT/INSERT/UPDATE 각 1개)
DROP POLICY IF EXISTS "owner only select" ON public.call_family_briefs;
DROP POLICY IF EXISTS "owner only insert" ON public.call_family_briefs;
DROP POLICY IF EXISTS "owner only update" ON public.call_family_briefs;

CREATE POLICY "call_family_briefs_select_own" ON public.call_family_briefs FOR SELECT
USING (auth.uid() = owner_user_id OR can_access_parent(elder_id));

CREATE POLICY "call_family_briefs_insert_own" ON public.call_family_briefs FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND (elder_id IS NULL OR can_access_parent_any(elder_id))
);

CREATE POLICY "call_family_briefs_update_own" ON public.call_family_briefs FOR UPDATE
USING  (auth.uid() = owner_user_id OR can_access_parent(elder_id))
WITH CHECK (auth.uid() = owner_user_id OR can_access_parent(elder_id));

CREATE POLICY "call_family_briefs_delete_own" ON public.call_family_briefs FOR DELETE
USING (auth.uid() = owner_user_id OR can_access_parent(elder_id));

-- ============================================================
-- Step 11. social_scores unique 제약 변경
-- (0-3 확인: social_scores_owner_user_id_parent_id_week_start_key)
-- ============================================================

ALTER TABLE public.social_scores
  DROP CONSTRAINT IF EXISTS "social_scores_owner_user_id_parent_id_week_start_key",
  ADD CONSTRAINT social_scores_parent_id_week_start_key
    UNIQUE (parent_id, week_start);

-- ============================================================
-- Step 12. create_org_with_admin (기관 생성 진입점)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_org_with_admin(
  p_name          text,
  p_slug          text,
  p_admin_user_id uuid,
  p_is_demo       boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_org_id uuid;
BEGIN
  INSERT INTO public.organizations(name, slug, is_demo)
  VALUES (p_name, p_slug, p_is_demo)
  RETURNING id INTO v_org_id;

  INSERT INTO public.org_members(org_id, user_id, role)
  VALUES (v_org_id, p_admin_user_id, 'admin');

  RETURN v_org_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_org_with_admin(text, text, uuid, boolean)
  FROM anon, authenticated;

COMMIT;


-- =============================================================
-- ROLLBACK SQL
-- !! 아래는 자동으로 실행되지 않습니다 !!
-- !! 롤백이 필요할 때만 아래 내용을 별도로 복사해 실행하세요 !!
-- =============================================================
-- BEGIN;
--
-- (아래 각 줄에서 '--' 를 제거하고 실행)
--
-- DROP FUNCTION IF EXISTS public.create_org_with_admin(text, text, uuid, boolean);
-- DROP FUNCTION IF EXISTS public.can_access_parent_any(uuid) CASCADE;
-- DROP FUNCTION IF EXISTS public.can_access_parent(uuid) CASCADE;
-- DROP FUNCTION IF EXISTS public.is_org_admin(uuid);
-- DROP FUNCTION IF EXISTS public.is_org_member(uuid);
-- DROP TRIGGER IF EXISTS parent_profiles_lock_org ON public.parent_profiles;
-- DROP FUNCTION IF EXISTS public.prevent_parent_org_change();
-- ALTER TABLE public.parent_profiles DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE public.parent_profiles DROP COLUMN IF EXISTS assigned_user_id;
-- ... (원복 정책 재생성 필요)
-- DROP TABLE IF EXISTS public.org_members CASCADE;
-- DROP TABLE IF EXISTS public.organizations CASCADE;
--
-- COMMIT;
--
-- NOTE: 전체 롤백 스크립트는 필요 시 따로 작성할 것

DROP FUNCTION IF EXISTS public.create_org_with_admin(text, text, uuid, boolean);
DROP FUNCTION IF EXISTS public.can_access_parent_any(uuid);
DROP FUNCTION IF EXISTS public.can_access_parent(uuid);
DROP FUNCTION IF EXISTS public.is_org_admin(uuid);
DROP FUNCTION IF EXISTS public.is_org_member(uuid);

DROP TRIGGER IF EXISTS parent_profiles_lock_org ON public.parent_profiles;
DROP FUNCTION IF EXISTS public.prevent_parent_org_change();

ALTER TABLE public.parent_profiles
  DROP COLUMN IF EXISTS org_id,
  DROP COLUMN IF EXISTS assigned_user_id;

-- parent_profiles 원복
DROP POLICY IF EXISTS "parent_profiles_select_own" ON public.parent_profiles;
DROP POLICY IF EXISTS "parent_profiles_insert_own" ON public.parent_profiles;
DROP POLICY IF EXISTS "parent_profiles_update_own" ON public.parent_profiles;
DROP POLICY IF EXISTS "parent_profiles_delete_own" ON public.parent_profiles;
CREATE POLICY "parent_profiles_select_own" ON public.parent_profiles
  FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "parent_profiles_insert_own" ON public.parent_profiles
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "parent_profiles_update_own" ON public.parent_profiles
  FOR UPDATE USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "parent_profiles_delete_own" ON public.parent_profiles
  FOR DELETE USING (auth.uid() = owner_user_id);

-- care_tasks 원복
DROP POLICY IF EXISTS "care_tasks_select_own" ON public.care_tasks;
DROP POLICY IF EXISTS "care_tasks_insert_own" ON public.care_tasks;
DROP POLICY IF EXISTS "care_tasks_update_own" ON public.care_tasks;
DROP POLICY IF EXISTS "care_tasks_delete_own" ON public.care_tasks;
CREATE POLICY "care_tasks_select_own" ON public.care_tasks
  FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "care_tasks_insert_own" ON public.care_tasks
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "care_tasks_update_own" ON public.care_tasks
  FOR UPDATE USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "care_tasks_delete_own" ON public.care_tasks
  FOR DELETE USING (auth.uid() = owner_user_id);

-- call_recordings 원복
DROP POLICY IF EXISTS "call_recordings_select_own" ON public.call_recordings;
DROP POLICY IF EXISTS "call_recordings_insert_own" ON public.call_recordings;
DROP POLICY IF EXISTS "call_recordings_update_own" ON public.call_recordings;
DROP POLICY IF EXISTS "call_recordings_delete_own" ON public.call_recordings;
CREATE POLICY "users see own recordings" ON public.call_recordings
  FOR ALL USING (auth.uid() = owner_user_id);

-- call_family_briefs 원복
DROP POLICY IF EXISTS "call_family_briefs_select_own" ON public.call_family_briefs;
DROP POLICY IF EXISTS "call_family_briefs_insert_own" ON public.call_family_briefs;
DROP POLICY IF EXISTS "call_family_briefs_update_own" ON public.call_family_briefs;
DROP POLICY IF EXISTS "call_family_briefs_delete_own" ON public.call_family_briefs;
CREATE POLICY "owner only select" ON public.call_family_briefs
  FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "owner only insert" ON public.call_family_briefs
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "owner only update" ON public.call_family_briefs
  FOR UPDATE USING (auth.uid() = owner_user_id);

-- social_scores unique 원복
ALTER TABLE public.social_scores
  DROP CONSTRAINT IF EXISTS social_scores_parent_id_week_start_key,
  ADD CONSTRAINT social_scores_owner_user_id_parent_id_week_start_key
    UNIQUE (owner_user_id, parent_id, week_start);

DROP TABLE IF EXISTS public.org_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

COMMIT;
