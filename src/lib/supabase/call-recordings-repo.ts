import type { SupabaseClient } from "@supabase/supabase-js";

export type CallRecording = {
  id: string;
  owner_user_id: string;
  parent_id: string;
  storage_path: string | null;
  audio_url: string | null;
  duration_sec: number | null;
  file_size_bytes: number | null;
  recorded_at: string;
  status: "pending" | "transcribing" | "analyzed" | "failed";
  transcript: string | null;
  ai_summary: string | null;
  risk_level: "none" | "low" | "medium" | "high" | null;
  created_at: string;
  parent_display_name?: string;
  parent_relation?: string;
};

export async function listCallRecordings(supabase: SupabaseClient): Promise<CallRecording[]> {
  const { data, error } = await supabase
    .from("call_recordings")
    .select(`
      *,
      parent_profiles ( display_name, relation )
    `)
    .order("recorded_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    ...r,
    parent_display_name: r.parent_profiles?.display_name ?? null,
    parent_relation: r.parent_profiles?.relation ?? null,
  }));
}

export async function getCallRecordingById(
  supabase: SupabaseClient,
  id: string
): Promise<CallRecording | null> {
  const { data, error } = await supabase
    .from("call_recordings")
    .select(`*, parent_profiles ( display_name, relation )`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    parent_display_name: data.parent_profiles?.display_name ?? null,
    parent_relation: data.parent_profiles?.relation ?? null,
  };
}

export async function updateCallRecordingAnalysis(
  supabase: SupabaseClient,
  id: string,
  update: {
    status: CallRecording["status"];
    transcript?: string;
    ai_summary?: string;
    risk_level?: CallRecording["risk_level"];
  }
): Promise<void> {
  const { error } = await supabase
    .from("call_recordings")
    .update(update)
    .eq("id", id);

  if (error) throw error;
}
