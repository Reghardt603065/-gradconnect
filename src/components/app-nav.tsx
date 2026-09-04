"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BriefcaseBusiness,
  ListChecks,
  Award,
  Trophy,
  FolderKanban,
  Users,
  MessageCircle,
  Bell,
  UserRound,
  Settings,
  Building2,
  Code2,
} from "lucide-react";

type Role = "GRADUATE" | "COMPANY" | "ADMIN";
type NavItem = readonly [string, string, LucideIcon];

const graduateLinks: readonly NavItem[] = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/jobs", "Jobs", BriefcaseBusiness],
  ["/applications", "Applications", ListChecks],
  ["/certifications", "Certifications", Award],
  ["/projects", "Projects", Code2],
  ["/hackathons", "Hackathons", Trophy],
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

export function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = role === "COMPANY" ? companyLinks : graduateLinks;

  return (
    <nav className="nav-list" aria-label="Main navigation">
      {links.map(([href, label, Icon]) => (
        <Link
          key={href}
          href={href}
          className={`nav-link ${
            pathname === href || pathname.startsWith(`${href}/`)
              ? "active"
              : ""
          }`}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
