import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, readJson, requireApiUser } from "@/lib/api";
import { hackathonSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);

  const q = new URL(request.url).searchParams.get("q")?.trim() || "";

  const hackathons = await prisma.hackathon.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
            { technologies: { has: q } },
          ],
        }
      : {},
    include: {
      participants: { where: { userId: sessionUser.id }, select: { id: true } },
      _count: { select: { participants: true, teams: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return jsonSuccess(hackathons);
}

export async function POST(request: Request) {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);

  const parsed = hackathonSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError("Invalid hackathon", 422, parsed.error.flatten());
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, role: true },
  });

  if (!user) return jsonError("Unauthorized", 401);

  const data = parsed.data;
  const commonData = {
    name: data.name,
    description: data.description,
    location: data.location || null,
    mode: data.mode,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    registrationDeadline: data.registrationDeadline
      ? new Date(data.registrationDeadline)
      : null,
    websiteUrl: data.websiteUrl || null,
    technologies: data.technologies,
  };

  // Admins may still add a verified event directly.
  if (user.role === "ADMIN") {
    const hackathon = await prisma.hackathon.create({
      data: {
        ...commonData,
        source: "GradConnect Community",
        createdById: user.id,
      },
    });

    return jsonSuccess(
      {
        kind: "PUBLISHED" as const,
        hackathon,
      },
      201,
    );
  }

  // Normal users submit for approval instead of publishing directly.
  const submission = await prisma.hackathonSubmission.create({
    data: {
      ...commonData,
      submittedById: user.id,
    },
    select: {
      id: true,
      name: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      publishedHackathonId: true,
    },
  });

  return jsonSuccess(
    {
      kind: "PENDING" as const,
      submission,
    },
    202,
  );
}
