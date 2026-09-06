"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";

type WorkspaceTask = {
  id: string;
  title: string;
  done: boolean;
  assigneeId: string | null;
};

type Member = {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: {
    id: string;
    name: string;
    username: string;
  };
};

type Candidate = {
  id: string;
  name: string;
  username: string;
  headline: string | null;
};

type TeamWorkspaceProps = {
  teamId: string;
  currentUserId: string;
  isCreator: boolean;
  initialRepositoryUrl: string;
  initialNotes: string;
  initialTasks: WorkspaceTask[];
  initialMembers: Member[];
  candidates: Candidate[];
};

export function TeamWorkspace({
  teamId,
  currentUserId,
  isCreator,
  initialRepositoryUrl,
  initialNotes,
  initialTasks,
  initialMembers,
  candidates,
}: TeamWorkspaceProps) {
  const [repositoryUrl, setRepositoryUrl] = useState(initialRepositoryUrl);
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [members, setMembers] = useState(initialMembers);
  const [message, setMessage] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");

  const visibleCandidates = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase();
    const unavailableIds = new Set(
      members
        .filter((member) =>
          member.status === "ACTIVE" || member.status === "INVITED",
        )
        .map((member) => member.userId),
    );

    return candidates
      .filter((candidate) => !unavailableIds.has(candidate.id))
      .filter((candidate) => {
        if (!query) {
          return true;
        }

        return [
          candidate.name,
          candidate.username,
          candidate.headline || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 20);
  }, [candidates, candidateSearch, members]);

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const assigneeId = String(form.get("assigneeId") || "").trim();

    if (!title) {
      return;
    }

    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title,
        done: false,
        assigneeId: assigneeId || null,
      },
    ]);

    event.currentTarget.reset();
  }

  async function saveWorkspace() {
    setMessage("");

    const response = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repositoryUrl,
        notes,
        tasks,
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || "Could not save the workspace.");
      return;
    }

    setMessage("Workspace saved.");
  }

  async function inviteMember() {
    if (!candidateId) {
      return;
    }

    setMessage("");

    const response = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: candidateId,
        role: "Member",
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || "Could not send the invitation.");
      return;
    }

    setMembers((current) => [body.data, ...current]);
    setCandidateId("");
    setMessage("Team invitation sent.");
  }

  return (
    <>
      {message && (
        <div className="form-message" style={{ marginBottom: 18 }}>
          {message}
        </div>
      )}

      <section className="grid grid-2">
        <article className="card form-stack">
          <h2>Shared workspace</h2>

          <div className="field">
            <label>Repository URL</label>
            <div className="job-actions">
              <input
                className="input"
                type="url"
                value={repositoryUrl}
                onChange={(event) => setRepositoryUrl(event.target.value)}
                placeholder="https://github.com/..."
              />

              {repositoryUrl && (
                <a
                  className="btn btn-secondary"
                  href={repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open <ExternalLink size={15} />
                </a>
              )}
            </div>
          </div>

          <div className="field">
            <label>Shared notes</label>
            <textarea
              className="textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Architecture ideas, meeting notes, API details, next steps..."
              style={{ minHeight: 190 }}
            />
          </div>

          <button className="btn btn-primary" onClick={saveWorkspace}>
            <Save size={16} /> Save workspace
          </button>
        </article>

        <article className="card">
          <h2>Team members</h2>

          <div className="list">
            {members.map((member) => (
              <div className="list-item" key={member.id}>
                <div>
                  <strong>{member.user.name}</strong>
                  <div className="helper">
                    @{member.user.username} · {member.role}
                  </div>
                </div>

                <span
                  className={`badge ${member.status === "ACTIVE" ? "green" : "gold"}`}
                >
                  {member.status}
                </span>
              </div>
            ))}
          </div>

          {isCreator && (
            <div className="form-stack" style={{ marginTop: 18 }}>
              <h3>
                <UserPlus size={17} /> Invite graduate
              </h3>

              <input
                className="input"
                value={candidateSearch}
                onChange={(event) => setCandidateSearch(event.target.value)}
                placeholder="Search graduates"
              />

              <select
                className="select"
                value={candidateId}
                onChange={(event) => setCandidateId(event.target.value)}
              >
                <option value="">Choose a graduate</option>
                {visibleCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} (@{candidate.username})
                  </option>
                ))}
              </select>

              <button
                className="btn btn-secondary"
                disabled={!candidateId}
                onClick={inviteMember}
              >
                <UserPlus size={16} /> Send invitation
              </button>
            </div>
          )}
        </article>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="list-item">
          <div>
            <h2 style={{ marginBottom: 4 }}>Shared tasks</h2>
            <span className="muted">
              {tasks.filter((task) => task.done).length} of {tasks.length} completed
            </span>
          </div>
          <span className="badge blue">
            {tasks.length
              ? Math.round(
                  (tasks.filter((task) => task.done).length / tasks.length) * 100,
                )
              : 0}
            %
          </span>
        </div>

        <form className="form-row" onSubmit={addTask}>
          <div className="field">
            <label>Task</label>
            <input className="input" name="title" required />
          </div>

          <div className="field">
            <label>Assign to</label>
            <select className="select" name="assigneeId" defaultValue="">
              <option value="">Anyone</option>
              {members
                .filter((member) => member.status === "ACTIVE")
                .map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name}
                  </option>
                ))}
            </select>
          </div>

          <button className="btn btn-primary" style={{ alignSelf: "end" }}>
            <Plus size={16} /> Add task
          </button>
        </form>

        <div className="list" style={{ marginTop: 14 }}>
          {tasks.length ? (
            tasks.map((task) => {
              const assignee = members.find(
                (member) => member.userId === task.assigneeId,
              );

              return (
                <div className="list-item" key={task.id}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flex: 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={(event) =>
                        setTasks((current) =>
                          current.map((item) =>
                            item.id === task.id
                              ? {
                                  ...item,
                                  done: event.target.checked,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    <span>
                      <strong>{task.title}</strong>
                      <span className="helper" style={{ display: "block" }}>
                        {assignee ? `Assigned to ${assignee.user.name}` : "Unassigned"}
                      </span>
                    </span>
                  </label>

                  <div className="job-actions">
                    {task.done && (
                      <span className="badge green">
                        <Check size={13} /> Done
                      </span>
                    )}
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() =>
                        setTasks((current) =>
                          current.filter((item) => item.id !== task.id),
                        )
                      }
                      aria-label="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty">No shared tasks yet.</div>
          )}
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={saveWorkspace}
        >
          <Save size={16} /> Save task changes
        </button>
      </section>
    </>
  );
}
