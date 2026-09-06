import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NotificationList } from "@/components/notification-list";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const rows = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  const notifications = rows.map((notification) => ({
    ...notification,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() || null,
  }));

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Job, certification, hackathon and peer updates appear here."
      />

      <NotificationList initial={notifications} />
    </>
  );
}
