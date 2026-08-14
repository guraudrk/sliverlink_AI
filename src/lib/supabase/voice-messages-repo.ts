import type { SupabaseClient } from "@supabase/supabase-js";

export interface VoiceMessage {
  id: string;
  sender_user_id: string;
  parent_id: string;
  storage_path: string;
  duration_sec: number;
  mime_type: string;
  is_played: boolean;
  played_at: string | null;
  created_at: string;
}

export async function insertVoiceMessage(
  supabase: SupabaseClient,
  senderUserId: string,
  parentId: string,
  storagePath: string,
  durationSec: number,
  mimeType: string
): Promise<VoiceMessage> {
  const { data, error } = await supabase
    .from("voice_messages")
    .insert({
      sender_user_id: senderUserId,
      parent_id: parentId,
      storage_path: storagePath,
      duration_sec: durationSec,
      mime_type: mimeType,
    })
    .select()
    .single();

  if (error) throw error;
  return data as VoiceMessage;
}

export async function listVoiceMessages(
  supabase: SupabaseClient,
  parentId: string
): Promise<VoiceMessage[]> {
  const { data, error } = await supabase
    .from("voice_messages")
    .select("*")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data ?? []) as VoiceMessage[];
}

export async function deleteVoiceMessage(
  supabase: SupabaseClient,
  messageId: string,
  storagePath: string
): Promise<void> {
  await supabase.storage.from("voice-messages").remove([storagePath]);
  const { error } = await supabase
    .from("voice_messages")
    .delete()
    .eq("id", messageId);
  if (error) throw error;
}
