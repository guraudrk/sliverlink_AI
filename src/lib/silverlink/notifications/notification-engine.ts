import { getRequestedAt } from "../time";
import { isDueTask } from "./due-task";
import { buildOutboundMessage } from "./message-builder";
import type { CareTask } from "./schema";

export type OutboundLogCandidate = {
  direction: "outbound";
  status: "prepared";
  source_channel: "system";
  receiver: string;
  raw_message: string;
  related_task: string;
};

export type TaskUpdatePatch = {
  parent_notified: true;
  notification_status: "prepared";
  last_notification_at: string;
};

export type NotificationPreparation = {
  taskId: string;
  taskTitle: string;
  outboundLogCandidate: OutboundLogCandidate;
  taskUpdatePatch: TaskUpdatePatch;
};

export function prepareNotification(task: CareTask, now: Date): NotificationPreparation | null {
  if (!isDueTask(task, now)) {
    return null;
  }

  return {
    taskId: task.id,
    taskTitle: task.task_title,
    outboundLogCandidate: {
      direction: "outbound",
      status: "prepared",
      source_channel: "system",
      receiver: task.target_person,
      raw_message: buildOutboundMessage(task),
      related_task: task.id,
    },
    taskUpdatePatch: {
      parent_notified: true,
      notification_status: "prepared",
      last_notification_at: getRequestedAt(now),
    },
  };
}

export function prepareNotifications(tasks: CareTask[], now: Date): NotificationPreparation[] {
  return tasks
    .map((task) => prepareNotification(task, now))
    .filter((result): result is NotificationPreparation => result !== null);
}
