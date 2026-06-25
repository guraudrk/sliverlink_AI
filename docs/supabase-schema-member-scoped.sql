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
