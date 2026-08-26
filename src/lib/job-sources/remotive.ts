import { cleanText, fetchJson, guessExperience } from "./http";
import type { JobSourceResult } from "./types";
import { isSouthAfricanLocation } from "./south-africa";

type RemotiveResponse = {
  jobs: Array<{
    id: number;
    url: string;
    title: string;
    company_name: string;
    category: string;
    job_type: string;
    publication_date: string;
    candidate_required_location: string;
    salary?: string;
    description: string;
  }>;
};

export async function fetchRemotiveJobs(): Promise<JobSourceResult> {
  try {
    const payload = await fetchJson<RemotiveResponse>(
      "https://remotive.com/api/remote-jobs?category=software-dev&limit=50",
    );

    const jobs = payload.jobs.map((job) => {
      const description = cleanText(job.description);
      return {
        source: "Remotive",
        externalId: String(job.id),
        title: job.title,
        company: job.company_name,
        description,
        location: job.candidate_required_location || "Remote",
        jobType: job.job_type,
        experienceLevel: guessExperience(job.title, description),
        category: job.category,
        applyUrl: job.url,
        sourceUrl: job.url,
        remote: true,
        postedAt: job.publication_date ? new Date(job.publication_date) : undefined,
        rawData: job as unknown as Record<string, unknown>,
      };
    }).filter((job) => isSouthAfricanLocation(job.location));

    return { source: "Remotive", jobs };
  } catch (error) {
    return { source: "Remotive", jobs: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}
