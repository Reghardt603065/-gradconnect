import { cleanText, fetchJson, guessExperience } from "./http";
import type { JobSourceResult } from "./types";
import { isSouthAfricanLocation } from "./south-africa";

type ArbeitnowResponse = {
  data: Array<{
    slug: string;
    company_name: string;
    title: string;
    description: string;
    remote: boolean;
    url: string;
    tags?: string[];
    job_types?: string[];
    location?: string;
    created_at?: number;
  }>;
};

export async function fetchArbeitnowJobs(): Promise<JobSourceResult> {
  try {
    const payload = await fetchJson<ArbeitnowResponse>(
      "https://www.arbeitnow.com/api/job-board-api",
    );

    const jobs = payload.data.slice(0, 100).map((job) => {
      const description = cleanText(job.description);
      return {
        source: "Arbeitnow",
        externalId: job.slug,
        title: job.title,
        company: job.company_name,
        description,
        location: job.location || (job.remote ? "Remote" : "Not specified"),
        jobType: job.job_types?.join(", ") || undefined,
        experienceLevel: guessExperience(job.title, description),
        category: job.tags?.join(", ") || "Technology",
        applyUrl: job.url,
        sourceUrl: job.url,
        remote: job.remote,
        postedAt: job.created_at ? new Date(job.created_at * 1000) : undefined,
        rawData: job as unknown as Record<string, unknown>,
      };
    }).filter((job) => isSouthAfricanLocation(job.location));

    return { source: "Arbeitnow", jobs };
  } catch (error) {
    return { source: "Arbeitnow", jobs: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}
