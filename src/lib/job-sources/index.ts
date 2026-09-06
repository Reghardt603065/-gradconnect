import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { fetchAdzunaJobs } from "./adzuna";
import { fetchSouthAfricanGreenhouseJobs } from "./greenhouse";
import { fetchSouthAfricanSmartRecruitersJobs } from "./smartrecruiters";
import { fetchMukuruJobs } from "./breezy";
import { fetchSouthAfricanBambooJobs } from "./bamboohr";
import { fetchSouthAfricanLeverJobs } from "./lever";
import { fetchPNetJobs } from "./pnet";
import { jobCanonicalKey, sourceExternalKey } from "./dedupe";
import { inferItCategory, isItJob } from "./taxonomy";
import type { JobSourceResult, NormalizedJob } from "./types";
import { notifyUsersAboutNewJobs } from "@/services/job-notification-service";

export const JOB_REFRESH_MARKER = "GradConnect SA IT marketplace v7-pnet-mix";

function toPrismaJson(
  value: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

function validDate(value?: Date) {
  if (!value || Number.isNaN(value.getTime())) return undefined;
  return value;
}

function validMoney(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
}

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function sanitizeJob(job: NormalizedJob): NormalizedJob | null {
  const source = job.source?.trim();
  const externalId = job.externalId?.trim();
  const title = job.title?.trim();
  const company = job.company?.trim();
  const applyUrl = job.applyUrl?.trim();

  if (!source || !externalId || !title || !company || !applyUrl) return null;

  if (!isItJob(job)) return null;

  try {
    new URL(applyUrl);
  } catch {
    return null;
  }

  return {
    ...job,
    source,
    externalId,
    title,
    company,
    description: job.description?.trim() || `${title} opportunity at ${company}.`,
    location: cleanOptional(job.location) || "South Africa",
    jobType: cleanOptional(job.jobType),
    experienceLevel: cleanOptional(job.experienceLevel),
    category: inferItCategory(job),
    salaryMin: validMoney(job.salaryMin),
    salaryMax: validMoney(job.salaryMax),
    currency: cleanOptional(job.currency) || "ZAR",
    applyUrl,
    sourceUrl: cleanOptional(job.sourceUrl),
    postedAt: validDate(job.postedAt),
    expiresAt: validDate(job.expiresAt),
  };
}

async function fetchAllSources(): Promise<JobSourceResult[]> {
  // Everything starts at the same time. The old implementation waited for two
  // groups before starting the rest, which made a full refresh noticeably slow.
  const results = await Promise.allSettled([
    fetchSouthAfricanGreenhouseJobs(),
    fetchSouthAfricanSmartRecruitersJobs(),
    fetchMukuruJobs(),
    fetchSouthAfricanBambooJobs(),
    fetchSouthAfricanLeverJobs(),
    fetchPNetJobs(),
    fetchAdzunaJobs(),
  ]);

  const fallbackNames = [
    "Greenhouse boards",
    "SmartRecruiters boards",
    "Mukuru",
    "BambooHR boards",
    "Lever boards",
    "PNet marketplace",
    "Adzuna",
  ];

  const sourceResults: JobSourceResult[] = [];

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      sourceResults.push({
        source: fallbackNames[index],
        jobs: [],
        error:
          result.reason instanceof Error ? result.reason.message : "Unknown error",
      });
      return;
    }

    if (Array.isArray(result.value)) {
      sourceResults.push(...result.value);
    } else {
      sourceResults.push(result.value);
    }
  });

  return sourceResults;
}

