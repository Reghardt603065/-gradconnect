import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GrowthCenter } from "@/components/growth-center";
import { PageHeader } from "@/components/page-header";
import {
  getChallengeCompletionKey,
  getTodayChallenge,
} from "@/lib/coding-challenges";
import { prisma } from "@/lib/prisma";
import {
  getBadgeProgress,
  getChallengeCompletionCount,
  getUserBadges,
  syncUserBadges,
} from "@/services/badge-service";

async function getTodayCompletion(
  userId: string,
  challengeKey: string,
) {
  const client = prisma as unknown as Record<string, unknown>;

  if (!client.codingChallengeCompletion) {
    return null;
  }

  try {
    return await prisma.codingChallengeCompletion.findUnique({
      where: {
        userId_challengeKey: {
          userId,
          challengeKey,
        },
      },
    });
  } catch (error) {
    console.warn(
      "Coding challenge data is not available yet. Run Prisma generate and deploy the latest migration.",
      error,
    );

    return null;
  }
}

export default async function GrowthPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const challenge = getTodayChallenge();
  const challengeKey = getChallengeCompletionKey();

  await syncUserBadges(userId);

  const [completion, completionCount, badges, badgeProgress] =
    await Promise.all([
      getTodayCompletion(userId, challengeKey),
      getChallengeCompletionCount(userId),
      getUserBadges(userId),
      getBadgeProgress(userId),
    ]);

  return (
    <>
      <PageHeader
        title="Growth"
        description="Keep technical skills active with a daily challenge and track exactly what is left before each badge unlocks."
      />

      <GrowthCenter
        challenge={challenge}
        challengeKey={challengeKey}
        completed={Boolean(completion)}
        completionCount={completionCount}
        badges={badges.map((badge) => ({
          ...badge,
          awardedAt: badge.awardedAt.toISOString(),
        }))}
        badgeProgress={badgeProgress}
      />
    </>
  );
}
