"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";

type Project = {
  id: string;
  title: string;
  category: string;
  summary: string;
  technologies: string[];
  status: "ACTIVE" | "FULL" | "CLOSED";
  maxParticipants: number;
  subscriptions: {
    id: string;
    status: "ACTIVE" | "COMPLETED" | "WITHDRAWN";
  }[];
};

export function CompanyProjectManager({
  projects,
}: {
  projects: Project[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          projects.map(
            (project) => project.category
          )
        )
      ).sort(),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        project.title
          .toLowerCase()
          .includes(query) ||
        project.summary
          .toLowerCase()
          .includes(query) ||
        project.technologies.some(
          (technology) =>
            technology
              .toLowerCase()
              .includes(query)
        );

      const matchesStatus =
        !status ||
        project.status === status;

      const matchesCategory =
        !category ||
        project.category === category;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    projects,
    search,
    status,
    category,
  ]);

  return (
    <>
      <div
        className="card"
        style={{ marginBottom: 18 }}
      >
        <div className="company-project-filter-grid">
          <div className="field">
            <label htmlFor="company-project-search">
              Search
            </label>

            <div
              style={{
                position: "relative",
              }}
            >
              <Search
                size={17}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                }}
              />

              <input
                id="company-project-search"
                className="input"
                style={{
                  paddingLeft: 34,
                }}
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search your projects..."
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="company-project-status">
              Status
            </label>

            <select
              id="company-project-status"
              className="select"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value
                )
              }
            >
              <option value="">
                All statuses
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="FULL">
                Full
              </option>

              <option value="CLOSED">
                Closed
              </option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="company-project-category">
              Category
            </label>

            <select
              id="company-project-category"
              className="select"
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
            >
              <option value="">
                All categories
              </option>

              {categories.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>

      <div
  style={{
    marginBottom: 14,
  }}
>
  <h2>Your posted projects</h2>

  <p className="muted">
    {filteredProjects.length} of{" "}
    {projects.length} projects shown.
  </p>
</div>

      {filteredProjects.length === 0 ? (
        <div className="card empty">
          <h2>
            {projects.length === 0
              ? "No projects yet"
              : "No projects match your filters"}
          </h2>

          <p className="muted">
            {projects.length === 0
              ? "Create your first project opportunity to start connecting with students."
              : "Try changing your search or filters."}
          </p>

          {projects.length === 0 && (
            <Link
              href="/projects/create"
              className="btn btn-primary"
            >
              <Plus size={17} />
              Create your first project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-2">
          {filteredProjects.map(
            (project) => {
              const subscribed =
                project.subscriptions.filter(
                  (subscription) => subscription.status === "ACTIVE"
                ).length;

              const statusLabel =
                project.status === "ACTIVE"
                  ? "Active"
                  : project.status === "FULL"
                    ? "Full"
                    : "Closed";

              const statusClass =
                project.status ===
                "ACTIVE"
                  ? "green"
                  : project.status ===
                      "FULL"
                    ? "blue"
                    : "red";

              return (
                <article
                  className="card"
                  key={project.id}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      alignItems:
                        "flex-start",
                    }}
                  >
                    <div>
                      <span className="badge gold">
                        {project.category}
                      </span>

                      <h2
                        style={{
                          margin:
                            "10px 0 4px",
                        }}
                      >
                        {project.title}
                      </h2>
                    </div>

                    <span
                      className={`badge ${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <p
                    className="muted"
                    style={{
                      lineHeight: 1.65,
                      marginTop: 12,
                    }}
                  >
                    {project.summary}
                  </p>

                  {project.technologies.length >
                    0 && (
                    <div className="tags">
                      {project.technologies.map(
                        (technology) => (
                          <span
                            className="badge"
                            key={technology}
                          >
                            {technology}
                          </span>
                        )
                      )}
                    </div>
                  )}

                  <div
                    className="list-item"
                    style={{
                      marginTop: 18,
                    }}
                  >
                    <span
                      className="muted"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <Users size={15} />
                      {subscribed} /{" "}
                      {project.maxParticipants}{" "}
                      subscribed
                    </span>

                    <Link
                      className="btn btn-primary btn-small"
                      href={`/projects/${project.id}`}
                    >
                      View project
                    </Link>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </>
  );
}