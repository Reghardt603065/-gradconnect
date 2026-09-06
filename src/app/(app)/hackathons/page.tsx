import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { HackathonBrowser } from "@/components/hackathon-browser";
import { PageHeader } from "@/components/page-header";
import { discoverSouthAfricaHackathons } from "@/lib/hackathon-sources/devpost";
import { prisma } from "@/lib/prisma";

export default async function HackathonsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [rows, discovered] = await Promise.all([
    prisma.hackathon.findMany({
      include: {
        participants: {
          where: {
            userId: session.user.id,
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
    canDelete: hackathon.createdById === session.user.id,
  }));

  return (
    <>
      <PageHeader
        title="Hackathons"
        description="Discover current hackathons in South Africa, join GradConnect events, build a team, or create your own South African event."
      />

      <HackathonBrowser
        initial={[...publicHackathons, ...communityHackathons]}
      />
    </>
  );
}
