import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, requireApiUser } from "@/lib/api";
import { recordActivity } from "@/lib/activity";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  const hackathon = await prisma.hackathon.findUnique({ where: { id } });
  if (!hackathon) return jsonError("Hackathon not found", 404);
  const now = new Date();
  if (hackathon.endDate < now) return jsonError("This hackathon has already ended", 409);
  if (hackathon.registrationDeadline && hackathon.registrationDeadline < now) {
    return jsonError("Registration for this hackathon has closed", 409);
  }

  const participant = await prisma.hackathonParticipant.upsert({
    where: { userId_hackathonId: { userId: sessionUser.id, hackathonId: id } },
    create: { userId: sessionUser.id, hackathonId: id },
    update: {},
  });
  await recordActivity(sessionUser.id, "HACKATHON_JOINED", `Joined hackathon: ${hackathon.name}`, { hackathonId: id });
  return jsonSuccess(participant, 201);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  await prisma.hackathonParticipant.deleteMany({ where: { userId: sessionUser.id, hackathonId: id } });
  return jsonSuccess({ left: true });
}
