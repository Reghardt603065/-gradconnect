import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProjectForUser } from "@/services/project-service";
import { PageHeader } from "@/components/page-header";
import { ProjectDetail } from "@/components/project-detail";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string; }>; }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  try {
    const project = await getProjectForUser(id, session.user.id);
    return <>
      <PageHeader
        title="Project opportunity"
        description={project.subscribed || project.owner ? "Project details and access information." : "Review the opportunity before deciding whether to subscribe."}
      />
      <ProjectDetail project={project} />
    </>;
  } catch {
    notFound();
  }
}
