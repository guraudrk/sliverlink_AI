import type { SupabaseClient } from "@supabase/supabase-js";
import type { SafetyAlertCategory, SafetyAlertSeverity, SafetyAlertItem } from "@/lib/silverlink/calls/safety-alert-analyzer";

export type SafetyAlert = {
  id: string;
  call_id: string;
  elder_id: string;
  owner_user_id: string;
  category: SafetyAlertCategory;
  severity: SafetyAlertSeverity;
  title: string;
  description: string;
  suggestion: string | null;
  acknowledged_at: string | null;
  generated_at: string;
};

type SafetyAlertInsert = {
  call_id: string;
  elder_id: string;
  owner_user_id: string;
} & SafetyAlertItem;

export async function createSafetyAlerts(
  supabase: SupabaseClient,
  inserts: SafetyAlertInsert[]
): Promise<SafetyAlert[]> {
  if (inserts.length === 0) return [];
  const { data, error } = await supabase
    .from("safety_alerts")
    .insert(inserts)
    .select("*");
  if (error) throw error;
  return data as SafetyAlert[];
}

export async function listSafetyAlerts(
  supabase: SupabaseClient,
  options: { unacknowledgedOnly?: boolean } = {}
): Promise<SafetyAlert[]> {
  let query = supabase
    .from("safety_alerts")
    .select("*")
    .order("generated_at", { ascending: false });

  if (options.unacknowledgedOnly) {
    query = query.is("acknowledged_at", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SafetyAlert[];
}

export async function acknowledgeSafetyAlert(
  supabase: SupabaseClient,
  alertId: string
): Promise<SafetyAlert> {
  const { data, error } = await supabase
    .from("safety_alerts")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", alertId)
    .is("acknowledged_at", null)
    .select("*")
    .single();
  if (error) throw error;
  return data as SafetyAlert;
}

export async function countUnacknowledgedAlerts(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("safety_alerts")
    .select("*", { count: "exact", head: true })
    .is("acknowledged_at", null);
  if (error) return 0;
  return count ?? 0;
}
