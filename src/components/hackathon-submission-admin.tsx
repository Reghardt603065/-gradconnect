"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, Search, X } from "lucide-react";

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

type Submission = {
  id: string;
  name: string;
  description: string;
  location: string | null;
  mode: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  websiteUrl: string | null;
  technologies: string[];
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt: string | null;
  publishedHackathonId: string | null;
  submittedBy: {
    id: string;
    name: string;
    email: string;
  };
  reviewedBy: {
    id: string;
    name: string;
  } | null;
};

export function HackathonSubmissionAdmin({ initial }: { initial: Submission[] }) {
  const [items, setItems] = useState(initial);
  const [statusFilter, setStatusFilter] = useState<"ALL" | SubmissionStatus>("PENDING");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState("");

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!normalized) return true;

      return [
        item.name,
        item.description,
        item.location || "",
        item.submittedBy.name,
        item.submittedBy.email,
        ...item.technologies,
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [items, query, statusFilter]);

  async function review(id: string, action: "APPROVE" | "REJECT") {
    setWorkingId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/hackathon-approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const body: ApiResponse<Submission> = await response.json();

      if (!response.ok || !body.data) {
        setError(body.error || "The submission could not be reviewed.");
        return;
      }

      setItems((current) =>
        current.map((item) => (item.id === id ? body.data! : item)),
      );

      setMessage(
        action === "APPROVE"
          ? `'${body.data.name}' approved and published to the Hackathons page.`
          : `'${body.data.name}' rejected.`,
      );
    } finally {
      setWorkingId("");
    }
  }

  const pendingCount = items.filter((item) => item.status === "PENDING").length;

  return (
    <>
      <section className="card toolbar" style={{ marginBottom: 18 }}>
        <div className="field">
          <label htmlFor="submission-search">Search submissions</label>
          <div style={{ position: "relative" }}>
            <Search
              size={18}
              style={{ position: "absolute", left: 12, top: 12, color: "#667085" }}
            />
            <input
              className="input"
              id="submission-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hackathon, student, location, technology..."
              style={{ paddingLeft: 39 }}
            />
          </div>
        </div>
        <div className="field" style={{ flex: "0 0 190px" }}>
          <label htmlFor="submission-status">Status</label>
          <select
            className="select"
            id="submission-status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "ALL" | SubmissionStatus)
            }
          >
            <option value="PENDING">Pending ({pendingCount})</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
        </div>
      </section>

      {message && (
        <div className="form-message success" style={{ marginBottom: 18 }}>
          {message}
        </div>
      )}
      {error && (
        <div className="form-message error" style={{ marginBottom: 18 }}>
          {error}
        </div>
      )}

      <section className="grid grid-2">
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <article className="card" key={item.id}>
              <div className="list-item" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="tags" style={{ marginBottom: 8 }}>
                    <span
                      className={
                        item.status === "APPROVED"
                          ? "badge green"
                          : item.status === "REJECTED"
                            ? "badge red"
                            : "badge gold"
                      }
                    >
                      {item.status}
                    </span>
                    <span className="badge blue">{item.mode.replaceAll("_", " ")}</span>
                  </div>
                  <h3 style={{ marginTop: 0 }}>{item.name}</h3>
                </div>
              </div>

              <p className="muted">{item.description}</p>

              <div className="job-meta" style={{ marginBottom: 12 }}>
                <span>Submitted by {item.submittedBy.name}</span>
                <span>{item.submittedBy.email}</span>
                <span>{item.location || "Online"}</span>
                <span>
                  {new Date(item.startDate).toLocaleDateString("en-ZA")} – {new Date(item.endDate).toLocaleDateString("en-ZA")}
                </span>
              </div>

              {item.technologies.length > 0 && (
                <div className="tags" style={{ marginBottom: 14 }}>
                  {item.technologies.slice(0, 8).map((technology) => (
                    <span className="badge" key={technology}>{technology}</span>
                  ))}
                </div>
              )}

              <div className="job-actions">
                {item.websiteUrl && (
                  <a
                    className="btn btn-secondary btn-small"
                    href={item.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={15} /> Open website
                  </a>
                )}

                {item.status !== "APPROVED" && (
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    disabled={workingId === item.id}
                    onClick={() => review(item.id, "APPROVE")}
                  >
                    <Check size={15} /> Approve & publish
                  </button>
                )}

                {item.status === "PENDING" && (
                  <button
                    className="btn btn-danger btn-small"
                    type="button"
                    disabled={workingId === item.id}
                    onClick={() => review(item.id, "REJECT")}
                  >
                    <X size={15} /> Reject
                  </button>
                )}

                {item.publishedHackathonId && (
                  <a className="btn btn-secondary btn-small" href="/hackathons">
                    View live hackathon
                  </a>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="card empty" style={{ gridColumn: "1 / -1" }}>
            <h3>No submissions found</h3>
            <p className="muted">
              There are no hackathon submissions matching the current filter.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
