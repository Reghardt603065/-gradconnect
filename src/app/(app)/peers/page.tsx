import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { PeerGoalManager } from "@/components/peer-goal-manager";
export default async function PeersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const id = session.user.id;
  const [links, people, goals] = await Promise.all([
    prisma.peerLink.findMany({
      where: { OR: [{ requesterId: id }, { addresseeId: id }] },
      include: {
        requester: { select: { id: true, name: true, username: true, headline: true, skills: true } },
        addressee: { select: { id: true, name: true, username: true, headline: true, skills: true } }
      },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.user.findMany({
      where: { id: { not: id } },
      select: { id: true, name: true, username: true, headline: true, skills: true },
      take: 30,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.goal.findMany({
      where: { OR: [{ ownerId: id }, { partnerId: id }] },
      include: { owner: { select: { id: true, name: true } }, partner: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' }
    })
  ]);
  const serialGoals = goals.map(g => ({
    ...g,
    targetDate: g.targetDate?.toISOString() || null,
    createdAt: undefined,
    updatedAt: undefined
  }));
  return <><PageHeader
    title="Peers and accountability"
    description="Connect with other graduates and turn career intentions into trackable goals." /><PeerGoalManager
      currentUserId={id}
      people={people}
      links={links.map(l => ({ ...l, createdAt: undefined, updatedAt: undefined }))}
      goals={serialGoals} /></>;
}
