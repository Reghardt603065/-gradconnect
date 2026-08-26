import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess, requireApiUser } from "@/lib/api";
import { southAfricaLocationWhere } from "@/lib/job-sources/south-africa";
import { dedupeJobs } from "@/lib/job-sources/dedupe";
import {
  companyFamilyKey,
  diversifyByCompany,
  inferExperienceFilter,
  inferItCategory,
  isItJob,
  jobQualityScore,
  normalizeEmploymentType,
} from "@/lib/job-sources/taxonomy";

function dateCutoff(value: string) {
  const days = value === "24h" ? 1 : value === "7d" ? 7 : value === "30d" ? 30 : 0;
  if (!days) return undefined;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

export async function GET(request: Request) {
  const sessionUser = await requireApiUser();
  if (!sessionUser) return jsonError("Unauthorized", 401);

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();
  const location = (url.searchParams.get("location") || "").trim();
  const remote = url.searchParams.get("remote");
  const source = (url.searchParams.get("source") || "").trim();
  const category = (url.searchParams.get("category") || "").trim();
  const experience = (url.searchParams.get("experience") || "").trim();
  const employment = (url.searchParams.get("employment") || "").trim();
  const date = (url.searchParams.get("date") || "").trim();
  const sort = url.searchParams.get("sort") === "newest" ? "newest" : "variety";
  const cutoff = dateCutoff(date);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") || 20)));

  const where = {
    AND: [
      southAfricaLocationWhere,
      query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              { company: { contains: query, mode: "insensitive" as const } },
              { description: { contains: query, mode: "insensitive" as const } },
              { category: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {},
      location
        ? { location: { contains: location, mode: "insensitive" as const } }
        : {},
      remote === "true" ? { remote: true } : {},
      source ? { source } : {},
      cutoff ? { postedAt: { gte: cutoff } } : {},
    ],
  };

  const rows = await prisma.jobListing.findMany({
    where,
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    take: 400,
    select: {
      id: true,
      source: true,
      externalId: true,
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
      sourceUrl: true,
      remote: true,
      postedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      savedBy: {
        where: { userId: sessionUser.id },
        select: { id: true },
      },
      applications: {
        where: { userId: sessionUser.id },
        select: { id: true, status: true },
      },
    },
  });

  const filtered = dedupeJobs<(typeof rows)[number]>(rows)
    .filter(isItJob)
    .filter((job) => !category || inferItCategory(job) === category)
    .filter((job) => !experience || inferExperienceFilter(job) === experience)
    .filter((job) => !employment || normalizeEmploymentType(job.jobType) === employment)
    .sort((a, b) => jobQualityScore(b) - jobQualityScore(a));

  const ordered = sort === "newest"
    ? filtered
    : diversifyByCompany(filtered, Math.min(250, filtered.length), query ? 10 : 6);

  const companyCount = new Set(filtered.map((job) => companyFamilyKey(job.company))).size;
  const effectivePageSize =
    sort === "variety" ? Math.max(1, Math.min(pageSize, companyCount || 1)) : pageSize;

  const total = ordered.length;
  const jobs = ordered.slice((page - 1) * effectivePageSize, page * effectivePageSize);

  return jsonSuccess({
    jobs,
    total,
    page,
    pageSize: effectivePageSize,
    pages: Math.ceil(total / effectivePageSize),
    companyCount,
    region: "South Africa",
    category: "IT & Technology",
    sort,
  });
}
