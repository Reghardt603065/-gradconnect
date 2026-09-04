import Link from "next/link";
import {
  Award,
  BriefcaseBusiness,
  FolderKanban,
  Trophy,
  Users,
  BarChart3,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Brand } from "@/components/brand";

const features = [
  [
    BriefcaseBusiness,
    "Jobs in one place",
    "Search normalised graduate and junior roles from multiple job sources."
  ],
  [Award, "Certification tracking", "Record learning goals, progress, completion and expiry dates."],
  [Trophy, "Hackathons", "Find practical events, join them and form collaboration teams."],
  [
    FolderKanban,
    "Public portfolio",
    "Show projects, technologies and repository links through a shareable page."
  ],
  [Users, "Peer accountability", "Connect with peers, set shared goals and keep technical momentum."],
  [
    BarChart3,
    "Career analytics",
    "Track applications, learning, projects and an easy-to-understand momentum score."
  ],
];

export default function HomePage() {
  return <>
    <header className="site-header">
      <Brand />
      <nav className="header-actions">
        <Link className="btn btn-secondary hide-mobile" href="#features">Features</Link>
        <Link className="btn btn-secondary" href="/login">Log in</Link>
        <Link className="btn btn-primary" href="/register">Create account</Link>
      </nav>
    </header>
    <main>
      <section className="hero">
        <div>
          <div className="eyebrow">IT graduate career acceleration</div>
          <h1>Keep learning. Keep building. Get <span>connected.</span></h1>
          <p className="hero-copy">GradConnect brings graduate job discovery, skill tracking, hackathons, peer accountability and portfolio building into one focused platform—without trying to replace LinkedIn, GitHub or your favourite learning tools.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/register">Start your journey <ArrowRight size={18} /></Link>
          </div>
          <div className="tags" style={{ marginTop: 24 }}>
            {['Graduate focused', 'Portfolio ready', 'Free-tier friendly', 'Responsive'].map(item => <span className="badge gold" key={item}><CheckCircle2 size={13} /> {item}</span>)}
          </div>
        </div>
        <div className="hero-panel" aria-label="GradConnect platform overview">
          <div className="hero-grid">
            {features.slice(0, 4).map(([Icon, title, copy]) => {
              const FeatureIcon = Icon as typeof BriefcaseBusiness;
              return <article className="feature-tile" key={String(title)}>
                <FeatureIcon size={25} />
                <h3>{String(title)}</h3>
                <p>{String(copy)}</p>
              </article>;
            })}
          </div>
        </div>
      </section>
      <section className="section" id="features">
        <div className="section-heading">
          <div className="eyebrow">One connected workflow</div>
          <h2>From qualification to proof of readiness</h2>
          <p>Build your profile, track your progress and bring your career activity together in one place.</p>
        </div>
        <div className="feature-grid">
          {features.map(([Icon, title, copy]) => {
            const FeatureIcon = Icon as typeof BriefcaseBusiness;
            return <article className="feature-card" key={String(title)}>
              <span className="icon-box"><FeatureIcon size={22} /></span>
              <h3>{String(title)}</h3>
              <p>{String(copy)}</p>
            </article>;
          })}
        </div>
      </section>
    </main>
  </>;
}
