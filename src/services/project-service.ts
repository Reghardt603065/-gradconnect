import { prisma } from "@/lib/prisma";
import { notifyStudentsOfNewProject } from "@/services/project-notification-service";

export async function getCompanyForUser(
  userId: string
) {
  return prisma.company.findUnique({
    where: { ownerId: userId },
  });
}

export async function createCompanyForUser(
  userId: string,
  data: {
    name: string;
    email: string;
    contactPerson?: string;
    phone?: string;
    website?: string;
    linkedinUrl?: string;
    description?: string;
  }
) {
  return prisma.company.upsert({
    where: { ownerId: userId },
    update: data,
    create: {
      ownerId: userId,
      ...data,
    },
  });
}

export async function createProjectForUser(
  userId: string,
  data: {
    title: string;
    category: string;
    summary: string;
    description: string;
    requirements: string;
    expectedOutcome?: string;
    technologies: string[];
    contactEmail: string;
    contactPhone?: string;
    githubUrl?: string;
    liveDemoUrl?: string;
    maxParticipants: number;
  }
) {
  const company =
    await getCompanyForUser(userId);

  if (!company) {
    throw new Error(
      "Register your company profile before posting a project."
    );
  }

  const project =
    await prisma.companyProject.create({
      data: {
        companyId: company.id,
        ...data,
      },
      include: {
        company: true,
      },
    });

  await notifyStudentsOfNewProject(project.id);

  return project;
}

