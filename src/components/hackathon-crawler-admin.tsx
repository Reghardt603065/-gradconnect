"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Clipboard,
  ExternalLink,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  details?: unknown;
};

type ScrapydRunResult = {
  status?: string;
  jobid?: string;
  activeTargetCount?: number;
};

type ScrapydStatusResult = {
  reachable: boolean;
  scrapydUrl: string;
  daemon?: {
    status?: string;
    pending?: number;
    running?: number;
    finished?: number;
  };
};

type CrawlTarget = {
  id: string;
  url: string;
  label: string | null;
  active: boolean;
  createdAt: string;
};

type CrawlResultStatus = "NEW" | "REVIEWED" | "DISMISSED";

type CrawlResult = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  mode: string | null;
  sourceUrl: string;
  status: CrawlResultStatus;
  discoveredAt: string;
  reviewedAt: string | null;
  published: boolean;
  publishedHackathonId: string | null;
  target: {
    label: string | null;
    url: string;
  } | null;
};

type Props = {
  initialTargets: CrawlTarget[];
  initialResults: CrawlResult[];
};

function resultCopyText(result: CrawlResult) {
  return [
    `Hackathon name: ${result.name}`,
    `Description: ${result.description || ""}`,
    `Location: ${result.location || ""}`,
    `Mode: ${result.mode || ""}`,
    `Start date: ${result.startDate || ""}`,
    `End date: ${result.endDate || ""}`,
    `Source: ${result.sourceUrl}`,
  ].join("\n");
}

