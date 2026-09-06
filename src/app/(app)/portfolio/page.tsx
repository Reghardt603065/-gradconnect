import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { PortfolioManager } from "@/components/portfolio-manager";

export default async function PortfolioPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, rows] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        username: true,
        githubUsername: true,
      },
    }),
    prisma.portfolioProject.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        attachments: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: [
        { featured: "desc" },
        { updatedAt: "desc" },
      ],
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const initial = rows.map((project) => ({
    ...project,
    createdAt: undefined,
    updatedAt: undefined,
    attachments: project.attachments.map((attachment) => ({
      ...attachment,
      createdAt: attachment.createdAt.toISOString(),
    })),
  }));

  return (
    <>
      <PageHeader
        title="Portfolio builder"
        description="Manage your projects and GitHub repositories."
      />

      <PortfolioManager
        initial={initial}
        username={user.username}
        githubUsername={user.githubUsername}
      />
    </>
  );
}
