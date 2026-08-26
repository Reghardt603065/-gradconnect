import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { southAfricaLocationWhere } from "@/lib/job-sources/south-africa";
import { PageHeader } from "@/components/page-header";
import { JobFeedRefresh } from "@/components/job-feed-refresh";
import { dedupeJobs } from "@/lib/job-sources/dedupe";
import {
  companyFamilyKey,
  inferExperienceFilter,
  inferItCategory,
  isItJob,
  jobQualityScore,
  normalizeEmploymentType,
} from "@/lib/job-sources/taxonomy";
import { JobMarketplace, type MarketplaceJob } from "@/components/job-marketplace";

function cleanDescription(value: string) {
  const text = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 320 ? `${text.slice(0, 317).trimEnd()}…` : text;
}

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // The page only reads PostgreSQL. Live sources refresh separately in the
  // background, so browsing/searching remains fast even with many providers.
  const rows = await prisma.jobListing.findMany({
    where: {
      AND: [
        southAfricaLocationWhere,
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
      ],
    },
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    take: 1200,
    select: {
      id: true,
      source: true,
      title: true,
      company: true,
      description: true,
      location: true,
      jobType: true,
      experienceLevel: true,
      category: true,
      salaryMin: true,
      salaryMax: true,
      currency: true,
      applyUrl: true,
      remote: true,
      postedAt: true,
      createdAt: true,
      savedBy: {
        where: { userId: session.user.id },
        select: { id: true },
      },
      applications: {
        where: { userId: session.user.id },
        select: { status: true },
      },
    },
  });

  const jobs: MarketplaceJob[] = dedupeJobs(rows)
    .filter(isItJob)
    .map((job) => ({
      id: job.id,
      source: job.source,
      title: job.title,
      company: job.company,
      companyFamily: companyFamilyKey(job.company),
      description: cleanDescription(job.description) || `${job.title} opportunity at ${job.company}.`,
      location: job.location || "South Africa",
      category: inferItCategory(job),
      experience: inferExperienceFilter(job),
      employment: normalizeEmploymentType(job.jobType),
      applyUrl: job.applyUrl,
      remote: job.remote,
      postedAt: job.postedAt?.toISOString() || null,
      createdAt: job.createdAt.toISOString(),
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      quality: jobQualityScore(job),
      saved: job.savedBy.length > 0,
      applicationStatus: job.applications[0]?.status,
    }));

  return (
    <>
      <PageHeader
        title="South African IT Jobs"
        description="A marketplace-style feed of software, data, cyber, cloud and IT opportunities from direct employers and South African job boards."
      />
      <JobFeedRefresh hasJobs={jobs.length > 0} />
      <JobMarketplace initialJobs={jobs} />
    </>
  );
}
