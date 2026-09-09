import { requireSession } from "@/app/lib/auth/session";
import { TaskList } from "@/app/components/tasks/task-list";

export default async function TasksPage() {
  await requireSession();
  return <TaskList />;
}
