import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpen, Plus } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { ProjectBrowser } from "@/components/project-browser";
import { CompanyProjectManager } from "@/components/company-project-manager";
import { getCompanyProjects } from "@/services/project-service";

export default async function ProjectsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role === "COMPANY") {
    const { company, projects } =
      await getCompanyProjects(
        session.user.id
      );

    return (
      <>
        <PageHeader
          title="Your projects"
          description={
            company
              ? `Post and manage project opportunities for ${company.name}.`
              : "Set up your company profile before posting project opportunities."
          }
          action={
            <div className="job-actions">
              <Link
                href="/companies/register"
                className="btn btn-secondary"
              >
                Company profile
              </Link>

              <Link
                href="/projects/create"
                className="btn btn-primary"
              >
                <Plus size={17} />
                Post a project
              </Link>
            </div>
          }
        />

        {!company ? (
          <div className="card">
            <h2>
              Company profile required
            </h2>

            <p className="muted">
              Create your company profile
              before posting projects.
            </p>

            <Link
              href="/companies/register"
              className="btn btn-primary"
            >
              Set up company profile
            </Link>
          </div>
        ) : (
          <CompanyProjectManager
            projects={projects}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Project opportunities"
        description="Discover real-world projects posted by companies and subscribe to opportunities that match your interests and skills."
        action={
          <Link
            href="/projects/my-projects"
            className="btn btn-secondary"
          >
            <FolderOpen size={17} />
            My projects
          </Link>
        }
      />

      <ProjectBrowser />
    </>
  );
}
