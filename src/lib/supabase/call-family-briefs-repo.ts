import type { SupabaseClient } from "@supabase/supabase-js";
import type { FamilyBriefMindPoint, FamilyBriefConversationStarter } from "@/lib/silverlink/calls/family-brief-generator";

export type CallFamilyBrief = {
  id: string;
  call_id: string;
  elder_id: string;
  owner_user_id: string;
  mind_points: FamilyBriefMindPoint[];
  conversation_starters: FamilyBriefConversationStarter[];
  attention_item: string | null;
  generated_at: string;
  read_at: string | null;
};

type CallFamilyBriefInsert = {
  call_id: string;
  elder_id: string;
  owner_user_id: string;
  mind_points: FamilyBriefMindPoint[];
  conversation_starters: FamilyBriefConversationStarter[];
  attention_item: string | null;
};

export async function createCallFamilyBrief(
  supabase: SupabaseClient,
  input: CallFamilyBriefInsert
): Promise<CallFamilyBrief> {
  const { data, error } = await supabase
    .from("call_family_briefs")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as CallFamilyBrief;
}

export async function getCallFamilyBrief(
  supabase: SupabaseClient,
  callId: string
): Promise<CallFamilyBrief | null> {
  const { data, error } = await supabase
    .from("call_family_briefs")
    .select("*")
    .eq("call_id", callId)
    .maybeSingle();
  if (error) throw error;
  return data as CallFamilyBrief | null;
}

export async function markBriefAsRead(
  supabase: SupabaseClient,
  callId: string
): Promise<void> {
  const { error } = await supabase
    .from("call_family_briefs")
    .update({ read_at: new Date().toISOString() })
    .eq("call_id", callId)
    .is("read_at", null);
  if (error) throw error;
}

export async function countUnreadBriefs(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("call_family_briefs")
    .select("*", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}
