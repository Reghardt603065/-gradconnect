"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

type Hack = {
  id: string;
  name: string;
  description: string;
  location: string | null;
  mode: string;
  startDate: string | null;
  endDate: string | null;
  registrationDeadline: string | null;
  websiteUrl: string | null;
  technologies: string[];
  source: string;
  joined: boolean;
  participants: number;
  teams: number;
  external: boolean;
  dateLabel: string | null;
  availabilityLabel: string;
  canDelete: boolean;
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type CreatedHackathon = Omit<
  Hack,
  "joined" | "participants" | "teams" | "external" | "dateLabel" | "availabilityLabel" | "canDelete"
>;

function splitTechnologies(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function HackathonBrowser({ initial }: { initial: Hack[] }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "joined">("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      if (view === "joined" && !item.joined) return false;
      if (!normalized) return true;
      return [
        item.name,
        item.description,
        item.location || "",
        item.mode,
        item.source,
        ...item.technologies,
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [items, query, view]);

  async function toggle(id: string, joined: boolean) {
    setError("");
    const response = await fetch(`/api/hackathons/${id}/join`, {
      method: joined ? "DELETE" : "POST",
    });
    const body: ApiResponse<unknown> = await response.json();
    if (!response.ok) {
      setError(body.error || "Hackathon membership could not be updated.");
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              joined: !joined,
              participants: Math.max(0, item.participants + (joined ? -1 : 1)),
            }
          : item,
      ),
    );
    if (joined && selected === id) setSelected("");
  }

  async function createHackathon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = {
      name: fields.get("name"),
      description: fields.get("description"),
      location: fields.get("location"),
      mode: fields.get("mode"),
      startDate: fields.get("startDate"),
      endDate: fields.get("endDate"),
      registrationDeadline: fields.get("registrationDeadline") || null,
      websiteUrl: fields.get("websiteUrl"),
      technologies: splitTechnologies(fields.get("technologies")),
    };

    const response = await fetch("/api/hackathons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body: ApiResponse<CreatedHackathon> = await response.json();

    if (!response.ok || !body.data) {
      setError(body.error || "Hackathon could not be created.");
      return;
    }

    setItems((current) => {
      const next: Hack = {
        ...body.data!,
        joined: false,
        participants: 0,
        teams: 0,
        external: false,
        dateLabel: null,
        availabilityLabel: "GradConnect community",
        canDelete: true,
      };
      return [...current, next].sort((a, b) => {
        const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    });
    form.reset();
    setShowCreate(false);
    setMessage("Hackathon created. It is now visible to GradConnect users.");
  }


  async function deleteHackathon(id: string, name: string) {
    const confirmed = window.confirm(
      `Delete "${name}"? This will also remove its GradConnect teams and participants.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const response = await fetch(`/api/hackathons/${id}`, {
      method: "DELETE",
    });

    const body: ApiResponse<{ deleted: string }> = await response.json();

    if (!response.ok) {
      setError(body.error || "Hackathon could not be deleted.");
      return;
    }

    setItems((current) =>
      current.filter((item) => item.id !== id),
    );

    if (selected === id) {
      setSelected("");
    }

    setMessage("Hackathon deleted.");
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = {
      hackathonId: selected,
      name: fields.get("name"),
      description: fields.get("description"),
      repositoryUrl: fields.get("repositoryUrl"),
    };

    const response = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body: ApiResponse<{ id: string }> = await response.json();

    if (!response.ok) {
      setError(body.error || "Team could not be created.");
      return;
    }

    setMessage("Team created for this hackathon.");
    setItems((current) =>
      current.map((item) =>
        item.id === selected
          ? {
              ...item,
              teams: item.teams + 1,
            }
          : item,
      ),
    );
    form.reset();
    setSelected("");

    if (body.data?.id) {
      window.location.href = `/teams/${body.data.id}`;
    }
  }

  return (
    <>
      <section className="card toolbar">
        <div className="field">
          <label htmlFor="hackathon-search">Search hackathons</label>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 12, top: 12, color: "#667085" }} />
            <input
              className="input"
              style={{ paddingLeft: 39 }}
              id="hackathon-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="AI, web development, Pretoria, Cape Town..."
            />
          </div>
        </div>
        <div className="field" style={{ flex: "0 0 170px" }}>
          <label htmlFor="hackathon-view">Show</label>
          <select
            className="select"
            id="hackathon-view"
            value={view}
            onChange={(event) => setView(event.target.value as "all" | "joined")}
          >
            <option value="all">All hackathons</option>
            <option value="joined">My hackathons</option>
          </select>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            setShowCreate((value) => !value);
            setSelected("");
            setError("");
          }}
        >
          <Plus size={17} /> {showCreate ? "Close form" : "Create hackathon"}
        </button>
      </section>

      {message && <div className="form-message success" style={{ marginBottom: 18 }}>{message}</div>}
      {error && <div className="form-message error" style={{ marginBottom: 18 }}>{error}</div>}

      {showCreate && (
        <section className="card" style={{ marginBottom: 18 }}>
          <form className="form-stack" onSubmit={createHackathon}>
            <div>
              <h2 style={{ marginBottom: 6 }}>Create a hackathon</h2>
              <p className="muted" style={{ margin: 0 }}>
                Add a South African event directly to GradConnect. After saving, it appears in the list below for other users to join.
              </p>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Hackathon name</label>
                <input className="input" name="name" required minLength={3} placeholder="Pretoria AI Buildathon" />
              </div>
              <div className="field">
                <label>Mode</label>
                <select className="select" name="mode" defaultValue="ONLINE">
                  <option value="ONLINE">Online</option>
                  <option value="IN_PERSON">In person</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                className="textarea"
                name="description"
                required
                minLength={10}
                placeholder="What will participants build or solve?"
              />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Location</label>
                <input className="input" name="location" placeholder="Pretoria, Gauteng, South Africa" />
              </div>
              <div className="field">
                <label>Technologies</label>
                <input className="input" name="technologies" placeholder="React, Python, AI, PostgreSQL" />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Start date</label>
                <input className="input" name="startDate" type="date" required />
              </div>
              <div className="field">
                <label>End date</label>
                <input className="input" name="endDate" type="date" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Registration deadline</label>
                <input className="input" name="registrationDeadline" type="date" />
              </div>
              <div className="field">
                <label>Event website</label>
                <input className="input" name="websiteUrl" type="url" placeholder="https://..." />
              </div>
            </div>
            <button className="btn btn-primary">Publish hackathon</button>
          </form>
        </section>
      )}

      <p className="muted">
        <strong>{visibleItems.length}</strong> hackathon{visibleItems.length === 1 ? "" : "s"} shown. Live public listings are limited to South Africa and refresh automatically. GradConnect community events stay in your database.
      </p>

      <section className="grid grid-3">
        {visibleItems.length ? (
          visibleItems.map((hackathon) => {
            const ended = hackathon.endDate ? new Date(hackathon.endDate).getTime() < Date.now() : false;
            const registrationClosed = hackathon.registrationDeadline
              ? new Date(hackathon.registrationDeadline).getTime() < Date.now()
              : false;
            const canJoin = !hackathon.external && !ended && !registrationClosed;

            return (
              <article className="card" key={hackathon.id}>
                <span className="icon-box"><Trophy size={21} /></span>
                <div className="tags" style={{ marginTop: 14 }}>
                  <span className="badge gold">{hackathon.mode.replaceAll("_", " ")}</span>
                  <span className="badge blue">{hackathon.source}</span>
                  {hackathon.external && <span className="badge green">{hackathon.availabilityLabel}</span>}
                  {ended && <span className="badge red">Ended</span>}
                  {!ended && registrationClosed && <span className="badge red">Registration closed</span>}
                  {hackathon.joined && <span className="badge green">Joined</span>}
                  {hackathon.canDelete && <span className="badge gold">Created by you</span>}
                </div>
                <h3 style={{ marginTop: 14 }}>{hackathon.name}</h3>
                <div className="tags">
                  {hackathon.technologies.slice(0, 5).map((technology) => (
                    <span className="badge" key={technology}>{technology}</span>
                  ))}
                </div>
                <p className="muted">{hackathon.description}</p>
                <div className="job-meta">
                  <span><MapPin size={14} /> {hackathon.location || "Online"}</span>
                  <span>
                    <CalendarDays size={14} />
                    {hackathon.dateLabel || (hackathon.startDate && hackathon.endDate
                      ? `${new Date(hackathon.startDate).toLocaleDateString("en-ZA")} – ${new Date(hackathon.endDate).toLocaleDateString("en-ZA")}`
                      : "Dates available on event website")}
                  </span>
                  <span>
                    <Users size={14} />
                    {hackathon.external
                      ? (hackathon.participants > 0
                          ? `${hackathon.participants.toLocaleString("en-ZA")} registered`
                          : "External registration")
                      : `${hackathon.participants} joined · ${hackathon.teams} teams`}
                  </span>
                </div>
                <div className="job-actions">
                  {hackathon.external ? (
                    hackathon.websiteUrl && (
                      <a className="btn btn-primary btn-small" href={hackathon.websiteUrl} target="_blank" rel="noreferrer">
                        <ExternalLink size={15} /> View / register
                      </a>
                    )
                  ) : (
                    <>
                      {hackathon.joined ? (
                        <button className="btn btn-secondary btn-small" onClick={() => toggle(hackathon.id, true)}>
                          Leave event
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-small"
                          disabled={!canJoin}
                          onClick={() => toggle(hackathon.id, false)}
                        >
                          {canJoin ? "Join hackathon" : "Registration closed"}
                        </button>
                      )}
                      {hackathon.joined && !ended && (
                        <button
                          className="btn btn-gold btn-small"
                          onClick={() => {
                            setSelected(hackathon.id);
                            setShowCreate(false);
                            setError("");
                          }}
                        >
                          Create team
                        </button>
                      )}
                      {hackathon.websiteUrl && (
                        <a
                          className="btn btn-secondary btn-small"
                          href={hackathon.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Event website
                        </a>
                      )}

                      {hackathon.canDelete && (
                        <button
                          className="btn btn-danger btn-small"
                          type="button"
                          onClick={() =>
                            deleteHackathon(hackathon.id, hackathon.name)
                          }
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <div className="card empty" style={{ gridColumn: "1 / -1" }}>
            <Trophy size={34} style={{ marginBottom: 10 }} />
            <h3>No hackathons found</h3>
            <p>
              {items.length
                ? "Try another search or switch back to All hackathons."
                : "No South African live listings or GradConnect hackathons are available right now. You can create one above."}
            </p>
            {!items.length && (
              <button className="btn btn-primary" type="button" onClick={() => setShowCreate(true)}>
                <Plus size={17} /> Create first hackathon
              </button>
            )}
          </div>
        )}
      </section>

      {selected && (
        <section className="card" style={{ marginTop: 18 }}>
          <form className="form-stack" onSubmit={createTeam}>
            <div className="list-item">
              <div>
                <h2>Create a hackathon team</h2>
                <p className="muted">Create a team for the selected hackathon after you have joined it.</p>
              </div>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setSelected("")}>Close</button>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Team name</label>
                <input className="input" name="name" required />
              </div>
              <div className="field">
                <label>Repository URL</label>
                <input className="input" name="repositoryUrl" type="url" placeholder="https://github.com/..." />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="textarea" name="description" />
            </div>
            <button className="btn btn-primary">Create team</button>
          </form>
        </section>
      )}
    </>
  );
}
