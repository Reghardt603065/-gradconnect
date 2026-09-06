import { prisma } from "@/lib/prisma";
import { notifyUser, recordActivity } from "@/lib/activity";

export type BadgeRequirement = {
  label: string;
  complete: boolean;
  current?: number;
  target?: number;
  href: string;
};

export type BadgeProgress = {
  code: string;
  name: string;
  description: string;
  unlocked: boolean;
  completedRequirements: number;
  totalRequirements: number;
  requirements: BadgeRequirement[];
};

type BadgeDefinition = {
  code: string;
  name: string;
  description: string;
  requirements: BadgeRequirement[];
};

type BadgeMetrics = {
  hasBio: boolean;
  skillCount: number;
  hasGitHub: boolean;
  applicationCount: number;
  completedCertificationCount: number;
  hackathonCount: number;
  projectCount: number;
  acceptedPeerCount: number;
  completedGoalCount: number;
  challengeCompletionCount: number;
};

function hasGrowthModels() {
  const client = prisma as unknown as Record<string, unknown>;

  return Boolean(
    client.codingChallengeCompletion &&
      client.userBadge,
  );
}

function countRequirementProgress(requirements: BadgeRequirement[]) {
  return requirements.filter((requirement) => requirement.complete).length;
}

function buildBadgeDefinitions(metrics: BadgeMetrics): BadgeDefinition[] {
  return [
    {
      code: "PROFILE_READY",
      name: "Profile Ready",
      description: "Complete the important parts of your graduate profile.",
      requirements: [
        {
          label: "Add a profile bio",
          complete: metrics.hasBio,
          href: "/profile",
        },
        {
          label: "Add at least 3 skills",
          complete: metrics.skillCount >= 3,
          current: Math.min(metrics.skillCount, 3),
          target: 3,
          href: "/profile",
        },
      ],
    },
    {
      code: "FIRST_APPLICATION",
      name: "First Application",
      description: "Start tracking your job search activity.",
      requirements: [
        {
          label: "Track your first job application",
          complete: metrics.applicationCount >= 1,
          current: Math.min(metrics.applicationCount, 1),
          target: 1,
          href: "/applications",
        },
      ],
    },
    {
      code: "APPLICATION_MOMENTUM",
      name: "Application Momentum",
      description: "Build consistent job-application momentum.",
      requirements: [
        {
          label: "Track 5 job applications",
          complete: metrics.applicationCount >= 5,
          current: Math.min(metrics.applicationCount, 5),
          target: 5,
          href: "/applications",
        },
      ],
    },
    {
      code: "CERTIFIED",
      name: "Certified",
      description: "Complete your first certification.",
      requirements: [
        {
          label: "Complete 1 certification",
          complete: metrics.completedCertificationCount >= 1,
          current: Math.min(metrics.completedCertificationCount, 1),
          target: 1,
          href: "/certifications",
        },
      ],
    },
    {
      code: "BUILDER",
      name: "Builder",
      description: "Show practical work in your portfolio.",
      requirements: [
        {
          label: "Add 1 portfolio project",
          complete: metrics.projectCount >= 1,
          current: Math.min(metrics.projectCount, 1),
          target: 1,
          href: "/portfolio",
        },
      ],
    },
    {
      code: "OPEN_SOURCE_READY",
      name: "GitHub Connected",
      description: "Connect your GitHub identity to GradConnect.",
      requirements: [
        {
          label: "Add your GitHub username to your profile",
          complete: metrics.hasGitHub,
          href: "/profile",
        },
      ],
    },
    {
      code: "HACKATHON_STARTER",
      name: "Hackathon Starter",
      description: "Take part in your first hackathon.",
      requirements: [
        {
          label: "Join 1 hackathon",
          complete: metrics.hackathonCount >= 1,
          current: Math.min(metrics.hackathonCount, 1),
          target: 1,
          href: "/hackathons",
        },
      ],
    },
    {
      code: "COLLABORATOR",
      name: "Collaborator",
      description: "Build your first accepted peer connection.",
      requirements: [
        {
          label: "Connect with 1 peer",
          complete: metrics.acceptedPeerCount >= 1,
          current: Math.min(metrics.acceptedPeerCount, 1),
          target: 1,
          href: "/peers",
        },
      ],
    },
    {
      code: "GOAL_FINISHER",
      name: "Goal Finisher",
      description: "Finish an accountability goal.",
      requirements: [
        {
          label: "Complete 1 goal that you own",
          complete: metrics.completedGoalCount >= 1,
          current: Math.min(metrics.completedGoalCount, 1),
          target: 1,
          href: "/peers",
        },
      ],
    },
    {
      code: "DAILY_CODER",
      name: "Daily Coder",
      description: "Complete your first GradConnect coding challenge.",
      requirements: [
        {
          label: "Complete 1 coding challenge",
          complete: metrics.challengeCompletionCount >= 1,
          current: Math.min(metrics.challengeCompletionCount, 1),
          target: 1,
          href: "/growth",
        },
      ],
    },
    {
      code: "CHALLENGE_STREAK",
      name: "Challenge Momentum",
      description: "Keep your technical practice moving forward.",
      requirements: [
        {
          label: "Complete 3 coding challenges",
          complete: metrics.challengeCompletionCount >= 3,
          current: Math.min(metrics.challengeCompletionCount, 3),
          target: 3,
          href: "/growth",
        },
      ],
    },
  ];
}

