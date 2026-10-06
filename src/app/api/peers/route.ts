import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, readJson, requireApiUser } from "@/lib/api";
import { notifyUserIfEnabled } from "@/lib/activity";

const schema = z.object({
  addresseeId: z.string().uuid(),
  relationship: z.enum(["PEER", "MENTOR", "MENTEE"]).default("PEER"),
});

export async function GET() {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);
  if (sessionUser.role !== "GRADUATE") {
    return jsonError("Peer connections are only available to graduate accounts.", 403);
  }

  const [links, people] = await Promise.all([
    prisma.peerLink.findMany({
      where: {
        AND: [
          { OR: [{ requesterId: sessionUser.id }, { addresseeId: sessionUser.id }] },
          { requester: { is: { role: "GRADUATE" } } },
          { addressee: { is: { role: "GRADUATE" } } },
        ],
      },
      include: {
        requester: { select: { id: true, name: true, username: true, headline: true, skills: true } },
        addressee: { select: { id: true, name: true, username: true, headline: true, skills: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        id: { not: sessionUser.id },
        role: "GRADUATE",
      },
      select: { id: true, name: true, username: true, headline: true, skills: true },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return jsonSuccess({ links, people });
}

export async function POST(request: Request) {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);
  if (sessionUser.role !== "GRADUATE") {
    return jsonError("Only graduate accounts can send friend requests.", 403);
  }
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Invalid peer request", 422, parsed.error.flatten());
  if (parsed.data.addresseeId === sessionUser.id) return jsonError("You cannot connect to yourself");

  const addressee = await prisma.user.findUnique({
    where: { id: parsed.data.addresseeId },
    select: { id: true, role: true },
  });
  if (!addressee) return jsonError("User not found", 404);
  if (addressee.role !== "GRADUATE") {
    return jsonError("Graduate accounts can only connect with other graduates.", 403);
  }

  const link = await prisma.peerLink.upsert({
    where: {
      requesterId_addresseeId: { requesterId: sessionUser.id, addresseeId: parsed.data.addresseeId }
    },
    create: {
      requesterId: sessionUser.id,
      addresseeId: parsed.data.addresseeId,
      relationship: parsed.data.relationship
    },
    update: { relationship: parsed.data.relationship, status: "PENDING" },
  });
  await notifyUserIfEnabled(
    addressee.id,
    "peerUpdates",
    "PEER",
    "New peer connection request",
    `${sessionUser.name || "A graduate"} wants to connect with you.`,
    "/peers",
  );
  return jsonSuccess(link, 201);
}
