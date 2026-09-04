import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { CertificationManager } from "@/components/certification-manager";
export default async function CertificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const certs = await prisma.certification.findMany({
    where: { userId: session.user.id },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }]
  });
  const initial = certs.map(c => ({
    ...c,
    issueDate: c.issueDate?.toISOString() || null,
    expiryDate: c.expiryDate?.toISOString() || null,
    createdAt: undefined,
    updatedAt: undefined
  }));
  return <>
    <PageHeader
      title="Certification tracker"
      description="Create a continuous skills ledger and make learning progress visible." />
    <CertificationManager initial={initial} />
  </>;
}
