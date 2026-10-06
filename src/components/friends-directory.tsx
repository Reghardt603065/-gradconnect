"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";

type Friend = {
  id: string;
  name: string;
  username: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  image: string | null;
  hasProfileImage: boolean;
  projectCount: number;
  certificationCount: number;
  hackathonCount: number;
};

export function FriendsDirectory({ friends }: { friends: Friend[] }) {
  const [query, setQuery] = useState("");

  const visibleFriends = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return friends;

    return friends.filter((friend) =>
      [
        friend.name,
        friend.username,
        friend.headline || "",
        friend.location || "",
        ...friend.skills,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [friends, query]);

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="list-item" style={{ alignItems: "end" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Friends</h2>
          <p className="muted" style={{ margin: 0 }}>
            Your accepted graduate connections now live here with your peer and goal tools.
          </p>
        </div>

        {friends.length > 0 && (
          <div className="field" style={{ minWidth: 260, maxWidth: 360, flex: 1 }}>
            <label htmlFor="peer-friend-search">Search friends</label>
            <div style={{ position: "relative" }}>
              <Search
                size={17}
                style={{
                  position: "absolute",
                  left: 13,
                  top: 13,
                  color: "#667085",
                }}
              />
              <input
                id="peer-friend-search"
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, skill, location..."
                style={{ paddingLeft: 40 }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="friends-grid" style={{ marginTop: 18 }}>
        {visibleFriends.length ? (
          visibleFriends.map((friend) => (
            <article className="card friend-card peer-friend-card" key={friend.id}>
              <div className="friend-card-top">
                <div
                  className="profile-avatar friend-avatar"
                  style={
                    friend.hasProfileImage || friend.image
                      ? {
                          backgroundImage: `url(${
                            friend.hasProfileImage
                              ? `/api/profile-images/${friend.id}`
                              : friend.image
                          })`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          color: "transparent",
                        }
                      : {}
                  }
                >
                  {friend.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>

                <div>
                  <h3>{friend.name}</h3>
                  <div className="muted">@{friend.username}</div>
                </div>
              </div>

              <p className="friend-headline">{friend.headline || "IT Graduate"}</p>
              {friend.location && <p className="muted">{friend.location}</p>}

              <div className="tags">
                {friend.skills.slice(0, 5).map((skill) => (
                  <span className="badge" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>

              <div className="friend-stats">
                <span>{friend.projectCount} projects</span>
                <span>{friend.certificationCount} certifications</span>
                <span>{friend.hackathonCount} hackathons</span>
              </div>

              <Link className="btn btn-primary" href={`/friends/${friend.username}`}>
                <UserRound size={16} /> View profile
              </Link>
            </article>
          ))
        ) : (
          <div className="empty" style={{ gridColumn: "1 / -1" }}>
            {friends.length === 0
              ? "No friends yet. Connect with graduates below first."
              : "No matching friends found."}
          </div>
        )}
      </div>
    </section>
  );
}
