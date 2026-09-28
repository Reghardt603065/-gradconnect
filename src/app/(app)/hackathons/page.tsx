import { HackathonBrowser } from "@/components/hackathon-browser";
import { PageHeader } from "@/components/page-header";
import { discoverSouthAfricaHackathons } from "@/lib/hackathon-sources/devpost";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-user";

export default async function HackathonsPage() {
  const user = await requireUser();

  const [rows, discovered, submissions] = await Promise.all([
    prisma.hackathon.findMany({
      include: {
        participants: {
          where: {
            userId: user.id,
          },
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            participants: true,
            teams: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    }),
    discoverSouthAfricaHackathons(),
    prisma.hackathonSubmission.findMany({
      where: {
        submittedById: user.id,
      },
      orderBy: {
        submittedAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        name: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        publishedHackathonId: true,
      },
    }),
  ]);

  const publicHackathons = discovered.map((hackathon) => ({
    ...hackathon,
    canDelete: false,
  }));

  const communityHackathons = rows.map((hackathon) => ({
    id: hackathon.id,
    name: hackathon.name,
    description: hackathon.description,
    location: hackathon.location,
    mode: hackathon.mode,
    startDate: hackathon.startDate.toISOString(),
    endDate: hackathon.endDate.toISOString(),
    registrationDeadline:
      hackathon.registrationDeadline?.toISOString() || null,
    websiteUrl: hackathon.websiteUrl,
    technologies: hackathon.technologies,
    source: hackathon.source,
    joined: hackathon.participants.length > 0,
    participants: hackathon._count.participants,
    teams: hackathon._count.teams,
    external: false as const,
    dateLabel: null,
    availabilityLabel: "GradConnect community",
    canDelete: hackathon.createdById === user.id,
  }));

  return (
    <>
      <PageHeader
        title="Hackathons"
        description="Discover current hackathons in South Africa, join GradConnect events, build a team, or submit your own event for admin approval."
      />

      <HackathonBrowser
        initial={[...publicHackathons, ...communityHackathons]}
        isAdmin={user.role === "ADMIN"}
        initialSubmissions={submissions.map((submission) => ({
          id: submission.id,
          name: submission.name,
          status: submission.status,
          submittedAt: submission.submittedAt.toISOString(),
          reviewedAt: submission.reviewedAt?.toISOString() || null,
          publishedHackathonId: submission.publishedHackathonId,
        }))}
      />
    </>
  );
}
