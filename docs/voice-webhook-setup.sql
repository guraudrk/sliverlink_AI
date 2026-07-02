-- ============================================================
-- SilverLink AI — Solapi 음성 콜백 처리용 SECURITY DEFINER 함수
-- ============================================================
-- 실행 방법: Supabase 대시보드 → SQL Editor → 아래 SQL 전체 붙여넣기 → Run
--
-- 역할:
--   /api/voice/solapi-status 웹훅 엔드포인트가 Solapi의 상태보고 콜백을 받으면,
--   인증 세션 없이도 delivery_attempts 테이블을 갱신할 수 있도록 anon 롤에
--   EXECUTE 권한을 부여한다. SECURITY DEFINER는 함수 정의자(일반적으로 postgres)
--   권한으로 실행되므로 RLS를 우회한다 — 웹훅 시크릿 검증은 엔드포인트 레이어에서
--   이미 처리한다.
--
-- 연관 파일:
--   src/app/api/voice/solapi-status/route.ts  (호출하는 엔드포인트)
--   src/app/api/voice/sync-status/route.ts    (폴링 대안 — 인증 필요)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_voice_callback(
  p_group_id       text,
  p_message_id     text,
  p_status_code    text,
  p_status_message text,
  p_voice_replied  boolean,
  p_reply_key      integer,
  p_voice_duration integer,
  p_raw_payload    jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id  uuid;
  v_new_status  text;
  v_reply_label text;
BEGIN
  -- groupId로 voice_call delivery_attempt를 찾는다
  -- (SolapiVoiceProvider가 external_message_id = groupId로 저장함)
  SELECT id INTO v_attempt_id
  FROM delivery_attempts
  WHERE external_message_id = p_group_id
    AND channel = 'voice_call'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_attempt_id IS NULL THEN
    -- messageId로도 한번 더 시도 (일부 콜백은 messageId만 보낼 수 있음)
    SELECT id INTO v_attempt_id
    FROM delivery_attempts
    WHERE external_message_id = p_message_id
      AND channel = 'voice_call'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_attempt_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'attempt_not_found');
  END IF;

  -- 응답 상태 결정
  IF p_voice_replied THEN
    v_new_status := 'answered';
    v_reply_label :=
      CASE p_reply_key
        WHEN 1 THEN '1번 키 (완료)'
        WHEN 2 THEN '2번 키 (도움 요청)'
        ELSE '키패드 응답 수신'
      END;
  ELSE
    v_new_status := CASE p_status_code WHEN '2000' THEN 'sent' ELSE 'failed' END;
    v_reply_label := NULL;
  END IF;

  -- delivery_attempt 갱신
  UPDATE delivery_attempts
  SET
    status           = v_new_status,
    response_payload = p_raw_payload
  WHERE id = v_attempt_id;

  RETURN json_build_object(
    'ok',           true,
    'attemptId',    v_attempt_id,
    'status',       v_new_status,
    'replyLabel',   v_reply_label
  );
END;
$$;

-- anon 롤이 이 함수를 호출할 수 있도록 권한 부여
GRANT EXECUTE ON FUNCTION public.handle_voice_callback(
  text, text, text, text, boolean, integer, integer, jsonb
) TO anon;
