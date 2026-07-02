import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCareTasks } from "@/lib/supabase/care-tasks-repo";
import { listNotificationQueue, type NotificationQueueRow } from "@/lib/supabase/notification-queue-repo";
import { listMessageLogs, type MessageLogSummary } from "@/lib/supabase/message-logs-repo";
import { TasksClient } from "./tasks-client";

interface Props {
  searchParams: Promise<{ unsent?: string }>;
}

export default async function DashboardTasksPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialUnsentOnly = params.unsent === "1";

  const supabase = await createSupabaseServerClient();
  const [careTasks, queueRows, messageLogs] = await Promise.all([
    listCareTasks(supabase),
    listNotificationQueue(supabase),
    listMessageLogs(supabase),
  ]);

  const queueByCareTaskId: Record<string, NotificationQueueRow[]> = {};
  for (const entry of queueRows) {
    queueByCareTaskId[entry.care_task_id] ??= [];
    queueByCareTaskId[entry.care_task_id].push(entry);
  }

  const messageLogByCareTaskId: Record<string, MessageLogSummary> = {};
  for (const log of messageLogs) {
    if (log.care_task_id && !(log.care_task_id in messageLogByCareTaskId)) {
      messageLogByCareTaskId[log.care_task_id] = log;
    }
  }

  return (
    <TasksClient
      initialTasks={careTasks}
      initialQueueByCareTaskId={queueByCareTaskId}
      initialMessageLogByCareTaskId={messageLogByCareTaskId}
      initialUnsentOnly={initialUnsentOnly}
    />
  );
}
