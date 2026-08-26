import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { HackathonBrowser } from "@/components/hackathon-browser";
import { discoverSouthAfricaHackathons } from "@/lib/hackathon-sources/devpost";

export default async function HackathonsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [rows, discovered] = await Promise.all([
    prisma.hackathon.findMany({
      include: {
        participants: { where: { userId: session.user.id }, select: { id: true } },
        _count: { select: { participants: true, teams: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    discoverSouthAfricaHackathons(),
  ]);

  const community = rows.map((h) => ({
    id: h.id,
    name: h.name,
    description: h.description,
    location: h.location,
    mode: h.mode,
    startDate: h.startDate.toISOString(),
    endDate: h.endDate.toISOString(),
    registrationDeadline: h.registrationDeadline?.toISOString() || null,
    websiteUrl: h.websiteUrl,
    technologies: h.technologies,
    source: h.source,
    joined: h.participants.length > 0,
    participants: h._count.participants,
    teams: h._count.teams,
    external: false as const,
    dateLabel: null,
    availabilityLabel: "GradConnect community",
  }));

  return (
    <>
      <PageHeader
        title="Hackathons"
        description="Discover current hackathons in South Africa, join GradConnect events, build a team, or create your own South African event."
      />
      <HackathonBrowser initial={[...discovered, ...community]} />
    </>
  );
}
