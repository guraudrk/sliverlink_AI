import rawCareTasks from "../../../../data/fixtures/care-tasks.day5.json";
import { careTaskSchema, type CareTask } from "./schema";

export function loadCareTaskFixtures(): CareTask[] {
  return careTaskSchema.array().parse(rawCareTasks);
}
