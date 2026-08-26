"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Search, Users } from "lucide-react";

type Project = {
  id: string;
  title: string;
  category: string;
  summary: string;
  technologies: string[];
  status: "ACTIVE" | "FULL" | "CLOSED";
  company: { id: string; name: string };
  availableSpaces: number;
  maxParticipants: number;
};

export function ProjectBrowser() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load projects.");
        if (!cancelled) setProjects(body.data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load projects.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(projects.map((project) => project.category))).sort(),
    [projects],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (category && project.category !== category) return false;
      if (!query) return true;
      return [project.title, project.company.name, project.category, project.summary, ...project.technologies]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [projects, search, category]);

  if (loading) return <div className="card empty">Loading project opportunities...</div>;
  if (error) return <div className="form-message error">{error}</div>;

  return (
    <>
      <section className="card toolbar">
        <div className="field">
          <label htmlFor="project-search">Search projects</label>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 12, top: 12, color: "#667085" }} />
            <input
              id="project-search"
              className="input"
              style={{ paddingLeft: 39 }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="React, data, cybersecurity, company..."
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="project-category">Category</label>
          <select id="project-category" className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      </section>

      <p className="muted"><strong>{filtered.length}</strong> project{filtered.length === 1 ? "" : "s"} available.</p>

      {filtered.length === 0 ? (
        <div className="card empty">
          <h2>No projects found</h2>
          <p className="muted">Try a different keyword or category.</p>
        </div>
      ) : (
        <section className="grid grid-2">
          {filtered.map((project) => {
            const statusClass = project.status === "ACTIVE" ? "green" : project.status === "FULL" ? "blue" : "red";
            const statusLabel = project.status === "ACTIVE" ? "Active" : project.status === "FULL" ? "Full" : "Closed";
            return (
              <article className="card" key={project.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <span className="badge gold">{project.category}</span>
                    <h3 style={{ fontSize: "1.2rem", margin: "12px 0 5px" }}>{project.title}</h3>
                    <div className="muted" style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <Building2 size={15} /> {project.company.name}
                    </div>
                  </div>
                  <span className={`badge ${statusClass}`}>{statusLabel}</span>
                </div>
                <p className="muted" style={{ lineHeight: 1.65 }}>{project.summary}</p>
                <div className="tags">
                  {project.technologies.map((technology) => <span className="badge" key={technology}>{technology}</span>)}
                </div>
                <div className="list-item" style={{ marginTop: 18 }}>
                  <span className="muted" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Users size={15} /> {project.availableSpaces} of {project.maxParticipants} spaces available
                  </span>
                  <Link className="btn btn-primary btn-small" href={`/projects/${project.id}`}>
                    View details <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
