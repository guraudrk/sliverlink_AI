-- SilverLink AI — Day 6+7 Member-Scoped Schema
-- Slice 3: parent_profiles 테이블 + RLS
-- Slice 6: care_tasks/message_logs 테이블 + RLS
--
-- 실행 방법: Supabase Dashboard → SQL Editor → 이 파일 내용을 붙여넣고 Run.
-- (anon key로는 DDL을 실행할 수 없어 Claude Code가 대신 실행할 수 없습니다 — 직접 실행해 주세요.)
--
-- 참고 문서: docs/PRD-member-parent-scoped-mvp.md 8장(parent_profiles)/12장(care_tasks/message_logs, 단 12장은
-- 작성 시점 기준이라 아래 스키마와 다름 — care_tasks/message_logs는 기존 Airtable 구조를 최대한 보존하는
-- 쪽으로 가기로 사용자가 확정함. PRD는 추후 이 파일 기준으로 업데이트할 예정.

create table if not exists public.parent_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  relationship text,
  phone text,
  notification_preference text default 'none',
  kakao_identifier text,
  care_context text,
  daily_routine text,
  medication_notes text,
  communication_style text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.parent_profiles enable row level security;

create policy "parent_profiles_select_own"
on public.parent_profiles
for select
using (auth.uid() = owner_user_id);

create policy "parent_profiles_insert_own"
on public.parent_profiles
for insert
with check (auth.uid() = owner_user_id);

create policy "parent_profiles_update_own"
on public.parent_profiles
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "parent_profiles_delete_own"
on public.parent_profiles
for delete
using (auth.uid() = owner_user_id);

-- 필드 의미 (parent_profiles)
-- owner_user_id: 이 부모님 프로필을 등록한 회원(자녀/보호자)의 auth.users.id
-- display_name: 회원이 정한 표시 이름 (예: "아버지", "어머니 테스트")
-- relationship: 아버지/어머니/할머니/할아버지 등 관계
-- phone: SMS/카카오 알림톡 발송용 (향후 확장)
-- notification_preference: 'none' | 'sms' | 'kakao' (향후 확장, 기본값 'none')
-- kakao_identifier: 카카오 알림톡 발송 식별자 (향후 확장)
-- care_context / daily_routine / medication_notes / communication_style: RAG 개인화 챗봇용 맥락 필드 (향후 확장)
-- memo: 기타 자유 기록

-- =========================================================
-- Slice 6: care_tasks / message_logs
-- =========================================================
-- 기존 Make→Airtable 경로가 이미 쌓아온 필드 구조(original_request/parsed_summary/
-- needs_confirmation/child_notified 등)를 최대한 그대로 옮기고, owner_user_id/parent_id만
-- 추가해서 회원별 데이터 격리를 DB 레벨에서 강제한다.

create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid not null references public.parent_profiles(id) on delete cascade,
  task_title text,
  task_type text,
  target_person text,
  task_datetime timestamptz,
  original_request text,
  parsed_summary text,
  status text default 'scheduled',
  priority text default 'normal',
  needs_confirmation boolean default false,
  confirmation_message text,
  completed_at timestamptz,
  child_notified boolean default false,
  parent_notified boolean default false,
  notification_status text default 'none',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.care_tasks enable row level security;

create policy "care_tasks_select_own"
on public.care_tasks
for select
using (auth.uid() = owner_user_id);

create policy "care_tasks_insert_own"
on public.care_tasks
for insert
with check (auth.uid() = owner_user_id);

create policy "care_tasks_update_own"
on public.care_tasks
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "care_tasks_delete_own"
on public.care_tasks
for delete
using (auth.uid() = owner_user_id);

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.parent_profiles(id) on delete cascade,
  care_task_id uuid references public.care_tasks(id) on delete set null,
  message_time timestamptz default now(),
  sender text,
  receiver text,
  raw_message text,
  ai_parsed_json jsonb,
  direction text,
  status text,
  source_channel text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.message_logs enable row level security;

create policy "message_logs_select_own"
on public.message_logs
for select
using (auth.uid() = owner_user_id);

create policy "message_logs_insert_own"
on public.message_logs
for insert
with check (auth.uid() = owner_user_id);

create policy "message_logs_update_own"
on public.message_logs
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "message_logs_delete_own"
on public.message_logs
for delete
using (auth.uid() = owner_user_id);

-- 필드 의미 (care_tasks)
-- owner_user_id / parent_id: 소유 회원 / 대상 부모님 (parent_profiles 참조)
-- target_person: 대상자 이름 텍스트 스냅샷 (Make 레거시 호환용)
-- original_request: 자녀/보호자가 입력한 원문 메시지
-- parsed_summary: AI가 원문을 파싱·요약한 결과
-- status: 'scheduled' | 'completed' 등
-- priority: 'low' | 'normal' | 'high' 등
-- needs_confirmation / confirmation_message: 어르신 확인이 필요한 일정인지, 확인 메시지 문구
-- completed_at: 완료 처리된 시각
-- child_notified / parent_notified: 자녀/부모님 각각에게 알림이 전달됐는지
-- notification_status: 'none' | 'prepared' | 'sent' (Day5 알림 준비 엔진과 연결)
-- memo: 기타 자유 기록

-- 필드 의미 (message_logs)
-- care_task_id: 이 로그가 어떤 care_task와 연결되는지 (nullable — 일정과 무관한 로그도 가능)
-- message_time: 메시지가 발생한 시각
-- sender / receiver: 보낸 사람 / 받는 사람 텍스트 스냅샷
-- ai_parsed_json: AI 파싱 결과 원본(JSON) 보관
-- direction: 'inbound' | 'outbound'
-- source_channel: 'web' | 'kakao' | 'sms' 등
-- error_message: 발송/처리 실패 시 원인 기록

-- =========================================================
-- Day 8 Slice 1: notification_queue / delivery_attempts
-- =========================================================
-- 참고 문서: docs/PRD-day8-to-mvp-master-plan.md 4장, tasks/tasks-day8-notification-queue.md
-- 이 챕터부터는 알림을 "바로 보내지 않고" 먼저 큐(notification_queue)에 쌓고, 발송 시도 기록은
-- delivery_attempts에 남긴다. 이번 Slice는 실제 Provider 없이 MockDeliveryProvider만 붙는다.
-- 기존 테이블들과 동일하게 CHECK 제약 없이 text로 두고, 값 검증은 TypeScript Zod 스키마
-- (src/lib/silverlink/delivery/schema.ts)에서 담당한다.

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid not null references public.parent_profiles(id) on delete cascade,
  care_task_id uuid not null references public.care_tasks(id) on delete cascade,
  channel text not null,
  message_text text,
  response_token text unique,
  status text not null default 'pending',
  scheduled_for timestamptz,
  expires_at timestamptz,
  call_script text,
  call_goal text,
  max_attempts integer,
  preferred_call_window text,
  created_at timestamptz not null default now()
);

