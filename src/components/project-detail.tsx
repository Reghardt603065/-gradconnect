"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Linkedin,
  Mail,
  Phone,
} from "lucide-react";
import Link from "next/link";

type Project = {
  id: string;
  title: string;
  category: string;
  summary: string;
  description?: string;
  requirements?: string;
  expectedOutcome?: string | null;
  technologies: string[];
  contactEmail?: string | null;
  contactPhone?: string | null;
  githubUrl?: string | null;
  liveDemoUrl?: string | null;
  status: "ACTIVE" | "FULL" | "CLOSED";
  availableSpaces: number;
  maxParticipants: number;
  company: {
    name: string;
    website?: string | null;
    linkedinUrl?: string | null;
  };
  subscribed: boolean;
  owner: boolean;
};

export function ProjectDetail({
  project,
}: {
  project: Project;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(project.status);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error"
  >("success");

  async function subscription(
    method: "POST" | "DELETE"
  ) {
    setBusy(true);
    setMessage("");

    const response = await fetch(
      `/api/projects/${project.id}/subscription`,
      {
        method,
      }
    );

    const body = await response.json();

    if (!response.ok) {
      setMessage(
        body.error || "Something went wrong."
      );
      setMessageType("error");
      setBusy(false);
      return;
    }

    router.refresh();
    setBusy(false);
  }

  async function updateStatus(
    nextStatus: "ACTIVE" | "CLOSED"
  ) {
    setBusy(true);
    setMessage("");

    const response = await fetch(
      `/api/projects/${project.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      }
    );

    const body = await response.json();

    if (!response.ok) {
      setMessage(
        body.error ||
          "Could not update project status."
      );
      setMessageType("error");
      setBusy(false);
      return;
    }

    setStatus(body.data.status);

    setMessage(
      nextStatus === "CLOSED"
        ? "Project closed successfully."
        : "Project reopened successfully."
    );

    setMessageType("success");

    router.refresh();
    setBusy(false);
  }

  const statusLabel =
    status === "ACTIVE"
      ? "Active"
      : status === "FULL"
        ? "Full"
        : "Closed";

  const statusClass =
    status === "ACTIVE"
      ? "green"
      : status === "FULL"
        ? "blue"
        : "red";

  return (
    <>
      <Link
        href="/projects"
        className="link"
        style={{
          display: "inline-flex",
          gap: 7,
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <ArrowLeft size={16} />
        Back to projects
      </Link>

      <section className="banner">
        <div
          className="eyebrow"
          style={{ color: "#e8d6a4" }}
        >
          {project.category}
        </div>

        <h1
          style={{
            margin: "8px 0",
            fontSize:
              "clamp(2rem,4vw,3.4rem)",
          }}
        >
          {project.title}
        </h1>

        <p>{project.summary}</p>
      </section>

      {message && (
        <div
          className={`form-message ${messageType}`}
          style={{ marginBottom: 18 }}
        >
          {message}
        </div>
      )}

      <div className="grid grid-3">
        <div className="card grid-span-2">
          <h2>Project overview</h2>

          <h3>Description</h3>

          <p
            className="muted"
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.75,
            }}
          >
            {project.description}
          </p>

          <h3>Requirements</h3>

          <p
            className="muted"
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.75,
            }}
          >
            {project.requirements}
          </p>

          {project.expectedOutcome && (
            <>
              <h3>Expected outcome</h3>

              <p
                className="muted"
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.75,
                }}
              >
                {project.expectedOutcome}
              </p>
            </>
          )}

          <h3 style={{ marginTop: 24 }}>
            Technologies
          </h3>

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
        </div>

        <aside className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <h3 style={{ margin: 0 }}>
              Project details
            </h3>

            {project.owner && (
              <Link
                href={`/projects/${project.id}/edit`}
                className="btn btn-secondary btn-small"
              >
                Edit project
              </Link>
            )}
          </div>

          <div className="list">
            <div className="list-item">
              <span className="muted">
                Company
              </span>

              <strong>
                {project.company.name}
              </strong>
            </div>

            <div className="list-item">
              <span className="muted">
                Spaces
              </span>

              <strong>
                {project.availableSpaces} /{" "}
                {project.maxParticipants}
              </strong>
            </div>

            <div className="list-item">
              <span className="muted">
                Status
              </span>

              {project.owner ? (
                <select
                  className="select"
                  value={status}
                  disabled={busy}
                  onChange={(event) => {
                    const nextStatus =
                      event.target.value as
                        | "ACTIVE"
                        | "CLOSED";

                    if (
                      nextStatus === "ACTIVE" ||
                      nextStatus === "CLOSED"
                    ) {
                      updateStatus(
                        nextStatus
                      );
                    }
                  }}
                >
                  <option value="ACTIVE">
                    Active
                  </option>

                  {status === "FULL" && (
                    <option value="FULL">
                      Full
                    </option>
                  )}

                  <option value="CLOSED">
                    Closed
                  </option>
                </select>
              ) : (
                <span
                  className={`badge ${statusClass}`}
                >
                  {statusLabel}
                </span>
              )}
            </div>
          </div>

          {!project.owner &&
            !project.subscribed &&
            status === "ACTIVE" && (
              <button
                className="btn btn-primary"
                style={{
                  width: "100%",
                  marginTop: 18,
                }}
                disabled={busy}
                onClick={() =>
                  subscription("POST")
                }
              >
                {busy
                  ? "Subscribing..."
                  : "Subscribe to project"}
              </button>
            )}

          {project.subscribed && (
            <button
              className="btn btn-secondary"
              style={{
                width: "100%",
                marginTop: 18,
              }}
              disabled={busy}
              onClick={() =>
                subscription("DELETE")
              }
            >
              {busy
                ? "Updating..."
                : "Withdraw from project"}
            </button>
          )}
        </aside>
      </div>

      {project.owner && (
        <section
          className="card"
          style={{ marginTop: 18 }}
        >
          <h2>Project resources</h2>

          <p className="muted">
            Links associated with this project.
          </p>

          <div
            className="job-actions"
            style={{ marginTop: 12 }}
          >
            {project.githubUrl && (
              <a
                className="btn btn-secondary btn-small"
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
              >
                GitHub
                <ExternalLink size={14} />
              </a>
            )}

            {project.liveDemoUrl && (
              <a
                className="btn btn-primary btn-small"
                href={project.liveDemoUrl}
                target="_blank"
                rel="noreferrer"
              >
                Live demo
                <ExternalLink size={14} />
              </a>
            )}

            {!project.githubUrl &&
              !project.liveDemoUrl && (
                <span className="muted">
                  No project links added.
                </span>
              )}
          </div>
        </section>
      )}

      {!project.owner && (
        <section
          className="grid grid-2"
          style={{ marginTop: 18 }}
        >
          <article className="card">
            <h2>
              <Building2 size={19} />
              Company
            </h2>

            <p className="muted">
              {project.company.name}
            </p>

            {project.company.website && (
              <p>
                <a
                  className="link"
                  href={project.company.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  Company website{" "}
                  <ExternalLink size={14} />
                </a>
              </p>
            )}

            {project.company.linkedinUrl && (
              <p>
                <a
                  className="link"
                  href={
                    project.company.linkedinUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <Linkedin size={15} />
                  LinkedIn{" "}
                  <ExternalLink size={14} />
                </a>
              </p>
            )}
          </article>

          <article className="card">
            <h2>Contact</h2>

            {project.subscribed ? (
              <>
                {project.contactEmail && (
                  <p>
                    <a
                      className="link"
                      href={`mailto:${project.contactEmail}`}
                    >
                      <Mail size={15} />
                      {project.contactEmail}
                    </a>
                  </p>
                )}

                {project.contactPhone && (
                  <p className="muted">
                    <Phone size={15} />
                    {project.contactPhone}
                  </p>
                )}

                {project.githubUrl && (
                  <div
                    className="job-actions"
                    style={{ marginTop: 12 }}
                  >
                    <a
                      className="btn btn-secondary btn-small"
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="muted">
                Contact details become available
                after you subscribe to the project.
              </p>
            )}

            {project.liveDemoUrl && (
              <div
                className="job-actions"
                style={{ marginTop: 12 }}
              >
                <a
                  className="btn btn-primary btn-small"
                  href={project.liveDemoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Live demo
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </article>
        </section>
      )}
    </>
  );
}
