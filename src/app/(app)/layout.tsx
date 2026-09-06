import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { Brand } from "@/components/brand";
import { InactivityLogout } from "@/components/inactivity-logout";
import { SignOutButton } from "@/components/sign-out-button";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const unreadNotifications = await prisma.notification.count({
    where: {
      userId: session.user.id,
      readAt: null,
    },
  });

  const initials = (session.user.name || session.user.email || "GC")
    .split(" ")
    .map((value) => value[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const accountLabel =
    session.user.role === "COMPANY"
      ? "Company account"
      : session.user.role === "ADMIN"
        ? "Admin account"
        : "Graduate account";

  return (
    <>
      <InactivityLogout />

      <div className="app-shell">
        <aside className="sidebar">
          <Brand href="/dashboard" />

          <AppNav
            role={session.user.role}
            unreadNotifications={unreadNotifications}
          />

          <div className="sidebar-bottom">
            <SignOutButton />
          </div>
        </aside>

        <main className="app-main">
          <header className="app-topbar">
            <div>
              <strong>GradConnect workspace</strong>
            </div>

            <div className="header-actions">
              <Link
                className="icon-box notification-bell"
                href="/notifications"
                aria-label={
                  unreadNotifications > 0
                    ? `${unreadNotifications} unread notifications`
                    : "Notifications"
                }
              >
                <Bell size={19} />

                {unreadNotifications > 0 && (
                  <span className="notification-count notification-count-bell">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>

              <div className="user-chip">
                <span className="avatar">{initials}</span>

                <div>
                  <strong>{session.user.name}</strong>
                  <div className="helper">{accountLabel}</div>
                </div>
              </div>
            </div>
          </header>

          <div className="app-content">{children}</div>
        </main>
      </div>
    </>
  );
}
