import { prisma } from "@/lib/prisma";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 86_400_000);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function notificationExists(
  userId: string,
  type: "APPLICATION" | "CERTIFICATION" | "HACKATHON",
  title: string,
  link: string,
  since: Date,
) {
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type,
      title,
      link,
      createdAt: {
        gte: since,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(existing);
}

async function createReminder(options: {
  userId: string;
  type: "APPLICATION" | "CERTIFICATION" | "HACKATHON";
  title: string;
  message: string;
  link: string;
  since: Date;
}) {
  const exists = await notificationExists(
    options.userId,
    options.type,
    options.title,
    options.link,
    options.since,
  );

  if (exists) {
    return false;
  }

  await prisma.notification.create({
    data: {
      userId: options.userId,
      type: options.type,
      title: options.title,
      message: options.message,
      link: options.link,
    },
  });

  return true;
}

export async function runCareerReminders(now = new Date()) {
  const sevenDaysFromNow = addDays(now, 7);
  const thirtyDaysFromNow = addDays(now, 30);
  const staleCertificationDate = subtractDays(now, 14);
  const oncePerDay = subtractDays(now, 1);
  const oncePerWeek = subtractDays(now, 7);

  const users = await prisma.user.findMany({
    where: {
      role: "GRADUATE",
    },
    select: {
      id: true,
      notificationPreference: true,
    },
  });

  let created = 0;

  for (const user of users) {
    const preferences = user.notificationPreference;

    if (preferences?.applicationReminders !== false) {
      const applications = await prisma.jobApplication.findMany({
        where: {
          userId: user.id,
          deadline: {
            gte: now,
            lte: sevenDaysFromNow,
          },
          status: {
            notIn: ["OFFER", "REJECTED", "WITHDRAWN"],
          },
        },
        include: {
          job: {
            select: {
              title: true,
              company: true,
            },
          },
        },
        take: 10,
      });

      for (const application of applications) {
        if (!application.deadline) {
          continue;
        }

        const made = await createReminder({
          userId: user.id,
          type: "APPLICATION",
          title: `Application deadline: ${application.job.title}`,
          message: `${application.job.company} has a tracked deadline on ${formatDate(application.deadline)}.`,
          link: "/applications",
          since: oncePerDay,
        });

        if (made) {
          created += 1;
        }
      }
    }

    if (preferences?.certificationReminders !== false) {
      const expiring = await prisma.certification.findMany({
        where: {
          userId: user.id,
          expiryDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
        take: 10,
      });

      for (const certification of expiring) {
        if (!certification.expiryDate) {
          continue;
        }

        const made = await createReminder({
          userId: user.id,
          type: "CERTIFICATION",
          title: `Certification expiring: ${certification.name}`,
          message: `${certification.name} expires on ${formatDate(certification.expiryDate)}.`,
          link: "/certifications",
          since: oncePerWeek,
        });

        if (made) {
          created += 1;
        }
      }

      const incomplete = await prisma.certification.findMany({
        where: {
          userId: user.id,
          status: {
            in: ["PLANNED", "IN_PROGRESS"],
          },
          progress: {
            lt: 100,
          },
          updatedAt: {
            lte: staleCertificationDate,
          },
        },
        orderBy: {
          updatedAt: "asc",
        },
        take: 3,
      });

      for (const certification of incomplete) {
        const made = await createReminder({
          userId: user.id,
          type: "CERTIFICATION",
          title: `Continue learning: ${certification.name}`,
          message: `Your ${certification.name} progress is currently ${certification.progress}%.`,
          link: "/certifications",
          since: oncePerWeek,
        });

        if (made) {
          created += 1;
        }
      }
    }

    if (preferences?.hackathonReminders !== false) {
      const participations = await prisma.hackathonParticipant.findMany({
        where: {
          userId: user.id,
          hackathon: {
            OR: [
              {
                registrationDeadline: {
                  gte: now,
                  lte: sevenDaysFromNow,
                },
              },
              {
                startDate: {
                  gte: now,
                  lte: sevenDaysFromNow,
                },
              },
            ],
          },
        },
        include: {
          hackathon: true,
        },
        take: 10,
      });

      for (const participation of participations) {
        const hackathon = participation.hackathon;
        const relevantDate =
          hackathon.registrationDeadline && hackathon.registrationDeadline >= now
            ? hackathon.registrationDeadline
            : hackathon.startDate;

        const made = await createReminder({
          userId: user.id,
          type: "HACKATHON",
          title: `Hackathon reminder: ${hackathon.name}`,
          message: `${hackathon.name} has an important date on ${formatDate(relevantDate)}.`,
          link: "/hackathons",
          since: oncePerDay,
        });

        if (made) {
          created += 1;
        }
      }
    }
  }

  return {
    usersChecked: users.length,
    notificationsCreated: created,
    completedAt: new Date().toISOString(),
  };
}
