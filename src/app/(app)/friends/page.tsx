import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const currentUserId = session.user.id;

  // Friends are only users with an ACCEPTED PeerLink to the current user.
  const links = await prisma.peerLink.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: currentUserId },
        { addresseeId: currentUserId },
      ],
    },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          username: true,
          headline: true,
          location: true,
          skills: true,
          image: true,
          profileImage: {
            select: {
              id: true,
            },
          },
          role: true,
          _count: {
            select: {
              portfolioProjects: true,
              certifications: true,
              hackathonParticipations: true,
            },
          },
        },
      },
      addressee: {
        select: {
          id: true,
          name: true,
          username: true,
          headline: true,
          location: true,
          skills: true,
          image: true,
          profileImage: {
            select: {
              id: true,
            },
          },
          role: true,
          _count: {
            select: {
              portfolioProjects: true,
              certifications: true,
              hackathonParticipations: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const connectedPeople = links
    .map((link) =>
      link.requesterId === currentUserId ? link.addressee : link.requester,
    )
    .filter((person) => person.role === "GRADUATE");

  const people = connectedPeople.filter((person) => {
    if (!query) return true;
    const searchable = [
      person.name,
      person.username,
      person.headline ?? "",
      person.location ?? "",
      ...person.skills,
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(query);
  });

  return (
    <>
      <PageHeader title="Friends" description="People you are connected with." />

      {connectedPeople.length > 0 && (
        <form className="card" style={{ marginBottom: 18 }}>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <div className="field">
              <label htmlFor="friend-search">Search</label>
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
                  id="friend-search"
                  className="input"
                  name="q"
                  defaultValue={q.trim()}
                  placeholder="Search your friends"
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">
              Search
            </button>
            {query && (
              <Link className="btn btn-secondary" href="/friends">
                Clear
              </Link>
            )}
          </div>
        </form>
      )}

      <section className="friends-grid">
        {people.length ? (
          people.map((person) => (
            <article className="card friend-card" key={person.id}>
              <div className="friend-card-top">
                <div
                  className="profile-avatar friend-avatar"
                  style={
                    person.profileImage || person.image
                      ? {
                          backgroundImage: `url(${
                            person.profileImage
                              ? `/api/profile-images/${person.id}`
                              : person.image
                          })`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          color: "transparent",
                        }
                      : {}
                  }
                >
                  {person.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <h3>{person.name}</h3>
                  <div className="muted">@{person.username}</div>
                </div>
              </div>

              <p className="friend-headline">{person.headline || "IT Graduate"}</p>
              {person.location && <p className="muted">{person.location}</p>}

              <div className="tags">
                {person.skills.slice(0, 5).map((skill) => (
                  <span className="badge" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>

              <div className="friend-stats">
                <span>{person._count.portfolioProjects} projects</span>
                <span>{person._count.certifications} certifications</span>
                <span>{person._count.hackathonParticipations} hackathons</span>
              </div>

              <Link className="btn btn-primary" href={`/friends/${person.username}`}>
                <UserRound size={16} /> View profile
              </Link>
            </article>
          ))
        ) : (
          <div className="card empty" style={{ gridColumn: "1 / -1" }}>
            {connectedPeople.length === 0
              ? "No friends yet. Connect with someone in Peers & goals first."
              : "No matching friends found."}
          </div>
        )}
      </section>
    </>
  );
}
