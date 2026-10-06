import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { FriendsDirectory } from "@/components/friends-directory";
import { PageHeader } from "@/components/page-header";
import { PeerGoalManager } from "@/components/peer-goal-manager";
import { prisma } from "@/lib/prisma";

export default async function PeersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "GRADUATE") {
    redirect(session.user.role === "COMPANY" ? "/dashboard/company" : "/dashboard");
  }

  const id = session.user.id;

  const [links, people, goals, friendLinks] = await Promise.all([
    prisma.peerLink.findMany({
      where: {
        AND: [
          { OR: [{ requesterId: id }, { addresseeId: id }] },
          { requester: { is: { role: "GRADUATE" } } },
          { addressee: { is: { role: "GRADUATE" } } },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true,
            headline: true,
            skills: true,
          },
        },
        addressee: {
          select: {
            id: true,
            name: true,
            username: true,
            headline: true,
            skills: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.user.findMany({
      where: {
        id: {
          not: id,
        },
        role: "GRADUATE",
      },
      select: {
        id: true,
        name: true,
        username: true,
        headline: true,
        skills: true,
      },
      take: 30,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.goal.findMany({
      where: {
        OR: [{ ownerId: id }, { partnerId: id }],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.peerLink.findMany({
      where: {
        status: "ACCEPTED",
        AND: [
          { OR: [{ requesterId: id }, { addresseeId: id }] },
          { requester: { is: { role: "GRADUATE" } } },
          { addressee: { is: { role: "GRADUATE" } } },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true,
            headline: true,
            location: true,
            skills: true,
            image: true,
            role: true,
            profileImage: {
              select: {
                id: true,
              },
            },
            _count: {
              select: {
                portfolioProjects: true,
                certifications: true,
                hackathonParticipations: true,
              },
            },
          },
        },
        addressee: {
          select: {
            id: true,
            name: true,
            username: true,
            headline: true,
            location: true,
            skills: true,
            image: true,
            role: true,
            profileImage: {
              select: {
                id: true,
              },
            },
            _count: {
              select: {
                portfolioProjects: true,
                certifications: true,
                hackathonParticipations: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const serialGoals = goals.map((goal) => ({
    ...goal,
    targetDate: goal.targetDate?.toISOString() || null,
    createdAt: undefined,
    updatedAt: undefined,
  }));

  const friends = friendLinks
    .map((link) =>
      link.requesterId === id ? link.addressee : link.requester,
    )
    .filter((person) => person.role === "GRADUATE")
    .map((person) => ({
      id: person.id,
      name: person.name,
      username: person.username,
      headline: person.headline,
      location: person.location,
      skills: person.skills,
      image: person.image,
      hasProfileImage: Boolean(person.profileImage),
      projectCount: person._count.portfolioProjects,
      certificationCount: person._count.certifications,
      hackathonCount: person._count.hackathonParticipations,
    }));

  return (
    <>
      <PageHeader
        title="Peers, friends & goals"
        description="Keep your graduate network, connection requests and accountability goals together in one place."
      />

      <FriendsDirectory friends={friends} />

      <PeerGoalManager
        currentUserId={id}
        people={people}
        links={links.map((link) => ({
          ...link,
          createdAt: undefined,
          updatedAt: undefined,
        }))}
        goals={serialGoals}
      />
    </>
  );
}
