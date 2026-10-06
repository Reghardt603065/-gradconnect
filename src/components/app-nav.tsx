"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  BriefcaseBusiness,
  Building2,
  Code2,
  ClipboardCheck,
  Flame,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageCircle,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  X,
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

const adminLinks: readonly NavItem[] = [
  ...graduateLinks.filter(([href]) => href !== "/peers"),
  ["/admin/hackathon-approvals", "Hackathon approvals", ClipboardCheck],
  ["/admin/hackathon-crawler", "Admin crawler", ShieldCheck],
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const links =
    role === "COMPANY"
      ? companyLinks
      : role === "ADMIN"
        ? adminLinks
        : graduateLinks;

  useEffect(() => {
    setMobileOpen(false);
    document.documentElement.classList.remove("route-transitioning");
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  function beginNavigation(href: string, event: MouseEvent<HTMLAnchorElement>) {
    closeMobileMenu();

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      pathname === href
    ) {
      return;
    }

    document.documentElement.classList.add("route-transitioning");

    window.setTimeout(() => {
      document.documentElement.classList.remove("route-transitioning");
    }, 900);
  }

  return (
    <>
      <button
        type="button"
        className="mobile-menu-button"
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        aria-controls="main-navigation"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={21} />
        <span>Menu</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-backdrop ${mobileOpen ? "visible" : ""}`}
        aria-label="Close navigation menu"
        onClick={closeMobileMenu}
      />

      <nav
        id="main-navigation"
        className={`nav-list ${mobileOpen ? "mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="mobile-nav-heading">
          <strong>Navigation</strong>

          <button
            type="button"
            className="mobile-nav-close"
            aria-label="Close navigation menu"
            onClick={closeMobileMenu}
          >
            <X size={20} />
          </button>
        </div>

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
              onClick={(event) => beginNavigation(href, event)}
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
    </>
  );
}
