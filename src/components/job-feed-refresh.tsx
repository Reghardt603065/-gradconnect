"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function JobFeedRefresh({ hasJobs }: { hasJobs: boolean }) {
  const router = useRouter();
  const started = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async () => {
      setRefreshing(true);
      try {
        const response = await fetch("/api/jobs/refresh", {
          method: "POST",
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = await response.json();
        if (payload?.data?.refreshed || payload?.refreshed) {
          router.refresh();
        }
      } catch {
        // Existing database jobs remain usable even if a source is temporarily down.
      } finally {
        setRefreshing(false);
      }
    };

    void run();
  }, [router]);

  if (!refreshing) return null;

  return (
    <p className="muted" style={{ marginTop: 0 }}>
      {hasJobs
        ? "Checking South African company boards for newer jobs in the background…"
        : "Loading South African jobs in the background…"}
    </p>
  );
}
