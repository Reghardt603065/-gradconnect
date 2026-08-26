import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProjectForUser } from "@/services/project-service";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/project-form";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "COMPANY") redirect("/projects");

  const { id } = await params;
  let project;
  try {
    project = await getProjectForUser(id, session.user.id);
  } catch {
    notFound();
  }

  if (!project.owner) redirect("/projects");

  return <>
    <PageHeader title="Edit project" description="Update the details of your project opportunity." />
    <ProjectForm initial={{
      id: project.id,
      title: project.title,
      category: project.category,
      summary: project.summary,
      description: project.description ?? "",
      requirements: project.requirements ?? "",
      expectedOutcome: project.expectedOutcome ?? "",
      technologies: project.technologies,
      contactEmail: project.contactEmail ?? "",
      contactPhone: project.contactPhone ?? "",
      githubUrl: project.githubUrl ?? "",
      liveDemoUrl: project.liveDemoUrl ?? "",
      maxParticipants: project.maxParticipants,
    }} />
  </>;
}
