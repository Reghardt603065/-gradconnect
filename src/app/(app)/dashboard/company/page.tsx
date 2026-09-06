import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Plus,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import {
  getCompanyDashboardActivity,
  getCompanyProjects,
} from "@/services/project-service";
import { PageHeader } from "@/components/page-header";

export default async function CompanyDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "COMPANY") {
    redirect("/projects");
  }

  const [{ company, projects }, activity] =
    await Promise.all([
      getCompanyProjects(session.user.id),
      getCompanyDashboardActivity(
        session.user.id
      ),
    ]);

  if (!company) {
    return (
      <>
        <PageHeader
          title="Company dashboard"
          description="Manage projects and see student participation."
        />

        <div className="card">
          <h2>Set up your company</h2>

          <p className="muted">
            Create a company profile before posting
            project opportunities.
          </p>

          <Link
            className="btn btn-primary"
            href="/companies/register"
          >
            Register company
          </Link>
        </div>
      </>
    );
  }

  const activeSubscribers =
    projects.reduce(
      (sum, project) =>
        sum +
        project.subscriptions.filter(
          (subscription) =>
            subscription.status === "ACTIVE"
        ).length,
      0
    );

  const activeProjects =
    projects.filter(
      (project) =>
        project.status === "ACTIVE"
    ).length;

  const fullProjects =
    projects.filter(
      (project) =>
        project.status === "FULL"
    ).length;

  const completedProjects =
    projects.filter(
      (project) =>
        project.status === "CLOSED"
    ).length;

  function formatActivityDate(
    date: Date
  ) {
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(date);
  }

  return (
    <>
      <PageHeader
        title="Company dashboard"
        description={`Manage project opportunities for ${company.name}.`}
        action={
          <Link
            className="btn btn-primary"
            href="/projects/create"
          >
            <Plus size={17} />
            Post project
          </Link>
        }
      />

      <section className="grid company-stat-grid">
        <article className="card stat-card">
          <div>
            <div className="stat-value">
              {projects.length}
            </div>

            <div className="stat-label">
              Projects posted
            </div>
          </div>

          <span className="icon-box">
            <Building2 size={21} />
          </span>
        </article>

        <article className="card stat-card">
          <div>
            <div className="stat-value">
              {activeSubscribers}
            </div>

            <div className="stat-label">
              Active subscribers
            </div>
          </div>

          <span className="icon-box">
            <Users size={21} />
          </span>
        </article>

        <article className="card stat-card">
          <div>
            <div className="stat-value">
              {activeProjects}
            </div>

            <div className="stat-label">
              Active projects
            </div>

            {fullProjects > 0 && (
              <span className="helper">
                {fullProjects} full
              </span>
            )}
          </div>

          <span className="icon-box">
            <Plus size={21} />
          </span>
        </article>

        <article className="card stat-card">
          <div>
            <div className="stat-value">
              {completedProjects}
            </div>

            <div className="stat-label">
              Completed projects
            </div>
          </div>

          <span className="icon-box">
            <CheckCircle2 size={21} />
          </span>
        </article>
      </section>

      <section
        className="grid grid-2"
        style={{ marginTop: 18 }}
      >
        <article className="card">
          <div
            className="list-item"
            style={{
              alignItems: "flex-start",
            }}
          >
            <div>
              <h2>Recent activity</h2>

              <p className="muted">
                Keep track of recent activity
                across your projects.
              </p>
            </div>
          </div>

          {activity.length === 0 ? (
            <div
              className="card empty"
              style={{ marginTop: 14 }}
            >
              <p className="muted">
                No recent project activity yet.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 0,
                marginTop: 14,
              }}
            >
              {activity.map((item) => {
                let text = "";

                if (
                  item.type ===
                  "PROJECT_CREATED"
                ) {
                  text = `Project "${item.projectTitle}" was posted.`;
                } else if (
                  item.status === "ACTIVE" &&
                  item.studentName
                ) {
                  text = `${item.studentName} subscribed to "${item.projectTitle}".`;
                } else if (
                  item.status ===
                    "COMPLETED" &&
                  item.studentName
                ) {
                  text = `${item.studentName}'s participation in "${item.projectTitle}" was completed.`;
                } else if (
                  item.status ===
                    "WITHDRAWN" &&
                  item.studentName
                ) {
                  text = `${item.studentName} withdrew from "${item.projectTitle}".`;
                } else {
                  text = `Activity recorded for "${item.projectTitle}".`;
                }

                return (
                  <div
                    key={item.id}
                    style={{
                      padding:
                        "12px 0",
                      borderBottom:
                        "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <strong>
                        {text}
                      </strong>
                    </div>

                    <span className="muted">
                      {formatActivityDate(
                        item.date
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="card">
          <div
            className="list-item"
            style={{
              alignItems: "flex-start",
            }}
          >
            <div>
              <h2>
                Project performance
              </h2>

              <p className="muted">
                See how students are
                participating in your projects.
              </p>
            </div>
          </div>

          {projects.length === 0 ? (
            <div
              className="card empty"
              style={{
                marginTop: 14,
              }}
            >
              <p className="muted">
                Post a project to start
                tracking performance.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 18,
                marginTop: 16,
              }}
            >
              {projects.map((project) => {
                const activeCount =
                  project.subscriptions.filter(
                    (subscription) =>
                      subscription.status ===
                      "ACTIVE"
                  ).length;

                const completedCount =
                  project.subscriptions.filter(
                    (subscription) =>
                      subscription.status ===
                      "COMPLETED"
                  ).length;

                const percentage =
                  project.maxParticipants > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (activeCount /
                            project.maxParticipants) *
                            100
                        )
                      )
                    : 0;

                const statusLabel =
                  project.status === "ACTIVE"
                    ? "Active"
                    : project.status === "FULL"
                      ? "Full"
                      : "Completed";

                const statusClass =
                  project.status ===
                  "ACTIVE"
                    ? "green"
                    : project.status ===
                        "FULL"
                      ? "blue"
                      : "gold";

                return (
                  <div
                    key={project.id}
                    style={{
                      paddingBottom: 16,
                      borderBottom:
                        "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="list-item"
                      style={{
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <strong>
                          {project.title}
                        </strong>

                        <div className="muted">
                          {project.category}
                        </div>
                      </div>

                      <span
                        className={`badge ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {project.status ===
                    "CLOSED" ? (
                      <div className="muted">
                        {completedCount}{" "}
                        completed{" "}
                        participant
                        {completedCount === 1
                          ? ""
                          : "s"}
                      </div>
                    ) : (
                      <>
                        <div className="progress">
                          <span
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <div
                          className="muted"
                          style={{
                            marginTop: 6,
                          }}
                        >
                          {activeCount} /{" "}
                          {
                            project.maxParticipants
                          }{" "}
                          students subscribed
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </>
  );
}
