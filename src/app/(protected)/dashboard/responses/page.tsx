import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listMessageLogs } from "@/lib/supabase/message-logs-repo";
import { listCareTasks, type CareTaskSummary } from "@/lib/supabase/care-tasks-repo";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import { ResponsesClient } from "./responses-client";

export default async function DashboardResponsesPage() {
  const supabase = await createSupabaseServerClient();
  const [messageLogs, careTasks, parentProfiles] = await Promise.all([
    listMessageLogs(supabase),
    listCareTasks(supabase),
    listParentProfiles(supabase),
  ]);

  const responses = messageLogs.filter((log) => log.direction === "parent_response");

  const careTaskById: Record<string, CareTaskSummary> = {};
  for (const task of careTasks) careTaskById[task.id] = task;

  return (
    <ResponsesClient
      initialResponses={responses}
      careTaskById={careTaskById}
      parentProfiles={parentProfiles}
    />
  );
}
