import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCallRecordings } from "@/lib/supabase/call-recordings-repo";
import { CallsClient } from "./calls-client";

export const dynamic = "force-dynamic";

export default async function DashboardCallsPage() {
  const supabase = await createSupabaseServerClient();

  let recordings: Awaited<ReturnType<typeof listCallRecordings>> = [];
  try {
    recordings = await listCallRecordings(supabase);
  } catch (err) {
    console.error("[calls/page] listCallRecordings 실패:", err);
  }

  return <CallsClient initialRecordings={recordings} />;
}
