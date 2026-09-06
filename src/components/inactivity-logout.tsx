"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
] as const;

export function InactivityLogout() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function expireSession() {
      await signOut({
        redirect: false,
      });

      window.location.assign("/login?reason=inactive");
    }

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(expireSession, INACTIVITY_LIMIT_MS);
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, resetTimer, {
        passive: true,
      });
    }

    resetTimer();

    return () => {
      clearTimeout(timer);

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, resetTimer);
      }
    };
  }, []);

  return null;
}
