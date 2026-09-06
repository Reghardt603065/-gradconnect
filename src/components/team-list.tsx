"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Users,
  X,
} from "lucide-react";

type TeamSummary = {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string | null;
  hackathon: {
    name: string;
    startDate: string;
  };
  createdBy: {
    id: string;
    name: string;
  };
  membershipStatus: string;
  memberCount: number;
};

export function TeamList({
  initial,
}: {
  initial: TeamSummary[];
}) {
  const [teams, setTeams] = useState(initial);
  const [message, setMessage] = useState("");

  async function respond(teamId: string, action: "accept" | "decline") {
    setMessage("");

    const response = await fetch(`/api/teams/${teamId}/members`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });

    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error || "Could not update the invitation.");
      return;
    }

    if (action === "decline") {
      setTeams((current) => current.filter((team) => team.id !== teamId));
      setMessage("Invitation declined.");
      return;
    }

    setTeams((current) =>
      current.map((team) =>
        team.id === teamId
          ? {
              ...team,
              membershipStatus: "ACTIVE",
              memberCount: team.memberCount + 1,
            }
          : team,
      ),
    );
    setMessage("Team invitation accepted.");
  }

  return (
    <>
      {message && (
        <div className="form-message" style={{ marginBottom: 18 }}>
          {message}
        </div>
      )}

      <section className="grid grid-2">
        {teams.length ? (
          teams.map((team) => (
            <article className="card" key={team.id}>
              <div className="list-item" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="tags">
                    <span
                      className={`badge ${team.membershipStatus === "INVITED" ? "gold" : "green"}`}
                    >
                      {team.membershipStatus === "INVITED" ? "Invitation" : "Active"}
                    </span>
                  </div>
                  <h3 style={{ marginTop: 12 }}>{team.name}</h3>
                  <p className="muted">{team.hackathon.name}</p>
                </div>

                <span className="badge blue">
                  <Users size={13} /> {team.memberCount}
                </span>
              </div>

              {team.description && (
                <p className="muted">{team.description}</p>
              )}

              <div className="helper">
                Team lead: {team.createdBy.name}
              </div>

              <div className="job-actions" style={{ marginTop: 16 }}>
                {team.membershipStatus === "INVITED" ? (
                  <>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => respond(team.id, "accept")}
                    >
                      <Check size={15} /> Accept
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => respond(team.id, "decline")}
                    >
                      <X size={15} /> Decline
                    </button>
                  </>
                ) : (
                  <Link
                    className="btn btn-primary btn-small"
                    href={`/teams/${team.id}`}
                  >
                    Open workspace
                  </Link>
                )}

                {team.repositoryUrl && (
                  <a
                    className="btn btn-secondary btn-small"
                    href={team.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Repository <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="card empty" style={{ gridColumn: "1 / -1" }}>
            No hackathon teams yet. Join a GradConnect hackathon and create a team.
          </div>
        )}
      </section>
    </>
  );
}
