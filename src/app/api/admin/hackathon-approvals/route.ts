import { jsonError, jsonSuccess, readJson } from "@/lib/api";
import { requireAdminApiUser } from "@/lib/hackathon-crawler";
import { notifyUser } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requireAdminApiUser();
  if (!admin) return jsonError("Admin access required", 403);

  const status = new URL(request.url).searchParams.get("status");

  const submissions = await prisma.hackathonSubmission.findMany({
    where:
      status === "PENDING" || status === "APPROVED" || status === "REJECTED"
        ? { status }
        : undefined,
    include: {
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
    take: 250,
  });

  return jsonSuccess(submissions);
}

export async function PATCH(request: Request) {
  const admin = await requireAdminApiUser();
  if (!admin) return jsonError("Admin access required", 403);

  const body = await readJson(request);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action;

  if (!id || !["APPROVE", "REJECT"].includes(action)) {
    return jsonError("A valid submission id and action are required", 422);
  }

  const submission = await prisma.hackathonSubmission.findUnique({
    where: { id },
    include: {
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!submission) return jsonError("Hackathon submission was not found", 404);

  if (action === "REJECT") {
    if (submission.status === "APPROVED") {
      return jsonError("An approved hackathon cannot be rejected from this queue", 409);
    }

    const updated = await prisma.hackathonSubmission.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
      },
    });

    await notifyUser(
      submission.submittedById,
      "HACKATHON",
      "Hackathon submission rejected",
      `Your hackathon '${submission.name}' was not approved.`,
      "/hackathons",
    );

    return jsonSuccess(updated);
  }

  if (submission.status === "APPROVED" && submission.publishedHackathonId) {
    const current = await prisma.hackathonSubmission.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
      },
    });
    return jsonSuccess(current);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const liveHackathon = await tx.hackathon.create({
      data: {
        createdById: submission.submittedById,
        name: submission.name,
        description: submission.description,
        location: submission.location,
        mode: submission.mode,
        startDate: submission.startDate,
        endDate: submission.endDate,
        registrationDeadline: submission.registrationDeadline,
        websiteUrl: submission.websiteUrl,
        technologies: submission.technologies,
        source: "GradConnect Community",
      },
    });

    return tx.hackathonSubmission.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
        publishedHackathonId: liveHackathon.id,
      },
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
      },
    });
  });

  await notifyUser(
    submission.submittedById,
    "HACKATHON",
    "Hackathon approved",
    `Your hackathon '${submission.name}' was approved and is now live on GradConnect.`,
    "/hackathons",
  );

  return jsonSuccess(updated);
}
