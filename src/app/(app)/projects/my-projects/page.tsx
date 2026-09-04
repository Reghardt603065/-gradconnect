import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudentProjects } from "@/services/subscription-service";
import { PageHeader } from "@/components/page-header";

export default async function MyProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "GRADUATE") redirect("/dashboard/company");
  const subscriptions = await getStudentProjects(session.user.id);

  return <>
    <PageHeader
      title="My projects"
      description="Projects you have joined, including the requirements and company information unlocked through your subscription." />
    {!subscriptions.length ? (
      <div className="card empty">You have not joined any projects yet. <Link href="/projects" className="link">Browse project opportunities</Link></div>
    ) : (
      <div className="grid grid-2">
        {subscriptions.map((subscription) => {
          const project = subscription.project;
          return <article className="card" key={subscription.id}>
            <div className="tags">
              <span className="badge gold">{project.category}</span>
              <span className={`badge ${subscription.status === "COMPLETED" ? "green" : "blue"}`}>
                {subscription.status === "COMPLETED" ? "Completed" : "Joined"}
              </span>
            </div>
            <h2 style={{ marginBottom: 5 }}>{project.title}</h2>
            <strong>{project.company.name}</strong>
            <p className="muted">{project.summary}</p>
            <div className="tags">
              {project.technologies.map((technology) => <span className="badge" key={technology}>{technology}</span>)}
            </div>
            <div className="job-actions" style={{ marginTop: 16 }}>
              <Link href={`/projects/${project.id}`} className="btn btn-primary btn-small">View project</Link>
            </div>
          </article>;
        })}
      </div>
    )}
  </>;
}
