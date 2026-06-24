import type { CareTask } from "./schema";

export function buildOutboundMessage(task: CareTask): string {
  if (task.confirmation_message) {
    return task.confirmation_message;
  }

  return `${task.target_person}, ${task.task_title} 확인해주세요.`;
}
