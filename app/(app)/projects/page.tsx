import { requireSession } from "@/app/lib/auth/session";
import { ProjectsOverview } from "@/app/components/projects/projects-overview";

export default async function ProjectsPage() {
  await requireSession();
  return <ProjectsOverview />;
}
