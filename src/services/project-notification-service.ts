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

function formatMeetingDate(value: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(value);
}

type MeetingSnapshot = {
  title: string;
  teamsMeetingAt: Date | null;
  teamsMeetingUrl: string | null;
};

export async function notifyProjectSubscribersOfMeetingChange(
  projectId: string,
  subscriberIds: string[],
  before: MeetingSnapshot,
  after: MeetingSnapshot,
) {
  try {
    if (!subscriberIds.length) return;

    const beforeTime = before.teamsMeetingAt?.getTime() ?? null;
    const afterTime = after.teamsMeetingAt?.getTime() ?? null;
    const timeChanged = beforeTime !== afterTime;
    const linkChanged =
      (before.teamsMeetingUrl || "") !== (after.teamsMeetingUrl || "");

    if (!timeChanged && !linkChanged) return;

    let title = "Project Teams meeting updated";
    let message = `${after.title} has an updated Microsoft Teams meeting.`;

    if (!before.teamsMeetingAt && after.teamsMeetingAt) {
      title = "Project meeting scheduled";
      message = `${after.title} is now scheduled for ${formatMeetingDate(after.teamsMeetingAt)}.`;
    } else if (before.teamsMeetingAt && !after.teamsMeetingAt) {
      title = "Project meeting schedule removed";
      message = `The scheduled Microsoft Teams meeting for ${after.title} was removed. Check the project for the latest details.`;
    } else if (timeChanged && after.teamsMeetingAt) {
      title = "Project meeting rescheduled";
      message = `${after.title} was rescheduled to ${formatMeetingDate(after.teamsMeetingAt)}.`;
    } else if (linkChanged) {
      title = "Project Teams link updated";
      message = `The Microsoft Teams join link for ${after.title} was updated.`;
    }

    await prisma.notification.createMany({
      data: subscriberIds.map((userId) => ({
        userId,
        type: "PROJECT" as const,
        title,
        message,
        link: `/projects/${projectId}`,
      })),
    });
  } catch (error) {
    console.error("Could not notify project subscribers about meeting changes", error);
  }
}
