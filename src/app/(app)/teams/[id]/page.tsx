import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { TeamWorkspace } from "@/components/team-workspace";

type WorkspaceData = {
  notes?: string;
  tasks?: Array<{
    id: string;
    title: string;
    done: boolean;
    assigneeId?: string | null;
  }>;
};

export default async function TeamWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const team = await prisma.team.findUnique({
    where: {
      id,
    },
    include: {
      hackathon: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
    },
  });

  if (!team) {
    notFound();
  }

  const isCreator = team.createdById === session.user.id;
  const ownMembership = team.members.find(
    (member) => member.userId === session.user.id,
  );

  if (!isCreator && ownMembership?.status !== "ACTIVE") {
    notFound();
  }

  const candidates = isCreator
    ? await prisma.user.findMany({
        where: {
          role: "GRADUATE",
          id: {
            not: session.user.id,
          },
        },
        select: {
          id: true,
          name: true,
          username: true,
          headline: true,
        },
        orderBy: {
          name: "asc",
        },
        take: 100,
      })
    : [];

  const workspace = (team.workspaceData || {}) as WorkspaceData;

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <Link className="btn btn-secondary btn-small" href="/teams">
          ← Back to teams
        </Link>
      </div>

      <PageHeader
        title={team.name}
        description={`${team.hackathon.name} team workspace`}
      />

      <TeamWorkspace
        teamId={team.id}
        currentUserId={session.user.id}
        isCreator={isCreator}
        initialRepositoryUrl={team.repositoryUrl || ""}
        initialNotes={workspace.notes || ""}
        initialTasks={(workspace.tasks || []).map((task) => ({
          id: task.id,
          title: task.title,
          done: Boolean(task.done),
          assigneeId: task.assigneeId || null,
        }))}
        initialMembers={team.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role,
          status: member.status,
          user: member.user,
        }))}
        candidates={candidates}
      />
    </>
  );
}
