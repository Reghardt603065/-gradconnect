"use client";
import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";

type Peer = { id: string; name: string; username: string ;};
type Msg = {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  createdAt: string;
  sender: Peer;
  receiver: Peer;
};
export function MessageCenter({
  currentUserId,
  peers,
  selectedId,
  initialMessages
}: {
  currentUserId: string;
  peers: Peer[];
  selectedId: string | null;
  initialMessages: Msg[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [error, setError] = useState('');
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;
    const f = new FormData(e.currentTarget);
    const body = String(f.get('body') || '').trim();
    if (!body) return;
    const r = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId: selectedId, body })
    });
    const b = await r.json();
    if (!r.ok) {
      setError(b.error || 'Message failed.');
      return;
    }
    const peer = peers.find(p => p.id === selectedId)!;
    setMessages(v => [
      ...v,
      {
        ...b.data,
        createdAt: new Date().toISOString(),
        sender: { id: currentUserId, name: 'You', username: '' },
        receiver: peer
      }
    ]);
    e.currentTarget.reset();
  }
  return <section className="grid grid-3">
    <aside className="card" style={{ alignSelf: 'start' }}>
      <h2>Conversations</h2>
      <div className="list">
        {peers.length ? peers.map(p => <button
          key={p.id}
          className={`list-item ${selectedId === p.id ? 'badge gold' : ''}`}
          style={{
            width: '100%',
            background: selectedId === p.id ? '#f4ead0' : 'transparent',
            border: 'none',
            textAlign: 'left',
            borderRadius: 10,
            padding: 12
          }}
          onClick={() => router.push(`/messages?peerId=${p.id}`)}>
          <div className="avatar">{p.name.split(' ').map(v => v[0]).join('').slice(0, 2)}</div>
          <div style={{ flex: 1 }}><strong>{p.name}</strong><div className="helper">@{p.username}</div></div>
        </button>) : <p className="muted">Connect with a peer before starting a conversation.</p>}
      </div>
    </aside>
    <article className="card" style={{ gridColumn: 'span 2', minHeight: 520, display: 'flex', flexDirection: 'column' }}>
      {selectedId ? <><div><h2>{peers.find(p => p.id === selectedId)?.name}</h2></div><div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '18px 0',
        maxHeight: 420,
        overflow: 'auto'
      }}>
        {messages.map(m => <div
          key={m.id}
          style={{
            alignSelf: m.senderId === currentUserId ? 'flex-end' : 'flex-start',
            maxWidth: '75%',
            background: m.senderId === currentUserId ? '#17264a' : '#f2f4f7',
            color: m.senderId === currentUserId ? '#fff' : '#172033',
            padding: '10px 13px',
            borderRadius: 12
          }}>
          <div>{m.body}</div>
          <small style={{ opacity: .7 }}>{new Date(m.createdAt).toLocaleString('en-ZA')}</small>
        </div>)}
      </div>{error && <div className="form-message error">{error}</div>}<form onSubmit={send} style={{ display: 'flex', gap: 10 }}>
          <input className="input" name="body" placeholder="Write a message…" autoComplete="off" />
          <button className="btn btn-primary"><Send size={16} /> Send</button>
        </form></> : <div className="empty" style={{ margin: 'auto' }}>Select a connected peer to open a conversation.</div>}
    </article>
  </section>;
}
