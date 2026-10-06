import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, requireApiUser } from "@/lib/api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await context.params;
  const isAdmin = sessionUser.role === "ADMIN";

  if (id.startsWith("devpost:")) {
    if (!isAdmin) {
      return jsonError("Only admins can remove public hackathon listings.", 403);
    }

    await prisma.hiddenExternalHackathon.upsert({
      where: {
        externalId: id,
      },
      update: {
        hiddenById: sessionUser.id,
      },
      create: {
        externalId: id,
        hiddenById: sessionUser.id,
      },
    });

    return jsonSuccess({ deleted: id });
  }

  const hackathon = await prisma.hackathon.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      createdById: true,
    },
  });

  if (!hackathon) {
    return jsonError("Hackathon not found.", 404);
  }

  if (!isAdmin && hackathon.createdById !== sessionUser.id) {
    return jsonError("You are not allowed to delete this hackathon.", 403);
  }

  await prisma.hackathon.delete({
    where: {
      id,
    },
  });

  return jsonSuccess({ deleted: id });
}