alter table public.notification_queue enable row level security;

create policy "notification_queue_select_own"
on public.notification_queue
for select
using (auth.uid() = owner_user_id);

create policy "notification_queue_insert_own"
on public.notification_queue
for insert
with check (auth.uid() = owner_user_id);

create policy "notification_queue_update_own"
on public.notification_queue
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "notification_queue_delete_own"
on public.notification_queue
for delete
using (auth.uid() = owner_user_id);

create table if not exists public.delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid not null references public.parent_profiles(id) on delete cascade,
  queue_id uuid not null references public.notification_queue(id) on delete cascade,
  provider text not null,
  channel text not null,
  request_payload jsonb,
  response_payload jsonb,
  status text not null default 'pending',
  external_message_id text,
  error_code text,
  error_message text,
  attempted_at timestamptz not null default now()
);

alter table public.delivery_attempts enable row level security;

create policy "delivery_attempts_select_own"
on public.delivery_attempts
for select
using (auth.uid() = owner_user_id);

create policy "delivery_attempts_insert_own"
on public.delivery_attempts
for insert
with check (auth.uid() = owner_user_id);

create policy "delivery_attempts_update_own"
on public.delivery_attempts
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "delivery_attempts_delete_own"
on public.delivery_attempts
for delete
using (auth.uid() = owner_user_id);

-- 필드 의미 (notification_queue)
-- care_task_id: 이 알림이 어떤 care_task에 대한 것인지 (not null — Day8 범위에서는 항상 특정 일정에 대한 알림만 다룸)
-- channel: 'link' | 'sms' | 'kakao_alimtalk' | 'voice_call' | 'web_push'
-- response_token: 어르신이 누를 링크용 토큰. Day8에서는 생성만 하고, 실제 검증/응답 처리는 Day9(/r/[token])에서 구현
-- status: 'pending' | 'prepared' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'responded'
-- call_script / call_goal / max_attempts / preferred_call_window: voice_call 채널 전용 확장 필드 (Day11~12에서 실제 사용)
-- call_goal: 'reminder' | 'wellbeing_check' | 'medication_check' | 'meal_check' | 'emergency_check'

