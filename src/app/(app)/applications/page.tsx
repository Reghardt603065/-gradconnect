import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ApplicationTracker } from "@/components/application-tracker";
export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const rows = await prisma.jobApplication.findMany({
    where: { userId: session.user.id },
    include: { job: { select: { title: true, company: true, location: true, applyUrl: true } } },
    orderBy: { updatedAt: 'desc' }
  });
  const initial = rows.map(a => ({
    id: a.id,
    status: a.status,
    appliedAt: a.appliedAt?.toISOString() || null,
    deadline: a.deadline?.toISOString() || null,
    notes: a.notes,
    job: a.job
  }));
  return <><PageHeader
    title="Application tracker"
    description="Keep each opportunity in a clear pipeline from application to outcome." /><ApplicationTracker initial={initial} /></>;
}
