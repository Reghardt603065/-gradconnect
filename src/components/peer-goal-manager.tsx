"use client";
import { FormEvent, useState } from "react";
import { UserPlus, Check, X, Target, Trash2 } from "lucide-react";

type Person = {
  id: string;
  name: string;
  username: string;
  headline: string | null;
  skills: string[];
};
type LinkRow = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  relationship: string;
  requester: Person;
  addressee: Person;
};
type Goal = {
  id: string;
  ownerId: string;
  partnerId: string | null;
  title: string;
  description: string | null;
  targetDate: string | null;
  progress: number;
  status: string;
  owner: { id: string; name: string; };
  partner: { id: string; name: string; } | null;
};
export function PeerGoalManager({
  currentUserId,
  people: initialPeople,
  links: initialLinks,
  goals: initialGoals
}: {
  currentUserId: string;
  people: Person[];
  links: LinkRow[];
  goals: Goal[];
}) {
  const [links, setLinks] = useState(initialLinks);
  const [goals, setGoals] = useState(initialGoals);
  const [message, setMessage] = useState('');
  const connected = links.filter(l => l.status === 'ACCEPTED').map(l => l.requesterId === currentUserId ? l.addressee : l.requester);
  async function connect(id: string) {
    const r = await fetch('/api/peers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresseeId: id, relationship: 'PEER' })
    });
    const b = await r.json();
    setMessage(r.ok ? 'Connection request sent.' : b.error || 'Could not send request.');
    if (r.ok) location.reload();
  }
  async function respond(id: string, status: 'ACCEPTED' | 'DECLINED') {
    const r = await fetch(`/api/peers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (r.ok) setLinks(v => v.map(l => l.id === id ? { ...l, status } : l));
  }
  async function addGoal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      title: f.get('title'),
      description: f.get('description'),
      partnerId: f.get('partnerId') || null,
      targetDate: f.get('targetDate') || null,
      progress: 0,
      status: 'ACTIVE'
    };
    const r = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const b = await r.json();
    if (r.ok) {
      location.reload();
    } else setMessage(b.error || 'Could not create goal.');
  }
  async function updateGoal(goal: Goal, progress: number) {
    const status = progress === 100 ? 'COMPLETED' : goal.status === 'COMPLETED' ? 'ACTIVE' : goal.status;
    const r = await fetch(`/api/goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress, status })
    });
    if (r.ok) setGoals(v => v.map(g => g.id === goal.id ? { ...g, progress, status } : g));
  }
  async function deleteGoal(id: string) {
    if (!confirm('Delete this goal?')) return;
    const r = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    if (r.ok) setGoals(v => v.filter(g => g.id !== id));
  }
  const linkedIds = new Set(links.flatMap(l => [l.requesterId, l.addresseeId]));
  return <>
    {message && <div className="form-message" style={{ marginBottom: 18 }}>{message}</div>}
    <section className="grid grid-2">
      <article className="card">
        <h2>Connection requests</h2>
        {links.filter(l => l.status === 'PENDING' && l.addresseeId === currentUserId).length ? <div className="list">
          {links.filter(l => l.status === 'PENDING' && l.addresseeId === currentUserId).map(l => <div className="list-item" key={l.id}>
            <div>
              <strong>{l.requester.name}</strong>
              <div className="helper">{l.requester.headline || 'IT Graduate'}</div>
            </div>
            <div className="job-actions">
              <button className="btn btn-primary btn-small" onClick={() => respond(l.id, 'ACCEPTED')}><Check size={15} /> Accept</button>
              <button className="btn btn-secondary btn-small" onClick={() => respond(l.id, 'DECLINED')}>
                <X size={15} />
              </button>
            </div>
          </div>)}
        </div> : <p className="muted">No incoming requests.</p>}
      </article>
      <article className="card">
        <h2>Connected peers</h2>
        {connected.length ? <div className="list">
          {connected.map(p => <div className="list-item" key={p.id}>
            <div>
              <strong>{p.name}</strong>
              <div className="helper">{p.headline || 'IT Graduate'}</div>
              <div className="tags" style={{ marginTop: 7 }}>
                {p.skills.slice(0, 4).map(s => <span className="badge" key={s}>{s}</span>)}
              </div>
            </div>
            <a className="btn btn-secondary btn-small" href={`/messages?peerId=${p.id}`}>Message</a>
          </div>)}
        </div> : <p className="muted">Accepted peer connections will appear here.</p>}
      </article>
    </section>
    <section className="grid grid-3" style={{ marginTop: 18 }}>
      <form className="card form-stack" onSubmit={addGoal}>
        <h2><Target size={19} /> New goal</h2>
        <div className="field">
          <label>Goal title</label>
          <input className="input" name="title" required />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea className="textarea" name="description" />
        </div>
        <div className="field">
          <label>Accountability partner</label>
          <select className="select" name="partnerId">
            <option value="">Personal goal</option>
            {connected.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Target date</label>
          <input className="input" name="targetDate" type="date" />
        </div>
        <button className="btn btn-primary">Create goal</button>
      </form>
      <div className="grid" style={{ gridColumn: 'span 2' }}>
        {goals.length ? goals.map(goal => <article className="card" key={goal.id}>
          <div className="list-item">
            <div>
              <div className="tags">
                <span className={`badge ${goal.status === 'COMPLETED' ? 'green' : 'blue'}`}>{goal.status}</span>
                {goal.partner && <span className="badge gold">With {goal.partner.name}</span>}
              </div>
              <h3 style={{ marginTop: 12 }}>{goal.title}</h3>
              <p className="muted">{goal.description}</p>
            </div>
            {goal.ownerId === currentUserId && <button className="btn btn-danger btn-small" onClick={() => deleteGoal(goal.id)}>
              <Trash2 size={15} />
            </button>}
          </div>
          <div className="progress"><span style={{ width: `${goal.progress}%` }} /></div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
            <input
              style={{ flex: 1 }}
              type="range"
              min="0"
              max="100"
              value={goal.progress}
              disabled={goal.ownerId !== currentUserId}
              onChange={e => setGoals(v => v.map(g => g.id === goal.id ? { ...g, progress: Number(e.target.value) } : g))}
              onMouseUp={e => updateGoal(goal, Number((e.target as HTMLInputElement).value))} />
            <strong>{goal.progress}%</strong>
          </div>
        </article>) : <div className="card empty">No goals yet. Create a personal or shared accountability target.</div>}
      </div>
    </section>
    <section style={{ marginTop: 28 }}>
      <h2>Discover graduates</h2>
      <div className="grid grid-3">
        {initialPeople.filter(p => !linkedIds.has(p.id)).map(p => <article className="card" key={p.id}>
          <div className="avatar">{p.name.split(' ').map(v => v[0]).join('').slice(0, 2)}</div>
          <h3 style={{ marginTop: 14 }}>{p.name}</h3>
          <p className="muted">{p.headline || 'IT Graduate'}</p>
          <div className="tags">
            {p.skills.slice(0, 5).map(s => <span className="badge" key={s}>{s}</span>)}
          </div>
          <button className="btn btn-secondary btn-small" style={{ marginTop: 16 }} onClick={() => connect(p.id)}><UserPlus size={15} /> Connect</button>
        </article>)}
      </div>
    </section>
  </>;
}
