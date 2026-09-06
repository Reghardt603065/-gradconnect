import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { TeamList } from "@/components/team-list";

export default async function TeamsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const teams = await prisma.team.findMany({
    where: {
      OR: [
        {
          createdById: userId,
        },
        {
          members: {
            some: {
              userId,
              status: {
                in: ["INVITED", "ACTIVE"],
              },
            },
          },
        },
      ],
    },
    include: {
      hackathon: {
        select: {
          name: true,
          startDate: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      members: {
        select: {
          userId: true,
          status: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const initial = teams.map((team) => {
    const ownMembership = team.members.find(
      (member) => member.userId === userId,
    );

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      repositoryUrl: team.repositoryUrl,
      hackathon: {
        ...team.hackathon,
        startDate: team.hackathon.startDate.toISOString(),
      },
      createdBy: team.createdBy,
      membershipStatus:
        team.createdById === userId
          ? "ACTIVE"
          : ownMembership?.status || "INVITED",
      memberCount: team.members.filter(
        (member) => member.status === "ACTIVE",
      ).length,
    };
  });

  return (
    <>
      <PageHeader
        title="Teams"
        description="Manage hackathon invitations and open shared team workspaces."
      />
      <TeamList initial={initial} />
    </>
  );
}
