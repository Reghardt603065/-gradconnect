"use client";
import { useEffect, useState } from "react";
export function ClientStatus({ message, type = "success", clearAfter = 3500 }: { message?: string; type?: "success" | "error"; clearAfter?: number; }) {
  const [visible, setVisible] = useState(Boolean(message));
  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;
    const t = setTimeout(() => setVisible(false), clearAfter);
    return () => clearTimeout(t);
  }, [message, clearAfter]);
  if (!visible || !message) return null;
  return <div className={`toast ${type}`}>{message}</div>;
}
