import type { CareTask } from "./schema";

export function isDueTask(task: CareTask, now: Date): boolean {
  if (task.status !== "scheduled") return false;
  if (task.parent_notified) return false;
  if (!task.task_datetime) return false;

  return new Date(task.task_datetime) <= now;
}
