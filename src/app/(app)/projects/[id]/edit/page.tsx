import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProjectForUser } from "@/services/project-service";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/project-form";

function toSastDateTimeInput(value: Date | string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const valueFor = (type: "year" | "month" | "day" | "hour" | "minute") =>
    parts.find((part) => part.type === type)?.value || "";

  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}T${valueFor("hour")}:${valueFor("minute")}`;
}

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
      teamsMeetingUrl: project.teamsMeetingUrl ?? "",
      teamsMeetingAt: toSastDateTimeInput(project.teamsMeetingAt),
      maxParticipants: project.maxParticipants,
    }} />
  </>;
}
