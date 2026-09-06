import { prisma } from "@/lib/prisma";
import type { NormalizedJob } from "@/lib/job-sources/types";

function normalise(value: string) {
  return value.trim().toLowerCase();
}

function jobMatchScore(
  user: {
    skills: string[];
    headline: string | null;
  },
  job: NormalizedJob,
) {
  const text = [
    job.title,
    job.description,
    job.category,
    job.experienceLevel,
    job.jobType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;

  for (const skill of user.skills) {
    if (text.includes(normalise(skill))) {
      score += 20;
    }
  }

  if (user.headline) {
    const headlineWords = user.headline
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length >= 4);

    for (const word of headlineWords) {
      if (text.includes(word)) {
        score += 5;
      }
    }
  }

  return score;
}

export async function notifyUsersAboutNewJobs(
  newJobs: NormalizedJob[],
) {
  if (!newJobs.length) {
    return 0;
  }

  const users = await prisma.user.findMany({
    where: {
      role: "GRADUATE",
    },
    select: {
      id: true,
      skills: true,
      headline: true,
      notificationPreference: {
        select: {
          newJobs: true,
        },
      },
    },
  });

  let notificationsCreated = 0;

  for (const user of users) {
    if (user.notificationPreference?.newJobs === false) {
      continue;
    }

    const ranked = newJobs
      .map((job) => ({
        job,
        score: jobMatchScore(user, job),
      }))
      .sort((left, right) => right.score - left.score);

    const matches = ranked.filter((item) => item.score > 0).slice(0, 3);
    const selected = matches.length ? matches : ranked.slice(0, 1);

    if (!selected.length) {
      continue;
    }

    const topJob = selected[0].job;
    const title = matches.length
      ? `${matches.length} new job${matches.length === 1 ? "" : "s"} match your profile`
      : "New IT jobs added";

    const message = matches.length
      ? selected
          .map((item) => `${item.job.title} at ${item.job.company}`)
          .join("; ")
      : `${topJob.title} at ${topJob.company} is now available.`;

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "JOB",
        title,
        message,
        link: "/jobs",
      },
    });

    notificationsCreated += 1;
  }

  return notificationsCreated;
}