export async function getAvailableProjects() {
  const projects =
    await prisma.companyProject.findMany({
      where: {
        status: {
          in: ["ACTIVE", "FULL"],
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  return projects.map((project) => ({
    id: project.id,
    title: project.title,
    category: project.category,
    summary: project.summary,
    technologies: project.technologies,
    status: project.status,
    company: project.company,
    subscribedStudents:
      project.subscriptions.length,
    availableSpaces: Math.max(
      0,
      project.maxParticipants -
        project.subscriptions.length
    ),
    maxParticipants:
      project.maxParticipants,
  }));
}

export async function getProjectForUser(
  projectId: string,
  userId: string
) {
  const project =
    await prisma.companyProject.findUnique({
      where: {
        id: projectId,
      },
      include: {
        company: true,
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
          select: {
            id: true,
            studentId: true,
          },
        },
      },
    });

  if (!project) {
    throw new Error("Project not found.");
  }

  const subscribed =
    project.subscriptions.some(
      (subscription) =>
        subscription.studentId === userId
    );

  const owner =
    project.company.ownerId === userId;

  return {
    id: project.id,
    title: project.title,
    category: project.category,
    summary: project.summary,
    description: project.description,
    requirements: project.requirements,
    expectedOutcome:
      project.expectedOutcome,
    technologies: project.technologies,
    status: project.status,

    company: {
      id: project.company.id,
      name: project.company.name,
      website: project.company.website,
      linkedinUrl:
        project.company.linkedinUrl,
    },

    subscribedStudents:
      project.subscriptions.length,

    availableSpaces: Math.max(
      0,
      project.maxParticipants -
        project.subscriptions.length
    ),

    maxParticipants:
      project.maxParticipants,

    subscribed,
    owner,

    contactEmail:
      subscribed || owner
        ? project.contactEmail
        : null,

    contactPhone:
      subscribed || owner
        ? project.contactPhone
        : null,

    githubUrl:
      subscribed || owner
        ? project.githubUrl
        : null,

    liveDemoUrl:
      project.liveDemoUrl,
  };
}

export async function getCompanyProjects(
  userId: string
) {
  const company =
    await getCompanyForUser(userId);

  if (!company) {
    return {
      company: null,
      projects: [],
    };
  }

  const projects =
    await prisma.companyProject.findMany({
      where: {
        companyId: company.id,
      },
      include: {
        subscriptions: {
          where: {
            status: {
              in: [
                "ACTIVE",
                "COMPLETED",
              ],
            },
          },
          select: {
            id: true,
            status: true,
            subscribedAt: true,
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  return {
    company,
    projects,
  };
}

/**
 * Dashboard activity for a company.
 *
 * Includes recent projects posted by the company
 * and recent student subscriptions to those projects.
 */
export async function getCompanyDashboardActivity(
  userId: string
) {
  const company =
    await getCompanyForUser(userId);

  if (!company) {
    return [];
  }

  const projects =
    await prisma.companyProject.findMany({
      where: {
        companyId: company.id,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

  if (!projects.length) {
    return [];
  }

  const projectIds =
    projects.map(
      (project) => project.id
    );

  const subscriptions =
    await prisma.projectSubscription.findMany({
      where: {
        projectId: {
          in: projectIds,
        },
        status: {
          in: [
            "ACTIVE",
            "COMPLETED",
            "WITHDRAWN",
          ],
        },
      },
      select: {
        id: true,
        status: true,
        subscribedAt: true,
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        student: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        subscribedAt: "desc",
      },
      take: 15,
    });

  const activity = [
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      type: "PROJECT_CREATED" as const,
      date: project.createdAt,
      projectTitle: project.title,
      studentName: null,
      status: null,
    })),

    ...subscriptions.map(
      (subscription) => ({
        id: `subscription-${subscription.id}`,
        type: "SUBSCRIPTION" as const,
        date: subscription.subscribedAt,
        projectTitle:
          subscription.project.title,
        studentName:
          subscription.student.name,
        status: subscription.status,
      })
    ),
  ];

  return activity
    .sort(
      (a, b) =>
        b.date.getTime() -
        a.date.getTime()
    )
    .slice(0, 10);
}

export async function updateProjectForUser(
  userId: string,
  projectId: string,
  data: {
    title?: string;
    category?: string;
    summary?: string;
    description?: string;
    requirements?: string;
    expectedOutcome?: string;
    technologies?: string[];
    contactEmail?: string;
    contactPhone?: string;
    githubUrl?: string;
    liveDemoUrl?: string;
    maxParticipants?: number;
    status?: "ACTIVE" | "FULL" | "CLOSED";
  }
) {
  const company =
    await getCompanyForUser(userId);

  if (!company) {
    throw new Error(
      "Company profile not found."
    );
  }

  const existing =
    await prisma.companyProject.findFirst({
      where: {
        id: projectId,
        companyId: company.id,
      },
    });

  if (!existing) {
    throw new Error("Project not found.");
  }

  /*
   * Closing a project:
   * - Project becomes CLOSED
   * - Only ACTIVE subscriptions for this
   *   specific project become COMPLETED
   */
  if (
    data.status === "CLOSED" &&
    existing.status !== "CLOSED"
  ) {
    return prisma.$transaction(
      async (tx) => {
        const updatedProject =
          await tx.companyProject.update({
            where: {
              id: projectId,
            },
            data,
          });

        await tx.projectSubscription.updateMany(
          {
            where: {
              projectId,
              status: "ACTIVE",
            },
            data: {
              status: "COMPLETED",
            },
          }
        );

        return updatedProject;
      }
    );
  }

  /*
   * First apply the requested project changes.
   */
  const updatedProject =
    await prisma.companyProject.update({
      where: {
        id: projectId,
      },
      data,
    });

  /*
   * If the project is not closed, make sure its status
   * matches the number of active subscriptions.
   *
   * Example:
   * maxParticipants = 1
   * active subscriptions = 1
   * → FULL
   */
  if (
    updatedProject.status !== "CLOSED"
  ) {
    const activeCount =
      await prisma.projectSubscription.count({
        where: {
          projectId,
          status: "ACTIVE",
        },
      });

    if (
      activeCount >=
        updatedProject.maxParticipants &&
      updatedProject.status !== "FULL"
    ) {
      return prisma.companyProject.update({
        where: {
          id: projectId,
        },
        data: {
          status: "FULL",
        },
      });
    }

    /*
     * If the company increased the participant limit,
     * allow a previously FULL project to become ACTIVE
     * again, provided it isn't closed.
     */
    if (
      activeCount <
        updatedProject.maxParticipants &&
      updatedProject.status === "FULL"
    ) {
      return prisma.companyProject.update({
        where: {
          id: projectId,
        },
        data: {
          status: "ACTIVE",
        },
      });
    }
  }

  return updatedProject;
}