export function HackathonCrawlerAdmin({
  initialTargets,
  initialResults,
}: Props) {
  const [targets, setTargets] = useState(initialTargets);
  const [results, setResults] = useState(initialResults);
  const [statusFilter, setStatusFilter] = useState<"ALL" | CrawlResultStatus>("NEW");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [serviceChecking, setServiceChecking] = useState(true);
  const [serviceStatus, setServiceStatus] = useState<ScrapydStatusResult | null>(null);

  const visibleResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return results.filter((result) => {
      const statusMatches = statusFilter === "ALL" || result.status === statusFilter;
      const queryMatches =
        !normalizedQuery ||
        [
          result.name,
          result.description,
          result.location,
          result.sourceUrl,
          result.target?.label,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      return statusMatches && queryMatches;
    });
  }, [query, results, statusFilter]);

  const activeTargetCount = targets.filter((target) => target.active).length;
  const newCount = results.filter((result) => result.status === "NEW").length;

  useEffect(() => {
    void checkCrawlerService(false);
  }, []);

  async function addTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const form = event.currentTarget;
    const fields = new FormData(form);

    const response = await fetch("/api/admin/hackathon-crawler/targets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: fields.get("url"),
        label: fields.get("label"),
      }),
    });

    const body: ApiResponse<CrawlTarget> = await response.json();

    if (!response.ok || !body.data) {
      setError(body.error || "The crawl target could not be saved.");
      return;
    }

    setTargets((current) => [
      body.data!,
      ...current.filter((target) => target.id !== body.data!.id),
    ]);
    setMessage("Crawl target saved and enabled.");
    form.reset();
  }

  async function setTargetActive(target: CrawlTarget, active: boolean) {
    setError("");

    const response = await fetch("/api/admin/hackathon-crawler/targets", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: target.id,
        active,
      }),
    });

    const body: ApiResponse<CrawlTarget> = await response.json();

    if (!response.ok || !body.data) {
      setError(body.error || "The crawl target could not be updated.");
      return;
    }

    setTargets((current) =>
      current.map((item) => (item.id === target.id ? body.data! : item)),
    );
  }

  async function deleteTarget(target: CrawlTarget) {
    if (!window.confirm(`Remove ${target.label || target.url} from the crawler target list?`)) {
      return;
    }

    setError("");

    const response = await fetch("/api/admin/hackathon-crawler/targets", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: target.id,
      }),
    });

    const body: ApiResponse<{ id: string }> = await response.json();

    if (!response.ok) {
      setError(body.error || "The crawl target could not be removed.");
      return;
    }

    setTargets((current) => current.filter((item) => item.id !== target.id));
  }

  async function checkCrawlerService(showMessage = true) {
    setServiceChecking(true);

    try {
      const response = await fetch("/api/admin/hackathon-crawler/status", {
        cache: "no-store",
      });
      const body: ApiResponse<ScrapydStatusResult> = await response.json();

      if (!response.ok || !body.data) {
        setServiceStatus(null);
        if (showMessage) {
          setError(body.error || "Crawler service status could not be checked.");
        }
        return;
      }

      setServiceStatus(body.data);

      if (showMessage) {
        setError("");
        setMessage(
          body.data.reachable
            ? "Scrapyd is online and ready."
            : "Scrapyd is offline. Start the Scrapyd service before running the crawler.",
        );
      }
    } finally {
      setServiceChecking(false);
    }
  }

  async function runCrawler() {
    setRunning(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/hackathon-crawler/run", {
        method: "POST",
      });

      const body: ApiResponse<ScrapydRunResult> = await response.json();

      if (!response.ok) {
        setError(
          body.error ||
            "The crawler could not be started. Check the Scrapyd terminal for details.",
        );
        await checkCrawlerService(false);
        return;
      }

      const jobLabel = body.data?.jobid
        ? ` Job: ${body.data.jobid}.`
        : "";

      setMessage(
        `Crawler job started.${jobLabel} Results will refresh automatically in a few seconds.`,
      );

      await checkCrawlerService(false);

      window.setTimeout(() => {
        void refreshResults(false);
      }, 4_000);

      window.setTimeout(() => {
        void refreshResults(false);
      }, 9_000);
    } finally {
      setRunning(false);
    }
  }

  async function refreshResults(showMessage = true) {
    setError("");

    const response = await fetch("/api/admin/hackathon-crawler/results", {
      cache: "no-store",
    });

    const body: ApiResponse<CrawlResult[]> = await response.json();

    if (!response.ok || !body.data) {
      setError(body.error || "Crawler results could not be refreshed.");
      return;
    }

    setResults(body.data);
    if (showMessage) {
      setMessage("Crawler results refreshed.");
    }
  }

  async function updateResultStatus(id: string, status: CrawlResultStatus) {
    setError("");

    const response = await fetch("/api/admin/hackathon-crawler/results", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        status,
      }),
    });

    const body: ApiResponse<CrawlResult> = await response.json();

    if (!response.ok || !body.data) {
      setError(body.error || "The crawler result could not be updated.");
      return;
    }

    setResults((current) =>
      current.map((result) => (result.id === id ? { ...result, ...body.data! } : result)),
    );

    if (status === "REVIEWED") {
      setMessage(`'${body.data.name}' reviewed and published to the Hackathons page.`);
    } else if (status === "DISMISSED") {
      setMessage(`'${body.data.name}' dismissed.`);
    }
  }

  async function deleteResult(result: CrawlResult) {
    if (!window.confirm(`Delete the crawler result '${result.name}'?`)) {
      return;
    }

    const response = await fetch("/api/admin/hackathon-crawler/results", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: result.id,
      }),
    });

    const body: ApiResponse<{ id: string }> = await response.json();

    if (!response.ok) {
      setError(body.error || "The crawler result could not be deleted.");
      return;
    }

    setResults((current) => current.filter((item) => item.id !== result.id));
  }

  async function copyResult(result: CrawlResult) {
    await navigator.clipboard.writeText(resultCopyText(result));
    setMessage(`Copied '${result.name}' to the clipboard.`);
  }

  return (
    <div className="form-stack">
      <section className="card">
        <div className="list-item">
          <div>
            <h2 style={{ marginBottom: 6 }}>1. Pages the crawler may scan</h2>
            <p className="muted" style={{ margin: 0 }}>
              Add a direct hackathon page or an event-listing page. Only enabled URLs are scanned.
            </p>
          </div>
          <span className="badge blue">{activeTargetCount} active</span>
        </div>

        <form className="form-row" onSubmit={addTarget} style={{ marginTop: 16 }}>
          <div className="field">
            <label>Page URL</label>
            <input
              className="input"
              name="url"
              type="url"
              required
              placeholder="https://example.com/hackathon"
            />
          </div>
          <div className="field">
            <label>Label</label>
            <input
              className="input"
              name="label"
              placeholder="Tshwane Varsity Hackathon"
            />
          </div>
          <button className="btn btn-primary" type="submit">
            <Plus size={16} /> Add URL
          </button>
        </form>

        <div className="form-stack" style={{ marginTop: 18 }}>
          {targets.length ? (
            targets.map((target) => (
              <div className="list-item" key={target.id}>
                <div style={{ minWidth: 0 }}>
                  <strong>{target.label || "Crawler target"}</strong>
                  <div className="helper" style={{ overflowWrap: "anywhere" }}>
                    {target.url}
                  </div>
                </div>
                <div className="job-actions">
                  <button
                    className={`btn btn-small ${target.active ? "btn-secondary" : "btn-primary"}`}
                    type="button"
                    onClick={() => setTargetActive(target, !target.active)}
                  >
                    {target.active ? "Pause" : "Enable"}
                  </button>
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() => deleteTarget(target)}
                    aria-label="Delete crawl target"
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No crawler URLs have been added yet.</p>
          )}
        </div>
      </section>

      <section className="card">
        <div className="list-item">
          <div>
            <h2 style={{ marginBottom: 6 }}>2. Run the crawler</h2>
            <p className="muted" style={{ margin: 0 }}>
              The crawler checks Schema.org Event data first, then event cards, then a direct-page fallback for normal hackathon pages.
            </p>
          </div>
          <div className="job-actions">
            <span
              className={`badge ${
                serviceChecking
                  ? "blue"
                  : serviceStatus?.reachable
                    ? "green"
                    : "red"
              }`}
            >
              {serviceChecking
                ? "Checking Scrapyd"
                : serviceStatus?.reachable
                  ? "Scrapyd online"
                  : "Scrapyd offline"}
            </span>
            <button
              className="btn btn-secondary btn-small"
              type="button"
              disabled={serviceChecking}
              onClick={() => checkCrawlerService(true)}
            >
              <RefreshCw size={15} /> Check service
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={running || activeTargetCount === 0}
              onClick={runCrawler}
            >
              <Play size={16} /> {running ? "Starting..." : "Run crawler"}
            </button>
          </div>
        </div>

      </section>

      {message && <div className="form-message success">{message}</div>}
      {error && <div className="form-message error">{error}</div>}

      <section className="card">
        <div className="list-item">
          <div>
            <h2 style={{ marginBottom: 6 }}>3. Review crawler results</h2>
            <p className="muted" style={{ margin: 0 }}>
              Crawler results stay in staging until an admin reviews them. Review & publish adds the approved event to the live Hackathons page.
            </p>
          </div>
          <div className="job-actions">
            <span className="badge gold">{newCount} new</span>
            <button className="btn btn-secondary btn-small" type="button" onClick={() => refreshResults(true)}>
              <RefreshCw size={15} /> Refresh
            </button>
            <Link className="btn btn-primary btn-small" href="/hackathons">
              Open Hackathons
            </Link>
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="crawler-result-search">Search results</label>
            <div style={{ position: "relative" }}>
              <Search
                size={17}
                style={{ position: "absolute", left: 12, top: 12, color: "#667085" }}
              />
              <input
                id="crawler-result-search"
                className="input"
                style={{ paddingLeft: 38 }}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, location, source..."
              />
            </div>
          </div>
          <div className="field" style={{ flex: "0 0 180px" }}>
            <label>Status</label>
            <select
              className="select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | CrawlResultStatus)
              }
            >
              <option value="NEW">New</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="DISMISSED">Dismissed</option>
              <option value="ALL">All</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid grid-2">
        {visibleResults.length ? (
          visibleResults.map((result) => (
            <article className="card" key={result.id}>
              <div className="list-item" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="tags">
                    <span
                      className={`badge ${
                        result.status === "NEW"
                          ? "gold"
                          : result.status === "REVIEWED"
                            ? "green"
                            : "red"
                      }`}
                    >
                      {result.status}
                    </span>
                    {result.target?.label && <span className="badge blue">{result.target.label}</span>}
                    {result.published && <span className="badge green">LIVE</span>}
                  </div>
                  <h3 style={{ marginTop: 12 }}>{result.name}</h3>
                </div>
                <span className="helper">
                  {new Date(result.discoveredAt).toLocaleString("en-ZA")}
                </span>
              </div>

              <p className="muted">{result.description || "No description was extracted."}</p>

              <div className="form-stack" style={{ gap: 8 }}>
                <div><strong>Location:</strong> {result.location || "Not found"}</div>
                <div><strong>Mode:</strong> {result.mode || "Not found"}</div>
                <div><strong>Start:</strong> {result.startDate || "Not found"}</div>
                <div><strong>End:</strong> {result.endDate || "Not found"}</div>
                <div style={{ overflowWrap: "anywhere" }}>
                  <strong>Source:</strong> {result.sourceUrl}
                </div>
              </div>

              <div className="job-actions" style={{ marginTop: 18 }}>
                <a
                  className="btn btn-secondary btn-small"
                  href={result.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={15} /> Open source
                </a>
                <button
                  className="btn btn-secondary btn-small"
                  type="button"
                  onClick={() => copyResult(result)}
                >
                  <Clipboard size={15} /> Copy details
                </button>
                {!result.published && result.status !== "DISMISSED" && (
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    onClick={() => updateResultStatus(result.id, "REVIEWED")}
                  >
                    <Check size={15} /> {result.status === "REVIEWED" ? "Publish" : "Review & publish"}
                  </button>
                )}
                {result.published && (
                  <Link className="btn btn-primary btn-small" href="/hackathons">
                    Open live Hackathon
                  </Link>
                )}
                {!result.published && result.status !== "DISMISSED" && (
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() => updateResultStatus(result.id, "DISMISSED")}
                  >
                    <X size={15} /> Dismiss
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-small"
                  type="button"
                  onClick={() => deleteResult(result)}
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="card">
            <h3>No crawler results</h3>
            <p className="muted">
              Add an enabled URL, run the crawler, and the staging results will appear here.
            </p>
          </article>
        )}
      </section>
    </div>
  );
}
