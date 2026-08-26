import { prisma } from "@/lib/prisma";

export async function subscribeToProject(
  projectId: string,
  studentId: string
) {
  const project = await prisma.companyProject.findUnique({
    where: { id: projectId },
    include: {
      subscriptions: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  if (project.status === "CLOSED") {
    throw new Error("This project is closed and is no longer accepting students.");
  }

  if (project.status === "FULL") {
    throw new Error("This project is full and is no longer accepting students.");
  }

  if (project.status !== "ACTIVE") {
    throw new Error("This project is not accepting students.");
  }

  const existing = await prisma.projectSubscription.findUnique({
    where: {
      projectId_studentId: {
        projectId,
        studentId,
      },
    },
  });

  if (existing?.status === "ACTIVE") {
    throw new Error("You are already subscribed to this project.");
  }

  if (project.subscriptions.length >= project.maxParticipants) {
    await prisma.companyProject.update({
      where: { id: projectId },
      data: { status: "FULL" },
    });

    throw new Error(
      "This project has reached the maximum number of students."
    );
  }

  const subscription = existing
    ? await prisma.projectSubscription.update({
        where: { id: existing.id },
        data: { status: "ACTIVE" },
      })
    : await prisma.projectSubscription.create({
        data: {
          projectId,
          studentId,
          status: "ACTIVE",
        },
      });

  const activeCount = await prisma.projectSubscription.count({
    where: {
      projectId,
      status: "ACTIVE",
    },
  });

  if (activeCount >= project.maxParticipants) {
    await prisma.companyProject.update({
      where: { id: projectId },
      data: { status: "FULL" },
    });
  }

  return { subscription };
}

export async function withdrawFromProject(
  projectId: string,
  studentId: string
) {
  const subscription = await prisma.projectSubscription.findUnique({
    where: {
      projectId_studentId: {
        projectId,
        studentId,
      },
    },
  });

  if (!subscription || subscription.status !== "ACTIVE") {
    throw new Error("Active subscription not found.");
  }

  const updated = await prisma.projectSubscription.update({
    where: { id: subscription.id },
    data: { status: "WITHDRAWN" },
  });

  const project = await prisma.companyProject.findUnique({
    where: { id: projectId },
  });

  /*
   * Only FULL projects can reopen automatically.
   *
   * A CLOSED project must remain CLOSED because that was
   * an intentional decision made by the company.
   */
  if (project && project.status === "FULL") {
    const activeCount = await prisma.projectSubscription.count({
      where: {
        projectId,
        status: "ACTIVE",
      },
    });

    if (activeCount < project.maxParticipants) {
      await prisma.companyProject.update({
        where: { id: projectId },
        data: { status: "ACTIVE" },
      });
    }
  }

  return updated;
}

export async function getStudentProjects(studentId: string) {
  return prisma.projectSubscription.findMany({
    where: {
      studentId,
      status: {
        in: ["ACTIVE", "COMPLETED"],
      },
    },
    include: {
      project: {
        include: {
          company: true,
        },
      },
    },
    orderBy: {
      subscribedAt: "desc",
    },
  });
}

export async function getProjectSubscribers(
  projectId: string,
  ownerId: string
) {
  const project = await prisma.companyProject.findFirst({
    where: {
      id: projectId,
      company: {
        ownerId,
      },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  return prisma.projectSubscription.findMany({
    where: {
      projectId,
      status: "ACTIVE",
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          skills: true,
        },
      },
    },
    orderBy: {
      subscribedAt: "asc",
    },
  });
}
