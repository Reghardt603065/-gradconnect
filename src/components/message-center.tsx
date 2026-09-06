"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";

type Peer = {
  id: string;
  name: string;
  username: string;
};

type Msg = {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  createdAt: string;
  sender: Peer;
  receiver: Peer;
};

type MessageCenterProps = {
  currentUserId: string;
  peers: Peer[];
  selectedId: string | null;
  initialMessages: Msg[];
};

export function MessageCenter({
  currentUserId,
  peers,
  selectedId,
  initialMessages,
}: MessageCenterProps) {
  const router = useRouter();

  const [messages, setMessages] = useState(initialMessages);
  const [error, setError] = useState("");

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedId) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const messageBody = String(form.get("body") || "").trim();

    if (!messageBody) {
      return;
    }

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiverId: selectedId,
        body: messageBody,
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      setError(body.error || "Message failed.");
      return;
    }

    const peer = peers.find((person) => person.id === selectedId);

    if (!peer) {
      setError("Could not find that peer.");
      return;
    }

    setMessages((current) => [
      ...current,
      {
        ...body.data,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUserId,
          name: "You",
          username: "",
        },
        receiver: peer,
      },
    ]);

    event.currentTarget.reset();
  }

  const selectedPeer = peers.find((person) => person.id === selectedId);

  return (
    <section className="grid grid-3 message-layout">
      <aside className="card message-peer-list">
        <h2>Conversations</h2>

        <div className="list">
          {peers.length ? (
            peers.map((peer) => (
              <button
                key={peer.id}
                className={`message-peer-button ${selectedId === peer.id ? "active" : ""}`}
                type="button"
                onClick={() => router.push(`/messages?peerId=${peer.id}`)}
              >
                <div className="avatar">
                  {peer.name
                    .split(" ")
                    .map((value) => value[0])
                    .join("")
                    .slice(0, 2)}
                </div>

                <div className="message-peer-copy">
                  <strong>{peer.name}</strong>
                  <div className="helper">@{peer.username}</div>
                </div>
              </button>
            ))
          ) : (
            <p className="muted">
              Connect with a peer before starting a conversation.
            </p>
          )}
        </div>
      </aside>

      <article className="card message-panel grid-span-2">
        {selectedId && selectedPeer ? (
          <>
            <div className="message-panel-heading">
              <h2>{selectedPeer.name}</h2>
            </div>

            <div className="message-thread">
              {messages.map((message) => {
                const ownMessage = message.senderId === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={`message-bubble ${ownMessage ? "own" : "received"}`}
                  >
                    <div>{message.body}</div>
                    <small>
                      {new Date(message.createdAt).toLocaleString("en-ZA")}
                    </small>
                  </div>
                );
              })}
            </div>

            {error && <div className="form-message error">{error}</div>}

            <form className="message-compose" onSubmit={send}>
              <input
                className="input"
                name="body"
                placeholder="Write a message…"
                autoComplete="off"
              />

              <button className="btn btn-primary" type="submit">
                <Send size={16} /> Send
              </button>
            </form>
          </>
        ) : (
          <div className="empty message-empty">
            Select a connected peer to open a conversation.
          </div>
        )}
      </article>
    </section>
  );
}