async function getBadgeMetrics(userId: string): Promise<BadgeMetrics | null> {
  if (!hasGrowthModels()) {
    return null;
  }

  const [
    user,
    applicationCount,
    completedCertificationCount,
    hackathonCount,
    projectCount,
    acceptedPeerCount,
    completedGoalCount,
    challengeCompletionCount,
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
    return null;
  }

  return {
    hasBio: Boolean(user.bio?.trim()),
    skillCount: user.skills.length,
    hasGitHub: Boolean(user.githubUsername?.trim()),
    applicationCount,
    completedCertificationCount,
    hackathonCount,
    projectCount,
    acceptedPeerCount,
    completedGoalCount,
    challengeCompletionCount,
  };
}

export async function getChallengeCompletionCount(userId: string) {
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

export async function getUserBadges(userId: string, take?: number) {
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

export async function getBadgeProgress(userId: string): Promise<BadgeProgress[]> {
  if (!hasGrowthModels()) {
    return [];
  }

  try {
    const metrics = await getBadgeMetrics(userId);

    if (!metrics) {
      return [];
    }

    const definitions = buildBadgeDefinitions(metrics);
    const earnedBadges = await prisma.userBadge.findMany({
      where: {
        userId,
      },
      select: {
        code: true,
      },
    });

    const earnedCodes = new Set(
      earnedBadges.map((badge) => badge.code),
    );

    return definitions.map((definition) => {
      const completedRequirements = countRequirementProgress(
        definition.requirements,
      );

      return {
        code: definition.code,
        name: definition.name,
        description: definition.description,
        unlocked: earnedCodes.has(definition.code),
        completedRequirements,
        totalRequirements: definition.requirements.length,
        requirements: definition.requirements,
      };
    });
  } catch (error) {
    console.warn(
      "Badge progress is not available yet. Run Prisma generate and deploy the latest migration.",
      error,
    );

    return [];
  }
}

export async function syncUserBadges(userId: string) {
  if (!hasGrowthModels()) {
    return [];
  }

  try {
    const metrics = await getBadgeMetrics(userId);

    if (!metrics) {
      return [];
    }

    const definitions = buildBadgeDefinitions(metrics);

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

    const unlocked = definitions.filter((badge) => {
      const allRequirementsComplete = badge.requirements.every(
        (requirement) => requirement.complete,
      );

      return allRequirementsComplete && !existingCodes.has(badge.code);
    });

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
