import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  jsonError,
  jsonSuccess,
  readJson,
  requireApiUser,
} from "@/lib/api";
import { notifyUserIfEnabled } from "@/lib/activity";

const schema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED", "BLOCKED"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionUser = await requireApiUser();

  if (!sessionUser) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await context.params;
  const parsed = schema.safeParse(await readJson(request));

  if (!parsed.success) {
    return jsonError("Invalid status", 422);
  }

  const link = await prisma.peerLink.findFirst({
    where: {
      id,
      addresseeId: sessionUser.id,
    },
  });

  if (!link) {
    return jsonError("Connection request not found", 404);
  }

  const updated = await prisma.peerLink.update({
    where: {
      id,
    },
    data: {
      status: parsed.data.status,
    },
  });

  if (parsed.data.status === "ACCEPTED") {
    await notifyUserIfEnabled(
      link.requesterId,
      "peerUpdates",
      "PEER",
      "Peer request accepted",
      `${sessionUser.name || "A graduate"} accepted your connection request.`,
      "/friends",
    );
  }

  return jsonSuccess(updated);
}
