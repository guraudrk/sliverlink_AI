import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listDeliveryAttempts } from "@/lib/supabase/delivery-attempts-repo";
import { listParentProfiles, type ParentProfile } from "@/lib/supabase/parent-profiles-repo";
import { DeliveriesClient } from "./deliveries-client";

export default async function DashboardDeliveriesPage() {
  const supabase = await createSupabaseServerClient();
  const [attempts, profiles] = await Promise.all([
    listDeliveryAttempts(supabase),
    listParentProfiles(supabase),
  ]);

  const parentById: Record<string, ParentProfile> = {};
  for (const p of profiles) parentById[p.id] = p;

  return <DeliveriesClient initialAttempts={attempts} parentById={parentById} />;
}
