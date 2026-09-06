import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCompanyForUser } from "@/services/project-service";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/project-form";

export default async function CreateProjectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "COMPANY") redirect("/projects");
  const company = await getCompanyForUser(session.user.id);
  if (!company) {
    return <>
      <PageHeader
        title="Post a project"
        description="Create a company profile first, then publish your project opportunity." />
      <div className="card">
        <h2>Company profile required</h2>
        <p className="muted">Set up the company details that students will see alongside your projects.</p>
        <Link className="btn btn-primary" href="/companies/register">Register company</Link>
      </div>
    </>;
  }
  return <>
    <PageHeader
      title="Post a project"
      description={`Create a real-world project opportunity for students on behalf of ${company.name}.`} />
    <ProjectForm defaultContactEmail={company.email} />
  </>;
}