export async function ingestJobs() {
  const sourceResults = await fetchAllSources();

  // Load existing identities once rather than doing a findUnique for every job.
  const existing = await prisma.jobListing.findMany({
    select: {
      source: true,
      externalId: true,
      title: true,
      company: true,
      location: true,
      applyUrl: true,
    },
  });

  const existingSourceIds = new Set(
    existing.map((job) => sourceExternalKey(job.source, job.externalId)),
  );
  const existingCanonical = new Set(existing.map(jobCanonicalKey));

  // Cross-source set is shared across the whole refresh, so a vacancy returned
  // by two boards is accepted only once.
  const acceptedCanonical = new Set(existingCanonical);
  const summary = [];
  const newlyImportedJobs: NormalizedJob[] = [];

  for (const sourceResult of sourceResults) {
    let invalid = 0;
    let duplicate = 0;

    const sanitized: NormalizedJob[] = [];
    const seenSourceIds = new Set<string>();

    for (const rawJob of sourceResult.jobs) {
      const job = sanitizeJob(rawJob);
      if (!job) {
        invalid += 1;
        continue;
      }

      const sourceId = sourceExternalKey(job.source, job.externalId);
      const canonical = jobCanonicalKey(job);

      if (seenSourceIds.has(sourceId)) {
        duplicate += 1;
        continue;
      }
      seenSourceIds.add(sourceId);

      if (existingSourceIds.has(sourceId) || acceptedCanonical.has(canonical)) {
        duplicate += 1;
        continue;
      }

      acceptedCanonical.add(canonical);
      sanitized.push(job);
    }

    let inserted = 0;
    let failed = invalid;

    if (sanitized.length) {
      try {
        const created = await prisma.jobListing.createMany({
          data: sanitized.map((job) => {
            const rawData = toPrismaJson(job.rawData);
            return {
              source: job.source,
              externalId: job.externalId,
              title: job.title,
              company: job.company,
              description: job.description,
              location: job.location,
              jobType: job.jobType,
              experienceLevel: job.experienceLevel,
              category: job.category,
              salaryMin: job.salaryMin,
              salaryMax: job.salaryMax,
              currency: job.currency,
              applyUrl: job.applyUrl,
              sourceUrl: job.sourceUrl,
              remote: job.remote,
              postedAt: job.postedAt,
              expiresAt: job.expiresAt,
              ...(rawData !== undefined ? { rawData } : {}),
            };
          }),
          skipDuplicates: true,
        });

        inserted = created.count;
        failed += Math.max(0, sanitized.length - created.count);

        if (created.count > 0) {
          newlyImportedJobs.push(...sanitized.slice(0, created.count));
        }

        for (const job of sanitized) {
          existingSourceIds.add(sourceExternalKey(job.source, job.externalId));
        }
      } catch (error) {
        // A bad source should never take down the Jobs page. Log it and move on
        // to the next company board.
        failed += sanitized.length;
        console.error(`Failed to batch-save jobs from ${sourceResult.source}:`, error);
      }
    }

    const warningParts = [
      sourceResult.error,
      duplicate ? `${duplicate} duplicate job(s) skipped` : undefined,
      invalid ? `${invalid} invalid job(s) skipped` : undefined,
    ].filter(Boolean);

    await prisma.jobFetchLog.create({
      data: {
        source: sourceResult.source,
        fetched: sourceResult.jobs.length,
        inserted,
        updated: 0,
        failed,
        error: warningParts.length ? warningParts.join("; ") : undefined,
        completedAt: new Date(),
      },
    });

    summary.push({
      source: sourceResult.source,
      fetched: sourceResult.jobs.length,
      inserted,
      updated: 0,
      duplicates: duplicate,
      failed,
      warning: sourceResult.error,
    });
  }

  await notifyUsersAboutNewJobs(newlyImportedJobs);

  await prisma.jobFetchLog.create({
    data: {
      source: JOB_REFRESH_MARKER,
      fetched: summary.reduce((total, item) => total + item.fetched, 0),
      inserted: summary.reduce((total, item) => total + item.inserted, 0),
      updated: 0,
      failed: summary.reduce((total, item) => total + item.failed, 0),
      completedAt: new Date(),
    },
  });

  return summary;
}
