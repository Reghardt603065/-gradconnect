import { prisma } from "@/lib/prisma";
import { teamSchema } from "@/lib/validation";
import {
  jsonError,
  jsonSuccess,
  readJson,
  requireApiUser,
} from "@/lib/api";

export async function GET() {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const teams = await prisma.team.findMany({
    where: {
      OR: [
        {
          createdById: sessionUser.id,
        },
        {
          members: {
            some: {
              userId: sessionUser.id,
              status: "ACTIVE",
            },
          },
        },
      ],
    },
    include: {
      hackathon: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return jsonSuccess(teams);
}

export async function POST(request: Request) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = teamSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError(
      "Invalid team",
      422,
      parsed.error.flatten(),
    );
  }

  const participant = await prisma.hackathonParticipant.findUnique({
    where: {
      userId_hackathonId: {
        userId: sessionUser.id,
        hackathonId: parsed.data.hackathonId,
      },
    },
  });

  if (!participant) {
    return jsonError(
      "Join the hackathon before creating a team",
      409,
    );
  }

  const team = await prisma.team.create({
    data: {
      hackathonId: parsed.data.hackathonId,
      createdById: sessionUser.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      repositoryUrl: parsed.data.repositoryUrl || null,
      members: {
        create: {
          userId: sessionUser.id,
          role: "Team Lead",
          status: "ACTIVE",
        },
      },
    },
    include: {
      members: true,
    },
  });

  return jsonSuccess(team, 201);
}
