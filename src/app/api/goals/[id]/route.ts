import { prisma } from "@/lib/prisma";
import { goalSchema } from "@/lib/validation";
import {
  jsonError,
  jsonSuccess,
  readJson,
  requireApiUser,
} from "@/lib/api";
import {
  notifyUserIfEnabled,
  recordActivity,
} from "@/lib/activity";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await context.params;
  const parsed = goalSchema.partial().safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError(
      "Invalid goal update",
      422,
      parsed.error.flatten(),
    );
  }

  const existing = await prisma.goal.findFirst({
    where: {
      id,
      ownerId: sessionUser.id,
    },
  });

  if (!existing) {
    return jsonError("Goal not found", 404);
  }

  const goal = await prisma.goal.update({
    where: {
      id,
    },
    data: {
      ...parsed.data,
      partnerId:
        parsed.data.partnerId === undefined
          ? undefined
          : parsed.data.partnerId || null,
      targetDate: parsed.data.targetDate
        ? new Date(parsed.data.targetDate)
        : parsed.data.targetDate === null
          ? null
          : undefined,
    },
  });

  await recordActivity(
    sessionUser.id,
    "GOAL_UPDATED",
    `Updated goal: ${goal.title}`,
    {
      progress: goal.progress,
      status: goal.status,
    },
  );

  const progressChanged = goal.progress !== existing.progress;
  const statusChanged = goal.status !== existing.status;

  if (goal.partnerId && (progressChanged || statusChanged)) {
    const statusMessage =
      goal.status === "COMPLETED"
        ? `The shared goal "${goal.title}" was completed.`
        : `"${goal.title}" is now ${goal.progress}% complete.`;

    await notifyUserIfEnabled(
      goal.partnerId,
      "peerUpdates",
      "PEER",
      "Shared goal updated",
      statusMessage,
      "/peers",
    );
  }

  return jsonSuccess(goal);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await context.params;
  const existing = await prisma.goal.findFirst({
    where: {
      id,
      ownerId: sessionUser.id,
    },
  });

  if (!existing) {
    return jsonError("Goal not found", 404);
  }

  await prisma.goal.delete({
    where: {
      id,
    },
  });

  if (existing.partnerId) {
    await notifyUserIfEnabled(
      existing.partnerId,
      "peerUpdates",
      "PEER",
      "Shared goal removed",
      `The shared goal "${existing.title}" was removed.`,
      "/peers",
    );
  }

  return jsonSuccess({ deleted: true });
}
