-- ============================================================
-- SilverLink AI — Day 19: Cron 전용 SECURITY DEFINER 함수
-- ============================================================
-- 이 파일의 SQL을 Supabase 대시보드 → SQL 에디터에서 한 번 실행한다.
-- Vercel Cron이 /api/cron/check-due-tasks를 POST 호출할 때
-- anon 권한으로도 RLS를 우회해 DB를 읽고 쓸 수 있게 해준다.
-- ============================================================

-- ① due 큐 조회 함수
-- notification_queue에서 "예약 시각이 지났고 아직 발송 안 된" 항목을
-- parent_profiles.phone과 함께 반환한다.
CREATE OR REPLACE FUNCTION fetch_due_queue_for_cron()
RETURNS TABLE(
  id             uuid,
  care_task_id   uuid,
  channel        text,
  message_text   text,
  call_script    text,
  owner_user_id  uuid,
  parent_id      uuid,
  parent_phone   text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    nq.id,
    nq.care_task_id,
    nq.channel,
    nq.message_text,
    nq.call_script,
    nq.owner_user_id,
    nq.parent_id,
    pp.phone AS parent_phone
  FROM notification_queue nq
  LEFT JOIN parent_profiles pp ON pp.id = nq.parent_id
  WHERE nq.status = 'prepared'
    AND nq.scheduled_for IS NOT NULL
    AND nq.scheduled_for <= now();
$$;

-- ② 발송 결과 기록 함수
-- delivery_attempts에 행을 삽입하고, notification_queue.status를 갱신한다.
-- 두 작업을 하나의 트랜잭션으로 묶어 부분 성공/실패가 없게 한다.
CREATE OR REPLACE FUNCTION record_cron_attempt(
  p_queue_id             uuid,
  p_owner_user_id        uuid,
  p_parent_id            uuid,
  p_provider             text,
  p_channel              text,
  p_status               text,
  p_external_message_id  text,
  p_error_code           text,
  p_error_message        text,
  p_request_payload      jsonb,
  p_response_payload     jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO delivery_attempts(
    owner_user_id,
    parent_id,
    queue_id,
    provider,
    channel,
    status,
    external_message_id,
    error_code,
    error_message,
    request_payload,
    response_payload
  ) VALUES (
    p_owner_user_id,
    p_parent_id,
    p_queue_id,
    p_provider,
    p_channel,
    p_status,
    p_external_message_id,
    p_error_code,
    p_error_message,
    p_request_payload,
    p_response_payload
  );

  UPDATE notification_queue
  SET status = p_status
  WHERE id = p_queue_id;
END;
$$;
