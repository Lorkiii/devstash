import { requireSession } from "@/app/lib/auth/session";
import { ProjectDetail } from "@/app/components/projects/project-detail";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  return <ProjectDetail projectId={id} />;
}
