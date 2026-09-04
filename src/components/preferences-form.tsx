"use client";
import { useState } from "react";
import { Save } from "lucide-react";
type Prefs = {
  newJobs: boolean;
  applicationReminders: boolean;
  certificationReminders: boolean;
  peerUpdates: boolean;
  hackathonReminders: boolean;
};
const labels: Record<keyof Prefs, [string, string]> = {
  newJobs: ['New job alerts', 'Notify me when fresh graduate-friendly jobs are imported.'],
  applicationReminders: ['Application reminders', 'Remind me about tracked application deadlines.'],
  certificationReminders: ['Certification reminders', 'Show reminders for incomplete or expiring certifications.'],
  peerUpdates: ['Peer updates', 'Notify me about connection requests and accountability activity.'],
  hackathonReminders: ['Hackathon reminders', 'Remind me about event and registration dates.']
};
export function PreferencesForm({ initial }: { initial: Prefs; }) {
  const [prefs, setPrefs] = useState(initial);
  const [message, setMessage] = useState('');
  async function save() {
    const r = await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    setMessage(r.ok ? 'Preferences saved.' : 'Could not save preferences.');
  }
  return <section className="card">
    <h2>Notification preferences</h2>
    <div className="list">
      {(Object.keys(labels) as (keyof Prefs)[]).map(key => <label className="list-item" key={key}>
        <div><strong>{labels[key][0]}</strong><div className="helper">{labels[key][1]}</div></div>
        <input
          type="checkbox"
          checked={prefs[key]}
          onChange={e => setPrefs(v => ({ ...v, [key]: e.target.checked }))} />
      </label>)}
    </div>
    {message && <div className="form-message success" style={{ marginTop: 14 }}>{message}</div>}
    <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={save}><Save size={16} /> Save preferences</button>
  </section>;
}
