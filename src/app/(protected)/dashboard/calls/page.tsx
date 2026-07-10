import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCallRecordings } from "@/lib/supabase/call-recordings-repo";
import { CallsClient } from "./calls-client";

export const dynamic = "force-dynamic";

export default async function DashboardCallsPage() {
  const supabase = await createSupabaseServerClient();
  const recordings = await listCallRecordings(supabase);

  return <CallsClient initialRecordings={recordings} />;
}
