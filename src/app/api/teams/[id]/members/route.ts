import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, readJson, requireApiUser } from "@/lib/api";
import { notifyUser } from "@/lib/activity";

const schema = z.object({ userId: z.string().uuid(), role: z.string().trim().max(60).default("Member") });

export async function POST(request: Request, context: { params: Promise<{ id: string; }>; }) {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Invalid member", 422, parsed.error.flatten());

  const team = await prisma.team.findFirst({ where: { id, createdById: sessionUser.id }, include: { hackathon: true } });
  if (!team) return jsonError("Only the team creator can invite members", 403);

  const member = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: id, userId: parsed.data.userId } },
    create: { teamId: id, userId: parsed.data.userId, role: parsed.data.role, status: "INVITED" },
    update: { role: parsed.data.role, status: "INVITED" },
  });
  await notifyUser(parsed.data.userId, "HACKATHON", "Team invitation", `You were invited to ${team.name} for ${team.hackathon.name}.`, "/hackathons");
  return jsonSuccess(member, 201);
}
