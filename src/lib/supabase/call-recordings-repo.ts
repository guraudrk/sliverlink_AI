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

function extractParentName(p: any): { display_name: string | null; relation: string | null } {
  if (!p) return { display_name: null, relation: null };
  return {
    display_name: p.display_name ?? null,
    // 웹 스키마는 relationship, 모바일 스키마는 relation — 둘 다 시도
    relation: p.relation ?? p.relationship ?? null,
  };
}

export async function listCallRecordings(supabase: SupabaseClient): Promise<CallRecording[]> {
  const { data, error } = await supabase
    .from("call_recordings")
    .select(`*, parent_profiles ( * )`)
    .order("recorded_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map((r: any) => {
    const { display_name, relation } = extractParentName(r.parent_profiles);
    return { ...r, parent_display_name: display_name, parent_relation: relation };
  });
}

export async function getCallRecordingById(
  supabase: SupabaseClient,
  id: string
): Promise<CallRecording | null> {
  const { data, error } = await supabase
    .from("call_recordings")
    .select(`*, parent_profiles ( * )`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { display_name, relation } = extractParentName(data.parent_profiles);
  return { ...data, parent_display_name: display_name, parent_relation: relation };
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
