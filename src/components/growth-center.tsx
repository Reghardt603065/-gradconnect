"use client";

import { FormEvent, useState } from "react";
import { Award, CheckCircle2, Code2, Flame } from "lucide-react";

import type { CodingChallenge } from "@/lib/coding-challenges";

type Badge = {
  id: string;
  code: string;
  name: string;
  description: string;
  awardedAt: string;
};

type GrowthCenterProps = {
  challenge: CodingChallenge;
  challengeKey: string;
  completed: boolean;
  completionCount: number;
  badges: Badge[];
};

export function GrowthCenter({
  challenge,
  challengeKey,
  completed: initialCompleted,
  completionCount,
  badges,
}: GrowthCenterProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function completeChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/challenges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        challengeKey,
        notes: form.get("notes"),
      }),
    });

    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(body.error || "Could not save the challenge completion.");
      return;
    }

    setCompleted(true);
    setMessage("Challenge completed. Nice work.");
  }

  return (
    <>
      <section className="grid grid-3">
        <article className="card stat-card">
          <div>
            <div className="stat-value">{completionCount}</div>
            <div className="stat-label">Challenges completed</div>
          </div>
          <span className="icon-box">
            <Code2 size={21} />
          </span>
        </article>

        <article className="card stat-card">
          <div>
            <div className="stat-value">{badges.length}</div>
            <div className="stat-label">Badges earned</div>
          </div>
          <span className="icon-box">
            <Award size={21} />
          </span>
        </article>

        <article className="card stat-card">
          <div>
            <div className="stat-value">{completed ? "Done" : "Open"}</div>
            <div className="stat-label">Today's challenge</div>
          </div>
          <span className="icon-box">
            <Flame size={21} />
          </span>
        </article>
      </section>

      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <article className="card">
          <div className="list-item">
            <div>
              <div className="tags">
                <span className="badge gold">{challenge.difficulty}</span>
                {challenge.skills.map((skill) => (
                  <span className="badge" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
              <h2 style={{ marginTop: 14 }}>{challenge.title}</h2>
            </div>

            {completed && (
              <span className="badge green">
                <CheckCircle2 size={14} /> Completed
              </span>
            )}
          </div>

          <p className="muted" style={{ lineHeight: 1.7 }}>
            {challenge.description}
          </p>

          <div className="code-note" style={{ marginTop: 14 }}>
            Example: {challenge.example}
          </div>

          <div className="card" style={{ marginTop: 14, boxShadow: "none" }}>
            <strong>Hint</strong>
            <p className="muted" style={{ marginBottom: 0 }}>
              {challenge.hint}
            </p>
          </div>
        </article>

        <form className="card form-stack" onSubmit={completeChallenge}>
          <h2>Record your solution</h2>
          <p className="muted">
            Solve the challenge in your editor, then record a short note about your approach.
          </p>

          {message && (
            <div className={`form-message ${completed ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <div className="field">
            <label htmlFor="challenge-notes">Solution notes</label>
            <textarea
              id="challenge-notes"
              className="textarea"
              name="notes"
              placeholder="Example: I used a Set to track values I had already seen..."
              disabled={completed}
            />
          </div>

          <button
            className="btn btn-primary"
            disabled={completed || saving}
          >
            <CheckCircle2 size={16} />
            {completed ? "Completed today" : saving ? "Saving..." : "Mark challenge complete"}
          </button>
        </form>
      </section>

      <section style={{ marginTop: 26 }}>
        <div className="section-heading">
          <h2>Achievements</h2>
        </div>

        {badges.length ? (
          <div className="grid grid-3">
            {badges.map((badge) => (
              <article className="card" key={badge.id}>
                <span className="icon-box">
                  <Award size={20} />
                </span>
                <h3 style={{ marginTop: 14 }}>{badge.name}</h3>
                <p className="muted">{badge.description}</p>
                <span className="helper">
                  Earned {new Date(badge.awardedAt).toLocaleDateString("en-ZA")}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="card empty">
            Complete profile, learning, project and collaboration milestones to earn badges.
          </div>
        )}
      </section>
    </>
  );
}
