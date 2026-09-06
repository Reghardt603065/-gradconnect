import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Award,
  ExternalLink,
  FileText,
  Github,
  Linkedin,
  MapPin,
  Target,
  UserRound,
} from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { username } = await params;
  const currentUserId = session.user.id;

  const target = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (
    !target ||
    target.role !== "GRADUATE" ||
    target.id === currentUserId
  ) {
    notFound();
  }

  const friendship = await prisma.peerLink.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        {
          requesterId: currentUserId,
          addresseeId: target.id,
        },
        {
          requesterId: target.id,
          addresseeId: currentUserId,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (!friendship) {
    notFound();
  }

  const [user, sharedGoals] = await Promise.all([
    prisma.user.findUnique({
      where: {
        username,
      },
      include: {
        profileImage: {
          select: {
            id: true,
          },
        },
        portfolioProjects: {
          include: {
            attachments: {
              select: {
                id: true,
                fileName: true,
                mimeType: true,
                size: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: [
            { featured: "desc" },
            { updatedAt: "desc" },
          ],
        },
        certifications: {
          orderBy: [
            { status: "asc" },
            { updatedAt: "desc" },
          ],
        },
        hackathonParticipations: {
          include: {
            hackathon: true,
          },
          orderBy: {
            joinedAt: "desc",
          },
          take: 8,
        },
        badges: {
          orderBy: {
            awardedAt: "desc",
          },
          take: 8,
        },
        _count: {
          select: {
            portfolioProjects: true,
            certifications: true,
            hackathonParticipations: true,
          },
        },
      },
    }),
    prisma.goal.findMany({
      where: {
        OR: [
          {
            ownerId: currentUserId,
            partnerId: target.id,
          },
          {
            ownerId: target.id,
            partnerId: currentUserId,
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  if (!user || user.role !== "GRADUATE") {
    notFound();
  }

  const completedSharedGoals = sharedGoals.filter(
    (goal) => goal.status === "COMPLETED",
  ).length;
  const averageSharedProgress = sharedGoals.length
    ? Math.round(
        sharedGoals.reduce(
          (total, goal) => total + goal.progress,
          0,
        ) / sharedGoals.length,
      )
    : 0;

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <Link className="btn btn-secondary btn-small" href="/friends">
          ← Back to friends
        </Link>
      </div>

      <section className="card friend-profile-hero">
        <div
          className="profile-avatar"
          style={
            user.profileImage || user.image
              ? {
                  backgroundImage: `url(${
                    user.profileImage
                      ? `/api/profile-images/${user.id}`
                      : user.image
                  })`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  color: "transparent",
                }
              : {}
          }
        >
          {user.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </div>

        <div>
          <div className="eyebrow">Graduate profile</div>
          <h1>{user.name}</h1>
          <p className="friend-profile-headline">
            {user.headline || "IT Graduate"}
          </p>

          <div className="friend-profile-meta">
            <span>
              <UserRound size={15} /> @{user.username}
            </span>
            {user.location && (
              <span>
                <MapPin size={15} /> {user.location}
              </span>
            )}
          </div>

          <div className="job-actions" style={{ marginTop: 16 }}>
            {user.githubUsername && (
              <a
                className="btn btn-secondary btn-small"
                href={`https://github.com/${user.githubUsername}`}
                target="_blank"
              >
                <Github size={15} /> GitHub
              </a>
            )}

            {user.linkedinUrl && (
              <a
                className="btn btn-secondary btn-small"
                href={user.linkedinUrl}
                target="_blank"
              >
                <Linkedin size={15} /> LinkedIn
              </a>
            )}

            <Link
              className="btn btn-primary btn-small"
              href={`/portfolio/${user.username}`}
              target="_blank"
            >
              Portfolio <ExternalLink size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-3" style={{ marginTop: 18 }}>
        <article className="card stat-card">
          <div>
            <div className="stat-value">{user._count.portfolioProjects}</div>
            <div className="stat-label">Projects</div>
          </div>
        </article>

        <article className="card stat-card">
          <div>
            <div className="stat-value">{user._count.certifications}</div>
            <div className="stat-label">Certifications</div>
          </div>
        </article>

        <article className="card stat-card">
          <div>
            <div className="stat-value">{user._count.hackathonParticipations}</div>
            <div className="stat-label">Hackathons</div>
          </div>
        </article>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>About</h2>
        <p className="muted" style={{ lineHeight: 1.7 }}>
          {user.bio || "No bio added yet."}
        </p>

        {user.skills.length > 0 && (
          <div className="tags">
            {user.skills.map((skill) => (
              <span className="badge gold" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="list-item">
          <div>
            <h2 style={{ marginBottom: 4 }}>Shared progress</h2>
            <span className="muted">
              Goals you are working on together
            </span>
          </div>
          <span className="icon-box">
            <Target size={20} />
          </span>
        </div>

        <div className="peer-progress-summary" style={{ marginBottom: 14 }}>
          <div>
            <strong>{sharedGoals.length}</strong>
            <span>Shared goals</span>
          </div>
          <div>
            <strong>{completedSharedGoals}</strong>
            <span>Completed</span>
          </div>
          <div>
            <strong>{averageSharedProgress}%</strong>
            <span>Average progress</span>
          </div>
        </div>

        {sharedGoals.length ? (
          <div className="list">
            {sharedGoals.map((goal) => (
              <div key={goal.id}>
                <div className="list-item">
                  <div>
                    <strong>{goal.title}</strong>
                    <div className="helper">
                      Owned by {goal.owner.name}
                    </div>
                  </div>
                  <span
                    className={`badge ${goal.status === "COMPLETED" ? "green" : "blue"}`}
                  >
                    {goal.progress}%
                  </span>
                </div>
                <div className="progress">
                  <span style={{ width: `${goal.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No shared goals with this friend yet.</div>
        )}
      </section>

      {user.badges.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div className="section-heading">
            <h2>Achievements</h2>
          </div>
          <div className="grid grid-3">
            {user.badges.map((badge) => (
              <article className="card" key={badge.id}>
                <Award size={20} />
                <h3 style={{ marginTop: 12 }}>{badge.name}</h3>
                <p className="muted">{badge.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <div className="section-heading">
          <h2>Portfolio projects</h2>
        </div>

        <div className="project-grid">
          {user.portfolioProjects.length ? (
            user.portfolioProjects.map((project) => (
              <article className="project-card" key={project.id}>
                {project.imageUrl && (
                  <img
                    className="portfolio-cover"
                    src={project.imageUrl}
                    alt={`${project.title} project cover`}
                  />
                )}

                <div className="tags">
                  {project.featured && (
                    <span className="badge green">Featured</span>
                  )}
                  {project.technologies.map((technology) => (
                    <span className="badge" key={technology}>
                      {technology}
                    </span>
                  ))}
                </div>

                <h3>{project.title}</h3>
                <p className="muted">{project.description}</p>

                <div className="job-actions">
                  {project.githubUrl && (
                    <a
                      className="btn btn-secondary btn-small"
                      href={project.githubUrl}
                      target="_blank"
                    >
                      <Github size={15} /> Repository
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      className="btn btn-primary btn-small"
                      href={project.liveUrl}
                      target="_blank"
                    >
                      Live project <ExternalLink size={15} />
                    </a>
                  )}
                </div>

                {project.attachments.length > 0 && (
                  <div className="tags" style={{ marginTop: 12 }}>
                    {project.attachments.map((attachment) => (
                      <a
                        className="badge"
                        href={`/api/portfolio/attachments/${attachment.id}`}
                        key={attachment.id}
                      >
                        <FileText size={13} /> {attachment.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="card empty">No portfolio projects yet.</div>
          )}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <div className="section-heading">
          <h2>Certifications</h2>
        </div>

        <div className="grid grid-2">
          {user.certifications.length ? (
            user.certifications.map((certification) => (
              <article className="card" key={certification.id}>
                <div className="list-item">
                  <div>
                    <h3 style={{ margin: 0 }}>{certification.name}</h3>
                    <p className="muted">{certification.issuer}</p>
                  </div>
                  <span
                    className={`badge ${certification.status === "COMPLETED" ? "green" : "blue"}`}
                  >
                    <Award size={13} /> {certification.status}
                  </span>
                </div>

                {certification.skills.length > 0 && (
                  <div className="tags">
                    {certification.skills.map((skill) => (
                      <span className="badge" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {certification.credentialUrl && (
                  <a
                    className="btn btn-secondary btn-small"
                    style={{ marginTop: 14 }}
                    href={certification.credentialUrl}
                    target="_blank"
                  >
                    Credential <ExternalLink size={14} />
                  </a>
                )}
              </article>
            ))
          ) : (
            <div className="card empty">No certifications added yet.</div>
          )}
        </div>
      </section>

      {user.hackathonParticipations.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div className="section-heading">
            <h2>Hackathons</h2>
          </div>

          <div className="grid grid-2">
            {user.hackathonParticipations.map((entry) => (
              <article className="card" key={entry.id}>
                <h3>{entry.hackathon.name}</h3>
                <p className="muted">
                  {entry.hackathon.location || entry.hackathon.mode}
                </p>
                <div className="tags">
                  <span className="badge gold">{entry.hackathon.source}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
