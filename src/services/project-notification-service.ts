import { prisma } from "@/lib/prisma";

export async function notifyStudentsOfNewProject(projectId: string) {
  try {
    const project = await prisma.companyProject.findUnique({
    where: { id: projectId },
    include: { company: { select: { name: true } } },
  });
  if (!project) return;

  const students = await prisma.user.findMany({
    where: { role: "GRADUATE" },
    select: { id: true },
  });
  if (!students.length) return;

    await prisma.notification.createMany({
      data: students.map((student) => ({
        userId: student.id,
        type: "PROJECT" as const,
        title: "New project opportunity",
        message: `${project.company.name} posted ${project.title}.`,
        link: `/projects/${project.id}`,
      })),
    });
  } catch (error) {
    console.error("Could not notify graduates about new project", error);
  }
}
