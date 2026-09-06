import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  jsonError,
  jsonSuccess,
  readJson,
  requireApiUser,
} from "@/lib/api";
import { notifyUser } from "@/lib/activity";

const inviteSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().trim().min(1).max(60).default("Member"),
});

const responseSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await context.params;
  const parsed = inviteSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError("Invalid member", 422, parsed.error.flatten());
  }

  if (parsed.data.userId === sessionUser.id) {
    return jsonError("You are already part of your team", 409);
  }

  const team = await prisma.team.findFirst({
    where: {
      id,
      createdById: sessionUser.id,
    },
    include: {
      hackathon: true,
    },
  });

  if (!team) {
    return jsonError("Only the team creator can invite members", 403);
  }

  const invitedUser = await prisma.user.findUnique({
    where: {
      id: parsed.data.userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!invitedUser || invitedUser.role !== "GRADUATE") {
    return jsonError("Graduate not found", 404);
  }

  const member = await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: id,
        userId: parsed.data.userId,
      },
    },
    create: {
      teamId: id,
      userId: parsed.data.userId,
      role: parsed.data.role,
      status: "INVITED",
    },
    update: {
      role: parsed.data.role,
      status: "INVITED",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });

  await notifyUser(
    parsed.data.userId,
    "HACKATHON",
    "Team invitation",
    `You were invited to ${team.name} for ${team.hackathon.name}.`,
    "/teams",
  );

  return jsonSuccess(member, 201);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await context.params;
  const parsed = responseSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError("Invalid invitation response", 422);
  }

  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: id,
        userId: sessionUser.id,
      },
    },
    include: {
      team: {
        include: {
          hackathon: true,
        },
      },
    },
  });

  if (!membership || membership.status !== "INVITED") {
    return jsonError("Invitation not found", 404);
  }

  const status = parsed.data.action === "accept" ? "ACTIVE" : "DECLINED";

  const updated = await prisma.$transaction(async (transaction) => {
    const member = await transaction.teamMember.update({
      where: {
        id: membership.id,
      },
      data: {
        status,
        joinedAt:
          parsed.data.action === "accept"
            ? new Date()
            : membership.joinedAt,
      },
    });

    if (parsed.data.action === "accept") {
      await transaction.hackathonParticipant.upsert({
        where: {
          userId_hackathonId: {
            userId: sessionUser.id,
            hackathonId: membership.team.hackathonId,
          },
        },
        create: {
          userId: sessionUser.id,
          hackathonId: membership.team.hackathonId,
        },
        update: {},
      });
    }

    return member;
  });

  if (parsed.data.action === "accept") {
    await notifyUser(
      membership.team.createdById,
      "HACKATHON",
      "Team invitation accepted",
      `${sessionUser.name || "A graduate"} joined ${membership.team.name}.`,
      `/teams/${id}`,
    );
  }

  return jsonSuccess(updated);
}