-- 필드 의미 (delivery_attempts)
-- queue_id: 어떤 notification_queue 행에 대한 발송 시도인지
-- provider: 'mock' | 'twilio' | 'kakao_partner' | 'sms_provider' | 'vapi' | 'retell' (Day8에서는 'mock'만 실제 사용)
-- request_payload / response_payload: Provider에 보낸 요청과 받은 응답을 그대로 보관(디버깅/감사용)
-- status: 발송 시도 결과 ('sent' | 'failed' 등, 정확한 값 집합은 Provider 구현에 따름)
-- external_message_id: 외부 Provider가 발급한 메시지/통화 ID (Mock에서는 가짜 값)

-- =========================================================
-- Day 9: 어르신 링크 응답 (/r/[token]) — SECURITY DEFINER 함수
-- =========================================================
-- 참고 문서: docs/PRD-day8-to-mvp-master-plan.md 5장, tasks/tasks-day9-link-response.md
--
-- 어르신은 로그인하지 않으므로 anon(익명) 상태로 /r/[token]에 접근한다. notification_queue/care_tasks/
-- message_logs의 기존 RLS는 모두 auth.uid() = owner_user_id라서 anon 요청은 항상 막힌다(의도된 동작).
-- 익명 select/update를 허용하는 새 RLS 정책을 추가하지 않는다 — 그러면 공개된 anon key로 누구나 전체
-- 큐를 긁어갈 수 있다. 대신 "토큰을 정확히 아는 사람만" 지나갈 수 있는 SECURITY DEFINER 함수 2개만
-- anon에게 노출한다. 함수 내부는 파라미터로 받은 토큰과 정확히 일치하는 한 행만 다루도록 작성되어
-- 있어, RLS를 우회하면서도 다른 회원 데이터로 가는 길은 열어주지 않는다.

