import { notFound } from "next/navigation";
import Link from "next/link";
import { Github, Linkedin, MapPin, ExternalLink, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function PublicPortfolioPage({ params }: { params: Promise<{ username: string; }>; }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      portfolioProjects: { orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }] },
      certifications: { where: { status: 'COMPLETED' }, orderBy: { issueDate: 'desc' } },
      _count: { select: { applications: true, hackathonParticipations: true, portfolioProjects: true } }
    }
  });
  if (!user) notFound();
  return <main className="public-portfolio">
    <section className="public-hero">
      <Link className="brand" style={{ color: '#fff' }} href="/"><span className="brand-mark"><GraduationCap /></span>GradConnect Portfolio</Link>
      <div style={{ marginTop: 60, maxWidth: 800 }}>
        <div className="eyebrow" style={{ color: '#dfc77d' }}>IT graduate portfolio</div>
        <h1 style={{ fontSize: 'clamp(2.8rem,7vw,5.5rem)', margin: '12px 0', letterSpacing: '-.06em' }}>
          {user.name}
        </h1>
        <h2 style={{ fontWeight: 500, color: '#e7ebf5' }}>{user.headline || 'IT Graduate'}</h2>
        {user.location && <p><MapPin size={16} /> {user.location}</p>}
        <div className="job-actions" style={{ marginTop: 22 }}>
          {user.githubUsername && <a className="btn btn-gold" href={`https://github.com/${user.githubUsername}`} target="_blank"><Github size={17} /> GitHub</a>}
          {user.linkedinUrl && <a className="btn btn-secondary" href={user.linkedinUrl} target="_blank"><Linkedin size={17} /> LinkedIn</a>}
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
            {user.bio || 'This graduate is building practical projects and developing industry-ready technical skills.'}
          </p>
        </div>
        <div className="tags">{user.skills.map(s => <span className="badge gold" key={s}>{s}</span>)}</div>
      </section>
      <section style={{ marginTop: 50 }}>
        <div className="section-heading"><div className="eyebrow">Selected work</div><h2>Projects</h2></div>
        <div className="project-grid">
          {user.portfolioProjects.map(p => <article className="project-card" key={p.id}>
            <div className="tags">
              {p.featured && <span className="badge green">Featured</span>}
              {p.technologies.map(t => <span className="badge" key={t}>{t}</span>)}
            </div>
            <h3>{p.title}</h3>
            <p className="muted">{p.description}</p>
            <div className="job-actions">
              {p.githubUrl && <a className="btn btn-secondary btn-small" href={p.githubUrl} target="_blank"><Github size={15} /> Code</a>}
              {p.liveUrl && <a className="btn btn-primary btn-small" href={p.liveUrl} target="_blank">Live project <ExternalLink size={15} /></a>}
            </div>
          </article>)}
        </div>
      </section>
      {user.certifications.length > 0 && <section style={{ marginTop: 50 }}>
        <div className="section-heading">
          <div className="eyebrow">Learning</div>
          <h2>Completed certifications</h2>
        </div>
        <div className="grid grid-2">
          {user.certifications.map(c => <article className="card" key={c.id}>
            <h3>{c.name}</h3>
            <p className="muted">Issued by {c.issuer}</p>
            <div className="tags">{c.skills.map(s => <span className="badge" key={s}>{s}</span>)}</div>
          </article>)}
        </div>
      </section>}
    </div>
  </main>;
}
