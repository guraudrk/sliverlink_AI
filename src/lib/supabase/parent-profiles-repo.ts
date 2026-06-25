import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const NOTIFICATION_PREFERENCE_OPTIONS = ["none", "sms", "kakao"] as const;

export const parentProfileInputSchema = z.object({
  display_name: z.string().trim().min(1, "display_name은 비어 있을 수 없습니다."),
  relationship: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  notification_preference: z.enum(NOTIFICATION_PREFERENCE_OPTIONS).optional(),
  care_context: z.string().trim().optional(),
  daily_routine: z.string().trim().optional(),
  medication_notes: z.string().trim().optional(),
  communication_style: z.string().trim().optional(),
  memo: z.string().trim().optional(),
});

export type ParentProfileInput = z.infer<typeof parentProfileInputSchema>;

export type ParentProfile = ParentProfileInput & {
  id: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

// /api/care-calls/preview에서 call_script 생성에 쓴다. RLS가 select를 owner_user_id 기준으로
// 이미 걸러주므로, "0건이면 내 소유가 아니다"로 소유권을 함께 확인한다.
export async function getParentProfileById(supabase: SupabaseClient, id: string): Promise<ParentProfile | null> {
  const { data, error } = await supabase.from("parent_profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ParentProfile | null;
}

export async function listParentProfiles(supabase: SupabaseClient): Promise<ParentProfile[]> {
  const { data, error } = await supabase
    .from("parent_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ParentProfile[];
}

// owner_user_id는 항상 서버가 인증된 user.id로 설정한다 — 호출자가 별도로 owner_user_id를 넘길 수 없는 시그니처로 강제한다.
export async function createParentProfile(
  supabase: SupabaseClient,
  ownerUserId: string,
  input: ParentProfileInput
): Promise<ParentProfile> {
  const { data, error } = await supabase
    .from("parent_profiles")
    .insert({ ...input, owner_user_id: ownerUserId })
    .select("*")
    .single();

  if (error) throw error;
  return data as ParentProfile;
}

// owner_user_id는 절대 update 대상에 포함하지 않는다 — RLS의 update policy(`auth.uid() = owner_user_id`)가
// 남의 행이면 0건을 갱신하도록 막아주므로, 그 결과(.single()이 못 찾으면 에러)로 소유권 위반을 자연히 거부한다.
export async function updateParentProfile(
  supabase: SupabaseClient,
  id: string,
  input: ParentProfileInput
): Promise<ParentProfile> {
  const { data, error } = await supabase
    .from("parent_profiles")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as ParentProfile;
}
