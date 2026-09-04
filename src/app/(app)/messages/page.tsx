import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { MessageCenter } from "@/components/message-center";
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ peerId?: string ;}> ;}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const id = session.user.id;
  const { peerId } = await searchParams;
  const links = await prisma.peerLink.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: id }, { addresseeId: id }] },
    include: {
      requester: { select: { id: true, name: true, username: true } },
      addressee: { select: { id: true, name: true, username: true } }
    }
  });
  const peers = links.map(l => l.requesterId === id ? l.addressee : l.requester);
  const selected = peerId && peers.some(p => p.id === peerId) ? peerId : (peers[0]?.id || null);
  const messages = selected ? await prisma.message.findMany({
    where: { OR: [{ senderId: id, receiverId: selected }, { senderId: selected, receiverId: id }] },
    include: {
      sender: { select: { id: true, name: true, username: true } },
      receiver: { select: { id: true, name: true, username: true } }
    },
    orderBy: { createdAt: 'asc' },
    take: 200
  }) : [];
  return <><PageHeader title="Messages" description="Coordinate learning goals and hackathon work with accepted peers." /><MessageCenter
    currentUserId={id}
    peers={peers}
    selectedId={selected}
    initialMessages={messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString(), readAt: undefined }))} /></>;
}
