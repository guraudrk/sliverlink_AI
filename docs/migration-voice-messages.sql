-- B-6 음성 메시지 테이블
-- 자녀가 silverlink-web-input에서 녹음한 메시지를 어르신 AI 며느리 앱이 재생한다.
-- 오너가 Supabase SQL Editor에서 직접 실행한다.

-- 1. Storage bucket 생성 (최대 1MB / 파일, 오디오 전용)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  false,
  1048576,
  ARRAY['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/aac']
)
ON CONFLICT (id) DO NOTHING;

-- 2. voice_messages 테이블
CREATE TABLE IF NOT EXISTS public.voice_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id      uuid REFERENCES public.parent_profiles(id) ON DELETE CASCADE NOT NULL,
  storage_path   text NOT NULL,
  duration_sec   int  NOT NULL CHECK (duration_sec >= 1 AND duration_sec <= 30),
  mime_type      text NOT NULL DEFAULT 'audio/mp4',
  is_played      boolean NOT NULL DEFAULT false,
  played_at      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.voice_messages ENABLE ROW LEVEL SECURITY;

-- 보낸 사람(자녀) 조회
CREATE POLICY "sender_select" ON public.voice_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_user_id);

-- 보낸 사람이 INSERT
CREATE POLICY "sender_insert" ON public.voice_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_user_id);

-- 보낸 사람이 DELETE (취소)
CREATE POLICY "sender_delete" ON public.voice_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_user_id AND is_played = false);

-- 4. Storage RLS
-- 인증된 사용자가 자신의 폴더({user_id}/)에만 업로드
CREATE POLICY "voice_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 본인 파일만 다운로드
CREATE POLICY "voice_download" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 본인 파일만 삭제
CREATE POLICY "voice_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. 최신 메시지 먼저 오도록 인덱스
CREATE INDEX IF NOT EXISTS voice_messages_parent_created
  ON public.voice_messages (parent_id, created_at DESC);
