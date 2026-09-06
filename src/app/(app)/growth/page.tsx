import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getChallengeCompletionKey,
  getTodayChallenge,
} from "@/lib/coding-challenges";
import { PageHeader } from "@/components/page-header";
import { GrowthCenter } from "@/components/growth-center";
import {
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

  const [completion, completionCount, badges] = await Promise.all([
    getTodayCompletion(userId, challengeKey),
    getChallengeCompletionCount(userId),
    getUserBadges(userId),
  ]);

  return (
    <>
      <PageHeader
        title="Growth"
        description="Keep technical skills active with a daily challenge and career achievements."
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
      />
    </>
  );
}
