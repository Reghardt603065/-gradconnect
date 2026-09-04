import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { NotificationList } from "@/components/notification-list";
export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const rows = await prisma.notification.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  return <>
    <PageHeader title="Notifications" description="Job, certification, hackathon and peer updates appear here." />
    <NotificationList initial={rows.map(n => ({ ...n, createdAt: n.createdAt.toISOString(), readAt: n.readAt?.toISOString() || null }))} />
  </>;
}
