"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCheck, Bell } from "lucide-react";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};
export function NotificationList({ initial }: { initial: Notification[] ;}) {
  const [items, setItems] = useState(initial);
  async function markAll() {
    const r = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true })
    });
    if (r.ok) setItems(v => v.map(i => ({ ...i, readAt: new Date().toISOString() })));
  }
  async function mark(id: string) {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setItems(v => v.map(i => i.id === id ? { ...i, readAt: new Date().toISOString() } : i));
  }
  return <><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
    <button className="btn btn-secondary btn-small" onClick={markAll}><CheckCheck size={16} /> Mark all read</button>
  </div><section className="card">
      {items.length ? <div className="list">
        {items.map(item => <div className="list-item" key={item.id} style={{ opacity: item.readAt ? .8 : 1 }}>
          <span className="icon-box"><Bell size={18} /></span>
          <div style={{ flex: 1 }}>
            <div className="tags">
              <span className="badge gold">{item.type}</span>
              {!item.readAt && <span className="badge blue">New</span>}
            </div>
            <h3 style={{ margin: '9px 0 4px' }}>{item.title}</h3>
            <p className="muted" style={{ margin: 0 }}>{item.message}</p>
            <div className="helper">{new Date(item.createdAt).toLocaleString('en-ZA')}</div>
          </div>
          <div className="job-actions">
            {item.link && <Link className="btn btn-secondary btn-small" href={item.link} onClick={() => mark(item.id)}>Open</Link>}
            {!item.readAt && <button className="btn btn-primary btn-small" onClick={() => mark(item.id)}>Mark read</button>}
          </div>
        </div>)}
      </div> : <div className="empty">You have no notifications.</div>}
    </section></>;
}
