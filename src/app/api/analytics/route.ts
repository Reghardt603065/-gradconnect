import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, requireApiUser } from "@/lib/api";

export async function GET() {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);

  const [
    applications,
    certifications,
    hackathons,
    projects,
    goals,
    activities
  ] = await Promise.all([
    prisma.jobApplication.groupBy({ by: ["status"], where: { userId: sessionUser.id }, _count: true }),
    prisma.certification.groupBy({
      by: ["status"],
      where: { userId: sessionUser.id },
      _count: true,
      _avg: { progress: true }
    }),
    prisma.hackathonParticipant.count({ where: { userId: sessionUser.id } }),
    prisma.portfolioProject.count({ where: { userId: sessionUser.id } }),
    prisma.goal.findMany({ where: { ownerId: sessionUser.id }, select: { progress: true, status: true } }),
    prisma.activity.findMany({ where: { userId: sessionUser.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const activeGoalProgress = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0;
  const momentumScore = Math.min(
    100,
    projects * 10 + hackathons * 8 + certifications.reduce((sum, item) => sum + (item._count || 0) * 6, 0) + Math.round(activities.length * 1.5),
  );

  return jsonSuccess({
    applications,
    certifications,
    hackathons,
    projects,
    goals,
    activeGoalProgress,
    momentumScore,
    activities
  });
}
