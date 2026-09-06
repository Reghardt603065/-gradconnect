import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  ExternalLink,
  FileText,
  Github,
  GraduationCap,
  Linkedin,
  MapPin,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
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
          },
        },
        orderBy: [
          { featured: "desc" },
          { updatedAt: "desc" },
        ],
      },
      certifications: {
        where: {
          status: "COMPLETED",
        },
        orderBy: {
          issueDate: "desc",
        },
      },
      badges: {
        orderBy: {
          awardedAt: "desc",
        },
        take: 8,
      },
      _count: {
        select: {
          applications: true,
          hackathonParticipations: true,
          portfolioProjects: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <main className="public-portfolio">
      <section className="public-hero">
        <Link className="brand" style={{ color: "#fff" }} href="/">
          <span className="brand-mark">
            <GraduationCap />
          </span>
          GradConnect Portfolio
        </Link>

        <div style={{ marginTop: 60, maxWidth: 800 }}>
          <div className="eyebrow" style={{ color: "#dfc77d" }}>
            IT graduate portfolio
          </div>

          {(user.profileImage || user.image) && (
            <div
              className="profile-avatar"
              style={{
                marginTop: 18,
                width: 88,
                height: 88,
                backgroundImage: `url(${
                  user.profileImage
                    ? `/api/profile-images/${user.id}`
                    : user.image
                })`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                color: "transparent",
              }}
            >
              GC
            </div>
          )}

          <h1
            style={{
              fontSize: "clamp(2.8rem,7vw,5.5rem)",
              margin: "12px 0",
              letterSpacing: "-.06em",
            }}
          >
            {user.name}
          </h1>

          <h2 style={{ fontWeight: 500, color: "#e7ebf5" }}>
            {user.headline || "IT Graduate"}
          </h2>

          {user.location && (
            <p>
              <MapPin size={16} /> {user.location}
            </p>
          )}

          <div className="job-actions" style={{ marginTop: 22 }}>
            {user.githubUsername && (
              <a
                className="btn btn-gold"
                href={`https://github.com/${user.githubUsername}`}
                target="_blank"
              >
                <Github size={17} /> GitHub
              </a>
            )}

            {user.linkedinUrl && (
              <a
                className="btn btn-secondary"
                href={user.linkedinUrl}
                target="_blank"
              >
                <Linkedin size={17} /> LinkedIn
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="public-body">
        <section className="grid grid-3">
          <article className="card stat-card">
            <div>
              <div className="stat-value">{user._count.portfolioProjects}</div>
              <div className="stat-label">Projects</div>
            </div>
          </article>

          <article className="card stat-card">
            <div>
              <div className="stat-value">{user.certifications.length}</div>
              <div className="stat-label">Completed certifications</div>
            </div>
          </article>

          <article className="card stat-card">
            <div>
              <div className="stat-value">{user._count.hackathonParticipations}</div>
              <div className="stat-label">Hackathons</div>
            </div>
          </article>
        </section>

        <section style={{ marginTop: 50 }}>
          <div className="section-heading">
            <div className="eyebrow">About</div>
            <h2>Practical skills and career direction</h2>
            <p>
              {user.bio ||
                "This graduate is building practical projects and developing industry-ready technical skills."}
            </p>
          </div>

          <div className="tags">
            {user.skills.map((skill) => (
              <span className="badge gold" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </section>

        {user.badges.length > 0 && (
          <section style={{ marginTop: 50 }}>
            <div className="section-heading">
              <div className="eyebrow">Achievements</div>
              <h2>Career-building badges</h2>
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

        <section style={{ marginTop: 50 }}>
          <div className="section-heading">
            <div className="eyebrow">Selected work</div>
            <h2>Projects</h2>
          </div>

          <div className="project-grid">
            {user.portfolioProjects.map((project) => (
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
                      <Github size={15} /> Code
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
            ))}
          </div>
        </section>

        {user.certifications.length > 0 && (
          <section style={{ marginTop: 50 }}>
            <div className="section-heading">
              <div className="eyebrow">Learning</div>
              <h2>Completed certifications</h2>
            </div>

            <div className="grid grid-2">
              {user.certifications.map((certification) => (
                <article className="card" key={certification.id}>
                  <h3>{certification.name}</h3>
                  <p className="muted">Issued by {certification.issuer}</p>
                  <div className="tags">
                    {certification.skills.map((skill) => (
                      <span className="badge" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
