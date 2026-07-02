import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import { ParentsClient } from "./parents-client";

export default async function ParentsPage() {
  const supabase = await createSupabaseServerClient();
  const profiles = await listParentProfiles(supabase);

  return <ParentsClient initialProfiles={profiles} />;
}
