"use client";
import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
type App = {
  id: string;
  status: string;
  appliedAt: string | null;
  deadline: string | null;
  notes: string | null;
  job: {
    title: string;
    company: string;
    location: string | null;
    applyUrl: string;
  };
};
const statuses = [
  'SAVED',
  'APPLIED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN'
];
export function ApplicationTracker({ initial }: { initial: App[]; }) {
  const [items, setItems] = useState(initial);
  async function update(item: App, patch: Record<string, unknown>) {
    const r = await fetch(`/api/applications/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (r.ok) {
      const b = await r.json();
      setItems(v => v.map(i => i.id === item.id ? { ...i, ...b.data, job: i.job } : i));
    }
  }
  async function remove(id: string) {
    if (!confirm('Remove this application record?')) return;
    const r = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    if (r.ok) setItems(v => v.filter(i => i.id !== id));
  }
  return <section className="grid">
    {items.length ? items.map(item => <article className="card" key={item.id}>
      <div className="job-card">
        <div>
          <div className="tags">
            <span className={`badge ${item.status === 'OFFER' ? 'green' : item.status === 'REJECTED' ? 'red' : 'blue'}`}>
              {item.status}
            </span>
          </div>
          <h3>{item.job.title}</h3>
          <strong>{item.job.company}</strong>
          <p className="muted">{item.job.location || 'Location unavailable'}</p>
        </div>
        <div className="job-actions">
          <a className="btn btn-secondary btn-small" href={item.job.applyUrl} target="_blank">Listing <ExternalLink size={15} /></a>
          <button className="btn btn-danger btn-small" onClick={() => remove(item.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Status</label>
          <select className="select" value={item.status} onChange={e => update(item, { status: e.target.value })}>
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Follow-up deadline</label>
          <input
            className="input"
            type="date"
            value={item.deadline?.slice(0, 10) || ''}
            onChange={e => update(item, { deadline: e.target.value || null })} />
        </div>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label>Notes</label>
        <textarea
          className="textarea"
          defaultValue={item.notes || ''}
          onBlur={e => update(item, { notes: e.target.value })} />
      </div>
    </article>) : <div className="card empty">No tracked applications. Open Jobs and use “Apply & track”.</div>}
  </section>;
}
