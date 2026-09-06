import { prisma } from "@/lib/prisma";
import { notifyUser, recordActivity } from "@/lib/activity";

type BadgeDefinition = {
  code: string;
  name: string;
  description: string;
  earned: boolean;
};

function hasGrowthModels() {
  const client = prisma as unknown as Record<string, unknown>;

  return Boolean(
    client.codingChallengeCompletion &&
      client.userBadge,
  );
}

export async function getChallengeCompletionCount(
  userId: string,
) {
  if (!hasGrowthModels()) {
    return 0;
  }

  try {
    return await prisma.codingChallengeCompletion.count({
      where: {
        userId,
      },
    });
  } catch (error) {
    console.warn(
      "Coding challenge data is not available yet. Run Prisma generate and deploy the latest migration.",
      error,
    );

    return 0;
  }
}

export async function getUserBadges(
  userId: string,
  take?: number,
) {
  if (!hasGrowthModels()) {
    return [];
  }

  try {
    return await prisma.userBadge.findMany({
      where: {
        userId,
      },
      orderBy: {
        awardedAt: "desc",
      },
      ...(take ? { take } : {}),
    });
  } catch (error) {
    console.warn(
      "Badge data is not available yet. Run Prisma generate and deploy the latest migration.",
      error,
    );

    return [];
  }
}

export async function syncUserBadges(
  userId: string,
) {
  if (!hasGrowthModels()) {
    return [];
  }

  try {
    const [
      user,
      applications,
      completedCertifications,
      hackathons,
      projects,
      acceptedPeers,
      completedGoals,
      challengeCompletions,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          bio: true,
          skills: true,
          githubUsername: true,
        },
      }),
      prisma.jobApplication.count({
        where: {
          userId,
        },
      }),
      prisma.certification.count({
        where: {
          userId,
          status: "COMPLETED",
        },
      }),
      prisma.hackathonParticipant.count({
        where: {
          userId,
        },
      }),
      prisma.portfolioProject.count({
        where: {
          userId,
        },
      }),
      prisma.peerLink.count({
        where: {
          status: "ACCEPTED",
          OR: [
            {
              requesterId: userId,
            },
            {
              addresseeId: userId,
            },
          ],
        },
      }),
      prisma.goal.count({
        where: {
          ownerId: userId,
          status: "COMPLETED",
        },
      }),
      prisma.codingChallengeCompletion.count({
        where: {
          userId,
        },
      }),
    ]);

    if (!user) {
      return [];
    }

    const definitions: BadgeDefinition[] = [
      {
        code: "PROFILE_READY",
        name: "Profile Ready",
        description: "Added a bio and at least three skills.",
        earned:
          Boolean(user.bio?.trim()) &&
          user.skills.length >= 3,
      },
      {
        code: "FIRST_APPLICATION",
        name: "First Application",
        description: "Tracked the first job application.",
        earned: applications >= 1,
      },
      {
        code: "APPLICATION_MOMENTUM",
        name: "Application Momentum",
        description: "Tracked five job applications.",
        earned: applications >= 5,
      },
      {
        code: "CERTIFIED",
        name: "Certified",
        description: "Completed the first certification.",
        earned: completedCertifications >= 1,
      },
      {
        code: "BUILDER",
        name: "Builder",
        description: "Added the first portfolio project.",
        earned: projects >= 1,
      },
      {
        code: "OPEN_SOURCE_READY",
        name: "GitHub Connected",
        description: "Connected a GitHub username to the profile.",
        earned: Boolean(user.githubUsername),
      },
      {
        code: "HACKATHON_STARTER",
        name: "Hackathon Starter",
        description: "Joined the first hackathon.",
        earned: hackathons >= 1,
      },
      {
        code: "COLLABORATOR",
        name: "Collaborator",
        description: "Built an accepted peer connection.",
        earned: acceptedPeers >= 1,
      },
      {
        code: "GOAL_FINISHER",
        name: "Goal Finisher",
        description: "Completed an accountability goal.",
        earned: completedGoals >= 1,
      },
      {
        code: "DAILY_CODER",
        name: "Daily Coder",
        description: "Completed the first coding challenge.",
        earned: challengeCompletions >= 1,
      },
      {
        code: "CHALLENGE_STREAK",
        name: "Challenge Momentum",
        description: "Completed at least three coding challenges.",
        earned: challengeCompletions >= 3,
      },
    ];

    const existing = await prisma.userBadge.findMany({
      where: {
        userId,
      },
      select: {
        code: true,
      },
    });

    const existingCodes = new Set(
      existing.map((badge) => badge.code),
    );

    const unlocked = definitions.filter(
      (badge) =>
        badge.earned &&
        !existingCodes.has(badge.code),
    );

    for (const badge of unlocked) {
      await prisma.userBadge.create({
        data: {
          userId,
          code: badge.code,
          name: badge.name,
          description: badge.description,
        },
      });

      await recordActivity(
        userId,
        "BADGE_EARNED",
        `Earned badge: ${badge.name}`,
        {
          badgeCode: badge.code,
        },
      );

      await notifyUser(
        userId,
        "SYSTEM",
        "New badge earned",
        `You earned the ${badge.name} badge.`,
        "/growth",
      );
    }

    return prisma.userBadge.findMany({
      where: {
        userId,
      },
      orderBy: {
        awardedAt: "desc",
      },
    });
  } catch (error) {
    console.warn(
      "Badge synchronisation is not available yet. Run Prisma generate and deploy the latest migration.",
      error,
    );

    return [];
  }
}
