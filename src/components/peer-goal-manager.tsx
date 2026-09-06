"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  MessageCircle,
  Target,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";

type Person = {
  id: string;
  name: string;
  username: string;
  headline: string | null;
  skills: string[];
};

type LinkRow = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  relationship: string;
  requester: Person;
  addressee: Person;
};

type Goal = {
  id: string;
  ownerId: string;
  partnerId: string | null;
  title: string;
  description: string | null;
  targetDate: string | null;
  progress: number;
  status: string;
  owner: {
    id: string;
    name: string;
  };
  partner: {
    id: string;
    name: string;
  } | null;
};

export function PeerGoalManager({
  currentUserId,
  people: initialPeople,
  links: initialLinks,
  goals: initialGoals,
}: {
  currentUserId: string;
  people: Person[];
  links: LinkRow[];
  goals: Goal[];
}) {
  const [links, setLinks] = useState(initialLinks);
  const [goals, setGoals] = useState(initialGoals);
  const [message, setMessage] = useState("");

  const connected = useMemo(() => {
    const peopleById = new Map<string, Person>();

    for (const link of links) {
      if (link.status !== "ACCEPTED") {
        continue;
      }

      const person =
        link.requesterId === currentUserId
          ? link.addressee
          : link.requester;

      peopleById.set(person.id, person);
    }

    return Array.from(peopleById.values());
  }, [links, currentUserId]);

  const linkedIds = useMemo(
    () => new Set(links.flatMap((link) => [link.requesterId, link.addresseeId])),
    [links],
  );

  function goalsWithPeer(peerId: string) {
    return goals.filter(
      (goal) =>
        (goal.ownerId === currentUserId && goal.partnerId === peerId) ||
        (goal.ownerId === peerId && goal.partnerId === currentUserId),
    );
  }

  async function connect(id: string) {
    const response = await fetch("/api/peers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        addresseeId: id,
        relationship: "PEER",
      }),
    });

    const body = await response.json();

    setMessage(
      response.ok
        ? "Connection request sent."
        : body.error || "Could not send request.",
    );

    if (response.ok) {
      window.location.reload();
    }
  }

  async function respond(
    id: string,
    status: "ACCEPTED" | "DECLINED",
  ) {
    const response = await fetch(`/api/peers/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      setLinks((current) =>
        current.map((link) =>
          link.id === id
            ? {
                ...link,
                status,
              }
            : link,
        ),
      );
    }
  }

  async function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get("title"),
      description: form.get("description"),
      partnerId: form.get("partnerId") || null,
      targetDate: form.get("targetDate") || null,
      progress: 0,
      status: "ACTIVE",
    };

    const response = await fetch("/api/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (response.ok) {
      window.location.reload();
      return;
    }

    setMessage(body.error || "Could not create goal.");
  }

  async function updateGoal(goal: Goal, progress: number) {
    const status =
      progress === 100
        ? "COMPLETED"
        : goal.status === "COMPLETED"
          ? "ACTIVE"
          : goal.status;

    const response = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        progress,
        status,
      }),
    });

    if (response.ok) {
      setGoals((current) =>
        current.map((item) =>
          item.id === goal.id
            ? {
                ...item,
                progress,
                status,
              }
            : item,
        ),
      );
    }
  }

  async function deleteGoal(id: string) {
    if (!confirm("Delete this goal?")) {
      return;
    }

    const response = await fetch(`/api/goals/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setGoals((current) => current.filter((goal) => goal.id !== id));
    }
  }

  const incomingRequests = links.filter(
    (link) =>
      link.status === "PENDING" &&
      link.addresseeId === currentUserId,
  );

  return (
    <>
      {message && (
        <div className="form-message" style={{ marginBottom: 18 }}>
          {message}
        </div>
      )}

      <section className="grid grid-2">
        <article className="card">
          <h2>Connection requests</h2>

          {incomingRequests.length ? (
            <div className="list">
              {incomingRequests.map((link) => (
                <div className="list-item" key={link.id}>
                  <div>
                    <strong>{link.requester.name}</strong>
                    <div className="helper">
                      {link.requester.headline || "IT Graduate"}
                    </div>
                  </div>

                  <div className="job-actions">
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => respond(link.id, "ACCEPTED")}
                    >
                      <Check size={15} /> Accept
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => respond(link.id, "DECLINED")}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No incoming requests.</p>
          )}
        </article>

        <article className="card">
          <h2>Connected peers</h2>

          {connected.length ? (
            <div className="list">
              {connected.map((person) => {
                const sharedGoals = goalsWithPeer(person.id);
                const completedGoals = sharedGoals.filter(
                  (goal) => goal.status === "COMPLETED",
                ).length;
                const averageProgress = sharedGoals.length
                  ? Math.round(
                      sharedGoals.reduce(
                        (total, goal) => total + goal.progress,
                        0,
                      ) / sharedGoals.length,
                    )
                  : 0;

                return (
                  <div key={person.id}>
                    <div className="list-item">
                      <div>
                        <strong>{person.name}</strong>
                        <div className="helper">
                          {person.headline || "IT Graduate"}
                        </div>
                        <div className="tags" style={{ marginTop: 7 }}>
                          {person.skills.slice(0, 4).map((skill) => (
                            <span className="badge" key={skill}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="job-actions">
                        <Link
                          className="btn btn-secondary btn-small"
                          href={`/friends/${person.username}`}
                        >
                          <UserRound size={14} /> Profile
                        </Link>
                        <Link
                          className="btn btn-secondary btn-small"
                          href={`/messages?peerId=${person.id}`}
                        >
                          <MessageCircle size={14} /> Message
                        </Link>
                      </div>
                    </div>

                    <div className="peer-progress-summary">
                      <div>
                        <strong>{sharedGoals.length}</strong>
                        <span>Shared goals</span>
                      </div>
                      <div>
                        <strong>{completedGoals}</strong>
                        <span>Completed</span>
                      </div>
                      <div>
                        <strong>{averageProgress}%</strong>
                        <span>Average progress</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">Accepted peer connections will appear here.</p>
          )}
        </article>
      </section>

      <section className="grid grid-3" style={{ marginTop: 18 }}>
        <form className="card form-stack" onSubmit={addGoal}>
          <h2>
            <Target size={19} /> New goal
          </h2>

          <div className="field">
            <label>Goal title</label>
            <input className="input" name="title" required />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea className="textarea" name="description" />
          </div>

          <div className="field">
            <label>Accountability partner</label>
            <select className="select" name="partnerId">
              <option value="">Personal goal</option>
              {connected.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Target date</label>
            <input className="input" name="targetDate" type="date" />
          </div>

          <button className="btn btn-primary">Create goal</button>
        </form>

        <div className="grid grid-span-2">
          {goals.length ? (
            goals.map((goal) => (
              <article className="card" key={goal.id}>
                <div className="list-item">
                  <div>
                    <div className="tags">
                      <span
                        className={`badge ${goal.status === "COMPLETED" ? "green" : "blue"}`}
                      >
                        {goal.status}
                      </span>
                      {goal.partner && (
                        <span className="badge gold">
                          With {goal.partner.name}
                        </span>
                      )}
                    </div>
                    <h3 style={{ marginTop: 12 }}>{goal.title}</h3>
                    <p className="muted">{goal.description}</p>
                  </div>

                  {goal.ownerId === currentUserId && (
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => deleteGoal(goal.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="progress">
                  <span style={{ width: `${goal.progress}%` }} />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    marginTop: 12,
                  }}
                >
                  <input
                    style={{ flex: 1 }}
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress}
                    disabled={goal.ownerId !== currentUserId}
                    onChange={(event) => {
                      const progress = Number(event.target.value);
                      setGoals((current) =>
                        current.map((item) =>
                          item.id === goal.id
                            ? {
                                ...item,
                                progress,
                              }
                            : item,
                        ),
                      );
                    }}
                    onPointerUp={(event) =>
                      updateGoal(
                        goal,
                        Number((event.target as HTMLInputElement).value),
                      )
                    }
                  />
                  <strong>{goal.progress}%</strong>
                </div>
              </article>
            ))
          ) : (
            <div className="card empty">
              No goals yet. Create a personal or shared accountability target.
            </div>
          )}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Discover graduates</h2>

        <div className="grid grid-3">
          {initialPeople
            .filter((person) => !linkedIds.has(person.id))
            .map((person) => (
              <article className="card" key={person.id}>
                <div className="avatar">
                  {person.name
                    .split(" ")
                    .map((value) => value[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <h3 style={{ marginTop: 14 }}>{person.name}</h3>
                <p className="muted">
                  {person.headline || "IT Graduate"}
                </p>
                <div className="tags">
                  {person.skills.slice(0, 5).map((skill) => (
                    <span className="badge" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
                <button
                  className="btn btn-secondary btn-small"
                  style={{ marginTop: 16 }}
                  onClick={() => connect(person.id)}
                >
                  <UserPlus size={15} /> Connect
                </button>
              </article>
            ))}
        </div>
      </section>
    </>
  );
}
