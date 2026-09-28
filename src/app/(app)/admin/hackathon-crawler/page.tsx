import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { HackathonCrawlerAdmin } from "@/components/hackathon-crawler-admin";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

export default async function HackathonCrawlerAdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [targets, results] = await Promise.all([
    prisma.hackathonCrawlTarget.findMany({
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.hackathonCrawlResult.findMany({
      include: {
        target: {
          select: {
            label: true,
            url: true,
          },
        },
      },
      orderBy: {
        discoveredAt: "desc",
      },
      take: 250,
    }),
  ]);

  const sourceUrls = [...new Set(results.map((result) => result.sourceUrl))];
  const liveHackathons = sourceUrls.length
    ? await prisma.hackathon.findMany({
        where: {
          websiteUrl: {
            in: sourceUrls,
          },
        },
        select: {
          id: true,
          name: true,
          websiteUrl: true,
        },
      })
    : [];

  const liveByKey = new Map(
    liveHackathons.map((hackathon) => [
      `${hackathon.websiteUrl || ""}\u0000${hackathon.name.toLowerCase()}`,
      hackathon.id,
    ]),
  );

  return (
    <>
      <PageHeader
        title="Hackathon crawler review"
        description="Choose the pages the crawler may scan, run the crawler, review discovered events, and publish approved hackathons to GradConnect."
      />
      <HackathonCrawlerAdmin
        initialTargets={targets.map((target) => ({
          id: target.id,
          url: target.url,
          label: target.label,
          active: target.active,
          createdAt: target.createdAt.toISOString(),
        }))}
        initialResults={results.map((result) => {
          const publishedHackathonId =
            liveByKey.get(`${result.sourceUrl}\u0000${result.name.toLowerCase()}`) || null;

          return {
            id: result.id,
            name: result.name,
            description: result.description,
            startDate: result.startDate,
            endDate: result.endDate,
            location: result.location,
            mode: result.mode,
            sourceUrl: result.sourceUrl,
            status: result.status,
            discoveredAt: result.discoveredAt.toISOString(),
            reviewedAt: result.reviewedAt?.toISOString() || null,
            published: Boolean(publishedHackathonId),
            publishedHackathonId,
            target: result.target,
          };
        })}
      />
    </>
  );
}
