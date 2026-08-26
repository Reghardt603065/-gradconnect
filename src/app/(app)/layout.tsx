import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { Brand } from "@/components/brand";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({children}:{children:React.ReactNode}){
  const session=await auth(); if(!session?.user) redirect("/login");
  const initials=(session.user.name||session.user.email||"GC").split(" ").map(v=>v[0]).join("").slice(0,2).toUpperCase();
  const accountLabel=session.user.role === "COMPANY" ? "Company account" : session.user.role === "ADMIN" ? "Admin account" : "Graduate account";
  return <div className="app-shell">
    <aside className="sidebar"><Brand href="/dashboard"/><AppNav role={session.user.role}/><div className="sidebar-bottom"><SignOutButton/></div></aside>
    <main className="app-main">
      <header className="app-topbar"><div><strong>GradConnect workspace</strong><div className="helper">Career progress, all in one place</div></div><div className="header-actions"><Link className="icon-box" href="/notifications" aria-label="Notifications"><Bell size={19}/></Link><div className="user-chip"><span className="avatar">{initials}</span><div><strong>{session.user.name}</strong><div className="helper">{accountLabel}</div></div></div></div></header>
      <div className="app-content">{children}</div>
    </main>
  </div>
}
