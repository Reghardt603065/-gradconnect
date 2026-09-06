"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  BriefcaseBusiness,
  Building2,
  Code2,
  Flame,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Settings,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";

type Role = "GRADUATE" | "COMPANY" | "ADMIN";
type NavItem = readonly [string, string, LucideIcon];

const graduateLinks: readonly NavItem[] = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/jobs", "Jobs", BriefcaseBusiness],
  ["/applications", "Applications", ListChecks],
  ["/certifications", "Certifications", Award],
  ["/growth", "Growth", Flame],
  ["/projects", "Projects", Code2],
  ["/hackathons", "Hackathons", Trophy],
  ["/teams", "Teams", Users],
  ["/portfolio", "Portfolio", FolderKanban],
  ["/friends", "Friends", Users],
  ["/peers", "Peers & goals", Users],
  ["/messages", "Messages", MessageCircle],
  ["/notifications", "Notifications", Bell],
  ["/profile", "Profile", UserRound],
  ["/settings", "Settings", Settings],
];

const companyLinks: readonly NavItem[] = [
  ["/dashboard/company", "Dashboard", LayoutDashboard],
  ["/projects", "Projects", Code2],
  ["/companies/register", "Company Profile", Building2],
  ["/notifications", "Notifications", Bell],
  ["/settings", "Settings", Settings],
];

type AppNavProps = {
  role: Role;
  unreadNotifications?: number;
};

export function AppNav({
  role,
  unreadNotifications = 0,
}: AppNavProps) {
  const pathname = usePathname();
  const links = role === "COMPANY" ? companyLinks : graduateLinks;

  return (
    <nav className="nav-list" aria-label="Main navigation">
      {links.map(([href, label, Icon]) => {
        const active =
          pathname === href || pathname.startsWith(`${href}/`);
        const showNotificationCount =
          href === "/notifications" && unreadNotifications > 0;

        return (
          <Link
            key={href}
            href={href}
            className={`nav-link ${active ? "active" : ""}`}
          >
            <Icon size={18} />

            <span className="nav-link-label">{label}</span>

            {showNotificationCount && (
              <span
                className="notification-count notification-count-nav"
                aria-label={`${unreadNotifications} unread notifications`}
              >
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
