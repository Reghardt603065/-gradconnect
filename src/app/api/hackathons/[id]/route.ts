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

  const deleted = await prisma.hackathon.deleteMany({
    where: {
      id,
      createdById: sessionUser.id,
    },
  });

  if (!deleted.count) {
    return jsonError(
      "Hackathon not found or you are not allowed to delete it.",
      404,
    );
  }

  return jsonSuccess({ deleted: id });
}
