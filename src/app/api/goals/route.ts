import { prisma } from "@/lib/prisma";
import { goalSchema } from "@/lib/validation";
import {
  jsonError,
  jsonSuccess,
  readJson,
  requireApiUser,
} from "@/lib/api";
import { notifyUserIfEnabled } from "@/lib/activity";

export async function GET() {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const goals = await prisma.goal.findMany({
    where: {
      OR: [
        { ownerId: sessionUser.id },
        { partnerId: sessionUser.id },
      ],
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return jsonSuccess(goals);
}

export async function POST(request: Request) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = goalSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError("Invalid goal", 422, parsed.error.flatten());
  }

  if (parsed.data.partnerId) {
    const acceptedPeer = await prisma.peerLink.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          {
            requesterId: sessionUser.id,
            addresseeId: parsed.data.partnerId,
          },
          {
            requesterId: parsed.data.partnerId,
            addresseeId: sessionUser.id,
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!acceptedPeer) {
      return jsonError(
        "Shared goals can only be created with an accepted peer",
        409,
      );
    }
  }

  const goal = await prisma.goal.create({
    data: {
      ownerId: sessionUser.id,
      partnerId: parsed.data.partnerId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      targetDate: parsed.data.targetDate
        ? new Date(parsed.data.targetDate)
        : null,
      progress: parsed.data.progress,
      status: parsed.data.status,
    },
  });

  if (goal.partnerId) {
    await notifyUserIfEnabled(
      goal.partnerId,
      "peerUpdates",
      "PEER",
      "New shared goal",
      `${sessionUser.name || "A peer"} added you to the goal "${goal.title}".`,
      "/peers",
    );
  }

  return jsonSuccess(goal, 201);
}
