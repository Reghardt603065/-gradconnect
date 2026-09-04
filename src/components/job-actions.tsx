"use client";
import { useState } from "react";
import { Bookmark, CheckCircle2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export function JobActions({
  jobId,
  applyUrl,
  initialSaved,
  applicationStatus
}: {
  jobId: string;
  applyUrl: string;
  initialSaved: boolean;
  applicationStatus?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [status, setStatus] = useState(applicationStatus || "");
  const [busy, setBusy] = useState(false);
  async function toggleSave() {
    setBusy(true);
    const response = await fetch(`/api/jobs/${jobId}/save`, { method: saved ? "DELETE" : "POST" });
    if (response.ok) {
      setSaved(!saved);
      router.refresh();
    }
    setBusy(false);
  }
  async function markApplied() {
    setBusy(true);
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, status: 'APPLIED', appliedAt: new Date().toISOString(), notes: '' })
    });
    if (response.ok) {
      setStatus('APPLIED');
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
      router.refresh();
    }
    setBusy(false);
  }
  return <div className="job-actions">
    <button className="btn btn-secondary btn-small" disabled={busy} onClick={toggleSave}>
      <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
      {saved ? 'Saved' : 'Save'}
    </button>
    {status ? <span className="badge green"><CheckCircle2 size={14} />{status}</span> : <button className="btn btn-primary btn-small" disabled={busy} onClick={markApplied}>Apply & track <ExternalLink size={15} /></button>}
  </div>;
}
