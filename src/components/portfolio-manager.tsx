"use client";
import { FormEvent, useState } from "react";
import {
  Github,
  ExternalLink,
  Star,
  Trash2,
  RefreshCw,
  Plus
} from "lucide-react";

type Project = {
  id: string;
  title: string;
  slug: string;
  description: string;
  technologies: string[];
  githubUrl: string | null;
  liveUrl: string | null;
  imageUrl: string | null;
  featured: boolean;
  source: string;
};
export function PortfolioManager({ initial, username, githubUsername }: { initial: Project[]; username: string; githubUsername: string | null; }) {
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState('');
  const [github, setGithub] = useState(githubUsername || '');
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      title: f.get('title'),
      description: f.get('description'),
      technologies: String(f.get('technologies') || '').split(',').map(v => v.trim()).filter(Boolean),
      githubUrl: f.get('githubUrl'),
      liveUrl: f.get('liveUrl'),
      imageUrl: '',
      featured: false
    };
    const r = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const b = await r.json();
    if (!r.ok) {
      setMessage(b.error || 'Project could not be added.');
      return;
    }
    setItems(v => [b.data, ...v]);
    e.currentTarget.reset();
    setMessage('Project added.');
  }
  async function remove(id: string) {
    if (!confirm('Delete this project?')) return;
    const r = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' });
    if (r.ok) setItems(v => v.filter(i => i.id !== id));
  }
  async function feature(item: Project) {
    const r = await fetch(`/api/portfolio/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !item.featured })
    });
    if (r.ok) setItems(v => v.map(i => i.id === item.id ? { ...i, featured: !item.featured } : i));
  }
  async function sync() {
    setMessage('Syncing GitHub repositories…');
    const r = await fetch('/api/github/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: github })
    });
    const b = await r.json();
    if (!r.ok) {
      setMessage(b.error || 'GitHub sync failed.');
      return;
    }
    setMessage(`GitHub sync complete: ${b.data.imported} imported, ${b.data.updated} updated.`);
    location.reload();
  }
  return <>
    <section className="grid grid-3">
      <div className="grid">
        <form className="card form-stack" onSubmit={add}>
          <h2><Plus size={19} /> Add project</h2>
          {message && <div className="form-message">{message}</div>}
          <div className="field">
            <label>Project title</label>
            <input className="input" name="title" required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="textarea" name="description" required minLength={10} />
          </div>
          <div className="field">
            <label>Technologies</label>
            <input className="input" name="technologies" placeholder="React, Node.js, PostgreSQL" />
          </div>
          <div className="field">
            <label>GitHub repository</label>
            <input className="input" name="githubUrl" type="url" placeholder="https://github.com/user/repo" />
          </div>
          <div className="field">
            <label>Live URL</label>
            <input className="input" name="liveUrl" type="url" placeholder="https://project.vercel.app" />
          </div>
          <button className="btn btn-primary">Add project</button>
        </form>
        <div className="card form-stack">
          <h2><Github size={19} /> GitHub sync</h2>
          <div className="field">
            <label>GitHub username</label>
            <input className="input" value={github} onChange={e => setGithub(e.target.value)} />
          </div>
          <button className="btn btn-secondary" disabled={!github} onClick={sync}><RefreshCw size={16} /> Sync repositories</button>
        </div>
      </div>
      <div className="grid" style={{ gridColumn: 'span 2' }}>
        {items.length ? items.map(item => <article className="card" key={item.id}>
          <div className="list-item">
            <div>
              <div className="tags">
                <span className="badge gold">{item.source}</span>
                {item.featured && <span className="badge green"><Star size={13} fill="currentColor" /> Featured</span>}
              </div>
              <h3 style={{ marginTop: 12 }}>{item.title}</h3>
            </div>
            <div className="job-actions">
              <button className="btn btn-secondary btn-small" onClick={() => feature(item)}>
                <Star size={15} />
                {item.featured ? 'Unfeature' : 'Feature'}
              </button>
              <button className="btn btn-danger btn-small" onClick={() => remove(item.id)}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <p className="muted">{item.description}</p>
          <div className="tags">{item.technologies.map(t => <span className="badge" key={t}>{t}</span>)}</div>
          <div className="job-actions" style={{ marginTop: 15 }}>
            {item.githubUrl && <a className="btn btn-secondary btn-small" href={item.githubUrl} target="_blank"><Github size={15} /> Repository</a>}
            {item.liveUrl && <a className="btn btn-primary btn-small" href={item.liveUrl} target="_blank">Live demo <ExternalLink size={15} /></a>}
          </div>
        </article>) : <div className="card empty">No projects yet. Add one manually or sync a public GitHub profile.</div>}
      </div>
    </section>
  </>;
}
