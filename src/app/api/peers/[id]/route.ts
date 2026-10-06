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

  if (sessionUser.role !== "GRADUATE") {
    return jsonError("Peer connections are only available to graduate accounts.", 403);
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
      requester: { is: { role: "GRADUATE" } },
      addressee: { is: { role: "GRADUATE" } },
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
      "/peers",
    );
  }

  return jsonSuccess(updated);
}
