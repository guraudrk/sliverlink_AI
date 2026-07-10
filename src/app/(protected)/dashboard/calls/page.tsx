import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCallRecordings } from "@/lib/supabase/call-recordings-repo";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import { CallsClient } from "./calls-client";

export const dynamic = "force-dynamic";

export default async function DashboardCallsPage() {
  const supabase = await createSupabaseServerClient();

  const [recordings, parents] = await Promise.all([
    listCallRecordings(supabase).catch((err) => {
      console.error("[calls/page] listCallRecordings 실패:", err);
      return [];
    }),
    listParentProfiles(supabase).catch(() => []),
  ]);

  return <CallsClient initialRecordings={recordings} parents={parents} />;
}
