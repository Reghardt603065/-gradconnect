import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, Award, Trophy, FolderKanban, TrendingUp, ArrowRight, Target } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";

export default async function DashboardPage(){
  const session=await auth(); if(!session?.user?.id) redirect("/login"); if(session.user.role === "COMPANY") redirect("/dashboard/company"); const userId=session.user.id;
  const [user,applications,certs,hackathons,projects,activities,goals]=await Promise.all([
    prisma.user.findUnique({where:{id:userId},select:{name:true}}),
    prisma.jobApplication.count({where:{userId}}), prisma.certification.findMany({where:{userId},select:{progress:true,status:true}}),
    prisma.hackathonParticipant.count({where:{userId}}), prisma.portfolioProject.count({where:{userId}}),
    prisma.activity.findMany({where:{userId},orderBy:{createdAt:'desc'},take:6}),
    prisma.goal.findMany({where:{ownerId:userId},orderBy:{updatedAt:'desc'},take:3,include:{partner:{select:{name:true}}}}),
  ]);
  const avg=certs.length?Math.round(certs.reduce((s,c)=>s+c.progress,0)/certs.length):0;
  const momentum=Math.min(100,projects*10+hackathons*8+certs.filter(c=>c.status==='COMPLETED').length*8+activities.length*2);
  const stats=[
    ["Applications",applications,BriefcaseBusiness,"/jobs"],["Certifications",certs.length,Award,"/certifications"],["Hackathons joined",hackathons,Trophy,"/hackathons"],["Portfolio projects",projects,FolderKanban,"/portfolio"],
  ] as const;
  return <>
    <PageHeader title={`Welcome back, ${(user?.name||'Graduate').split(' ')[0]}`} description="Here is a quick overview of your career-building activity."/>
    <section className="banner"><h2>Keep learning. Keep building.</h2><p>Your technical momentum score is <strong>{momentum}%</strong>. One small, consistent action today keeps your portfolio moving forward.</p></section>
    <section className="grid grid-4">{stats.map(([label,value,Icon,href])=><Link href={href} className="card stat-card" key={label}><div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div><span className="icon-box"><Icon size={21}/></span></Link>)}</section>
    <section className="grid grid-3" style={{marginTop:18}}>
      <article className="card"><h3><TrendingUp size={19}/> Technical momentum</h3><div className="stat-value">{momentum}%</div><div className="progress"><span style={{width:`${momentum}%`}}/></div><p className="muted">A simple score based on projects, completed learning, hackathons and recent activity.</p></article>
      <article className="card"><h3><Award size={19}/> Learning progress</h3><div className="stat-value">{avg}%</div><div className="progress"><span style={{width:`${avg}%`}}/></div><p className="muted">Average progress across all certificates in your skills ledger.</p></article>
      <article className="card"><h3><Target size={19}/> Active goals</h3><div className="stat-value">{goals.filter(g=>g.status==='ACTIVE').length}</div><p className="muted">Use peer goals to turn good intentions into visible progress.</p><Link href="/peers" className="link">Open goals <ArrowRight size={14}/></Link></article>
    </section>
    <section className="grid grid-2" style={{marginTop:18}}>
      <article className="card"><h2>Recent activity</h2>{activities.length?<div className="list">{activities.map(a=><div className="list-item" key={a.id}><div><strong>{a.message}</strong><div className="helper">{a.createdAt.toLocaleDateString('en-ZA')}</div></div><span className="badge gold">{a.type.replaceAll('_',' ')}</span></div>)}</div>:<div className="empty">Your activity will appear here after you save jobs, add projects and update goals.</div>}</article>
      <article className="card"><h2>Accountability goals</h2>{goals.length?<div className="list">{goals.map(g=><div key={g.id}><div className="list-item"><div><strong>{g.title}</strong><div className="helper">{g.partner?`With ${g.partner.name}`:'Personal goal'}</div></div><span className="badge blue">{g.progress}%</span></div><div className="progress"><span style={{width:`${g.progress}%`}}/></div></div>)}</div>:<div className="empty">Create a personal or shared goal with a peer.</div>}</article>
    </section>
  </>
}
