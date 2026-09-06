import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, readJson, requireApiUser } from "@/lib/api";
import { challengeCompletionSchema } from "@/lib/validation";
import {
  getChallengeCompletionKey,
  getTodayChallenge,
} from "@/lib/coding-challenges";
import { recordActivity } from "@/lib/activity";
import { syncUserBadges } from "@/services/badge-service";

function challengeStorageAvailable() {
  const client = prisma as unknown as Record<string, unknown>;

  return Boolean(client.codingChallengeCompletion);
}

export async function GET() {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const challenge = getTodayChallenge();
  const completionKey = getChallengeCompletionKey();

  if (!challengeStorageAvailable()) {
    return jsonSuccess({
      challenge,
      completionKey,
      completed: false,
      completion: null,
      setupRequired: true,
    });
  }

  const completion = await prisma.codingChallengeCompletion.findUnique({
    where: {
      userId_challengeKey: {
        userId: sessionUser.id,
        challengeKey: completionKey,
      },
    },
  });

  return jsonSuccess({
    challenge,
    completionKey,
    completed: Boolean(completion),
    completion,
  });
}

export async function POST(request: Request) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  if (!challengeStorageAvailable()) {
    return jsonError(
      "Growth data is not ready yet. Run npm run db:generate and npm run db:deploy, then restart the development server.",
      503,
    );
  }

  const parsed = challengeCompletionSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError(
      "Invalid challenge completion",
      422,
      parsed.error.flatten(),
    );
  }

  const expectedKey = getChallengeCompletionKey();

  if (parsed.data.challengeKey !== expectedKey) {
    return jsonError("This is not today's challenge", 409);
  }

  const existing = await prisma.codingChallengeCompletion.findUnique({
    where: {
      userId_challengeKey: {
        userId: sessionUser.id,
        challengeKey: expectedKey,
      },
    },
  });

  if (existing) {
    const updated = await prisma.codingChallengeCompletion.update({
      where: {
        id: existing.id,
      },
      data: {
        notes: parsed.data.notes || null,
      },
    });

    return jsonSuccess(updated);
  }

  const challenge = getTodayChallenge();
  const completion = await prisma.codingChallengeCompletion.create({
    data: {
      userId: sessionUser.id,
      challengeKey: expectedKey,
      notes: parsed.data.notes || null,
    },
  });

  await recordActivity(
    sessionUser.id,
    "CODING_CHALLENGE_COMPLETED",
    `Completed coding challenge: ${challenge.title}`,
    { challengeKey: expectedKey },
  );

  await syncUserBadges(sessionUser.id);

  return jsonSuccess(completion, 201);
}
