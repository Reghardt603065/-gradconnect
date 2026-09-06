import type {
  ActivityType,
  NotificationType,
  Prisma,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

type PreferenceKey =
  | "newJobs"
  | "applicationReminders"
  | "certificationReminders"
  | "peerUpdates"
  | "hackathonReminders";

export async function recordActivity(
  userId: string,
  type: ActivityType,
  message: string,
  metadata?: Prisma.InputJsonValue,
) {
  return prisma.activity.create({
    data: {
      userId,
      type,
      message,
      metadata,
    },
  });
}

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
    },
  });
}

export async function notifyUserIfEnabled(
  userId: string,
  preference: PreferenceKey,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
) {
  const preferences = await prisma.notificationPreference.findUnique({
    where: {
      userId,
    },
  });

  if (preferences && !preferences[preference]) {
    return null;
  }

  return notifyUser(
    userId,
    type,
    title,
    message,
    link,
  );
}