create or replace function public.get_notification_by_token(p_token text)
returns table (
  id uuid,
  channel text,
  message_text text,
  call_script text,
  status text,
  expires_at timestamptz,
  target_person text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select nq.id, nq.channel, nq.message_text, nq.call_script, nq.status, nq.expires_at, ct.target_person
  from public.notification_queue nq
  join public.care_tasks ct on ct.id = nq.care_task_id
  where nq.response_token = p_token;
end;
$$;

revoke all on function public.get_notification_by_token(text) from public;
grant execute on function public.get_notification_by_token(text) to anon, authenticated;

create or replace function public.respond_to_notification(p_token text, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue record;
  v_care_task_status text;
  v_response_label text;
begin
  if p_action not in ('completed', 'need_help', 'remind_later', 'wrong_target') then
    return jsonb_build_object('ok', false, 'error', 'invalid_action');
  end if;

  select * into v_queue from public.notification_queue where response_token = p_token;

  if v_queue is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_queue.expires_at is not null and v_queue.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  if v_queue.status = 'responded' then
    return jsonb_build_object('ok', false, 'error', 'already_responded');
  end if;

  v_care_task_status := case p_action
    when 'completed' then 'completed'
    when 'need_help' then 'help_requested'
    when 'remind_later' then 'snoozed'
    else null -- wrong_target: care_tasks 상태는 건드리지 않음
  end;

  v_response_label := case p_action
    when 'completed' then '완료했어요'
    when 'need_help' then '도움이 필요해요'
    when 'remind_later' then '나중에 다시 알려주세요'
    else '잘못 온 알림이에요'
  end;

  update public.notification_queue
  set status = 'responded'
  where id = v_queue.id;

  if v_care_task_status is not null then
    update public.care_tasks
    set status = v_care_task_status,
        completed_at = case when p_action = 'completed' then now() else completed_at end,
        child_notified = false
    where id = v_queue.care_task_id;
  end if;

  insert into public.message_logs (owner_user_id, parent_id, care_task_id, sender, receiver, raw_message, direction, status, source_channel)
  select ct.owner_user_id, ct.parent_id, ct.id, ct.target_person, '보호자', v_response_label, 'parent_response', 'received', v_queue.channel
  from public.care_tasks ct
  where ct.id = v_queue.care_task_id;

  return jsonb_build_object('ok', true, 'action', p_action, 'care_task_status', v_care_task_status);
end;
$$;

revoke all on function public.respond_to_notification(text, text) from public;
grant execute on function public.respond_to_notification(text, text) to anon, authenticated;

-- 함수 동작 요약
-- get_notification_by_token: 토큰과 정확히 일치하는 알림 1건(+표시용 target_person)만 반환. 0건이면 빈 결과.
-- respond_to_notification: 액션 검증 → 만료/중복응답 체크 → notification_queue.status='responded' →
--   care_tasks.status를 'completed'|'help_requested'|'snoozed'로 매핑(wrong_target은 변경 없음) +
--   child_notified=false(자녀에게 이 응답을 알릴 차례라는 표시) → message_logs에 direction='parent_response' 기록.
--   반환값 ok=false의 error: 'invalid_action' | 'not_found' | 'expired' | 'already_responded'

-- =========================================================
-- Day 11: AI 비서 안부전화 Mock (care_call_schedules / care_call_attempts)
-- =========================================================
-- 참고 문서: docs/PRD-day8-to-mvp-master-plan.md 7장, tasks/tasks-day11-care-call-mock.md
--
-- Day9의 /r/[token]과 달리, 이번 "Mock 전화"는 로그인한 자녀 본인이 화면에서 어르신 응답을
-- 시뮬레이션 버튼으로 대신 누르는 것이라 호출자가 항상 인증된 회원이다. 그래서 SECURITY DEFINER
-- 함수 없이 기존과 동일한 RLS(auth.uid() = owner_user_id)만으로 충분하다.

create table if not exists public.care_call_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid not null references public.parent_profiles(id) on delete cascade,
  enabled boolean not null default true,
  call_type text not null default 'wellbeing_check',
  schedule_time text,
  days_of_week text,
  preferred_channel text not null default 'voice_call',
  consent_status text not null default 'test_only',
  created_at timestamptz not null default now()
);

alter table public.care_call_schedules enable row level security;

create policy "care_call_schedules_select_own"
on public.care_call_schedules
for select
using (auth.uid() = owner_user_id);

create policy "care_call_schedules_insert_own"
on public.care_call_schedules
for insert
with check (auth.uid() = owner_user_id);

create policy "care_call_schedules_update_own"
on public.care_call_schedules
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "care_call_schedules_delete_own"
on public.care_call_schedules
for delete
using (auth.uid() = owner_user_id);

create table if not exists public.care_call_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid not null references public.parent_profiles(id) on delete cascade,
  care_task_id uuid references public.care_tasks(id) on delete set null,
  schedule_id uuid references public.care_call_schedules(id) on delete set null,
  provider text not null default 'mock',
  status text not null default 'prepared',
  call_script text,
  parent_response text,
  transcript text,
  summary text,
  risk_level text not null default 'none',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.care_call_attempts enable row level security;

create policy "care_call_attempts_select_own"
on public.care_call_attempts
for select
using (auth.uid() = owner_user_id);

create policy "care_call_attempts_insert_own"
on public.care_call_attempts
for insert
with check (auth.uid() = owner_user_id);

create policy "care_call_attempts_update_own"
on public.care_call_attempts
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "care_call_attempts_delete_own"
on public.care_call_attempts
for delete
using (auth.uid() = owner_user_id);

-- 필드 의미 (care_call_schedules) — 이번 Day는 테이블만 만들고 관리 UI는 만들지 않는다(Notes 참고)
-- call_type: 'wellbeing_check' | 'reminder_check' | 'medication_check'
-- consent_status: 'test_only' | 'consent_pending' | 'consent_granted'

-- 필드 의미 (care_call_attempts)
-- care_task_id / schedule_id: 둘 다 nullable — 어떤 일정/스케줄에서 비롯됐는지(즉석 Mock은 care_task_id만 채움)
-- provider: 'mock' | 'twilio' | 'vapi' | 'retell' (Day11에서는 'mock'만 사용)
-- status: 'prepared' | 'calling' | 'answered' | 'no_answer' | 'failed' | 'completed' | 'help_requested'
-- call_script: buildCallScript()가 만든 텍스트(opening+main_message+question 조립본)
-- risk_level: 'none' | 'low' | 'medium' | 'high' (응답 시뮬레이션 결과에 따라 결정)
