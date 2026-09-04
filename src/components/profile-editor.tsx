"use client";
import { FormEvent, useState } from "react";
import { Download, ExternalLink, Save, Trash2 } from "lucide-react";
import Link from "next/link";

type User = {
  name: string;
  email: string;
  username: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  skills: string[];
  githubUsername: string | null;
  linkedinUrl: string | null;
  image: string | null;
};
export function ProfileEditor({ initial }: { initial: User; }) {
  const [user, setUser] = useState(initial);
  const [message, setMessage] = useState('');
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get('name'),
      username: f.get('username'),
      headline: f.get('headline'),
      bio: f.get('bio'),
      location: f.get('location'),
      skills: String(f.get('skills') || '').split(',').map(v => v.trim()).filter(Boolean),
      githubUsername: f.get('githubUsername'),
      linkedinUrl: f.get('linkedinUrl'),
      image: f.get('image')
    };
    const r = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const b = await r.json();
    if (!r.ok) {
      setMessage(b.error || 'Profile update failed.');
      return;
    }
    setUser(v => ({ ...v, ...b.data }));
    setMessage('Profile saved.');
  }
  async function remove() {
    if (!confirm('Permanently delete your GradConnect account and all related data?')) return;
    const r = await fetch('/api/users/me', { method: 'DELETE' });
    if (r.ok) location.href = '/';
  }
  return <section className="grid grid-3">
    <div className="card" style={{ alignSelf: 'start' }}>
      <div
        className="profile-avatar"
        style={user.image ? { backgroundImage: `url(${user.image})`, backgroundSize: 'cover', color: 'transparent' } : {}}>
        {user.name.split(' ').map(v => v[0]).join('').slice(0, 2)}
      </div>
      <h2 style={{ marginTop: 18 }}>{user.name}</h2>
      <p className="muted">{user.headline || 'IT Graduate'}</p>
      <div className="tags">
        {user.skills.slice(0, 8).map(s => <span className="badge" key={s}>{s}</span>)}
      </div>
      <div className="grid" style={{ marginTop: 18 }}>
        <Link className="btn btn-secondary" href={`/portfolio/${user.username}`} target="_blank">Public profile <ExternalLink size={16} /></Link>
        <a className="btn btn-primary" href="/api/cv" target="_blank">Download CV <Download size={16} /></a>
      </div>
    </div>
    <form className="card form-stack" style={{ gridColumn: 'span 2' }} onSubmit={save}>
      <h2>Edit profile</h2>
      {message && <div className={`form-message ${message.includes('saved') ? 'success' : 'error'}`}>{message}</div>}
      <div className="form-row">
        <div className="field">
          <label>Full name</label>
          <input className="input" name="name" defaultValue={user.name} required />
        </div>
        <div className="field">
          <label>Username</label>
          <input className="input" name="username" defaultValue={user.username} pattern="[a-z0-9-]{3,40}" required />
        </div>
      </div>
      <div className="field">
        <label>Professional headline</label>
        <input
          className="input"
          name="headline"
          defaultValue={user.headline || ''}
          placeholder="Junior Software Developer" />
      </div>
      <div className="field">
        <label>About me</label>
        <textarea className="textarea" name="bio" defaultValue={user.bio || ''} />
      </div>
      <div className="form-row">
        <div className="field">
          <label>Location</label>
          <input className="input" name="location" defaultValue={user.location || ''} />
        </div>
        <div className="field">
          <label>Profile image URL</label>
          <input className="input" type="url" name="image" defaultValue={user.image || ''} placeholder="https://..." />
        </div>
      </div>
      <div className="field">
        <label>Skills</label>
        <input className="input" name="skills" defaultValue={user.skills.join(', ')} />
      </div>
      <div className="form-row">
        <div className="field">
          <label>GitHub username</label>
          <input className="input" name="githubUsername" defaultValue={user.githubUsername || ''} />
        </div>
        <div className="field">
          <label>LinkedIn URL</label>
          <input className="input" type="url" name="linkedinUrl" defaultValue={user.linkedinUrl || ''} />
        </div>
      </div>
      <button className="btn btn-primary"><Save size={16} /> Save profile</button>
      <hr style={{ border: 0, borderTop: '1px solid #e4e7ec', width: '100%' }} />
      <div className="list-item">
        <div>
          <strong>Delete account</strong>
          <div className="helper">This permanently removes the profile and related records.</div>
        </div>
        <button type="button" className="btn btn-danger btn-small" onClick={remove}><Trash2 size={15} /> Delete</button>
      </div>
    </form>
  </section>;
}
