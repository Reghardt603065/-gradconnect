import { prisma } from "@/lib/prisma";
import {
  jsonError,
  jsonSuccess,
  readJson,
  requireApiUser,
} from "@/lib/api";
import { teamWorkspaceSchema } from "@/lib/validation";
import { recordActivity } from "@/lib/activity";

async function findActiveMembership(teamId: string, userId: string) {
  return prisma.team.findFirst({
    where: {
      id: teamId,
      OR: [
        {
          createdById: userId,
        },
        {
          members: {
            some: {
              userId,
              status: "ACTIVE",
            },
          },
        },
      ],
    },
  });
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
  const existing = await findActiveMembership(id, sessionUser.id);

  if (!existing) {
    return jsonError("Team not found", 404);
  }

  const parsed = teamWorkspaceSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError(
      "Invalid workspace update",
      422,
      parsed.error.flatten(),
    );
  }

  const activeMembers = await prisma.teamMember.findMany({
    where: {
      teamId: id,
      status: "ACTIVE",
    },
    select: {
      userId: true,
    },
  });

  const activeMemberIds = new Set(
    activeMembers.map((member) => member.userId),
  );

  const invalidAssignment = parsed.data.tasks.some(
    (task) =>
      task.assigneeId && !activeMemberIds.has(task.assigneeId),
  );

  if (invalidAssignment) {
    return jsonError(
      "Tasks can only be assigned to active team members",
      422,
    );
  }

  const workspaceData = {
    notes: parsed.data.notes,
    tasks: parsed.data.tasks,
  };

  const team = await prisma.team.update({
    where: {
      id,
    },
    data: {
      repositoryUrl: parsed.data.repositoryUrl || null,
      workspaceData,
    },
  });

  await recordActivity(
    sessionUser.id,
    "TEAM_UPDATED",
    `Updated team workspace: ${team.name}`,
    { teamId: team.id },
  );

  return jsonSuccess(team);
}
