import { cleanText, fetchJson, guessExperience } from "./http";
import type { JobSourceResult, NormalizedJob } from "./types";

type AdzunaResponse = {
  results: Array<{
    id: string;
    title: string;
    description: string;
    redirect_url: string;
    created?: string;
    salary_min?: number;
    salary_max?: number;
    company?: { display_name?: string };
    location?: { display_name?: string };
    category?: { label?: string };
    contract_type?: string;
  }>;
};

const SEARCHES = [
  "graduate developer",
  "junior software developer",
  "software engineer",
  "IT internship",
  "data analyst",
  "cybersecurity junior",
];

async function searchSouthAfrica(search: string) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error(
      "Skipped because ADZUNA_APP_ID and ADZUNA_APP_KEY are not configured",
    );
  }

  // Deliberately fixed to South Africa. ADZUNA_COUNTRY is no longer used here
  // because the GradConnect Jobs feed is intended to be SA-only.
  const url = new URL("https://api.adzuna.com/v1/api/jobs/za/search/1");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "30");
  url.searchParams.set("what", search);
  url.searchParams.set("content-type", "application/json");

  const payload = await fetchJson<AdzunaResponse>(url.toString());
  return payload.results;
}

export async function fetchAdzunaJobs(): Promise<JobSourceResult> {
  try {
    const responses = await Promise.allSettled(
      SEARCHES.map((search) => searchSouthAfrica(search)),
    );

    const unique = new Map<string, AdzunaResponse["results"][number]>();
    const warnings: string[] = [];

    for (const response of responses) {
      if (response.status === "fulfilled") {
        for (const job of response.value) unique.set(String(job.id), job);
      } else {
        warnings.push(
          response.reason instanceof Error
            ? response.reason.message
            : "Unknown Adzuna search error",
        );
      }
    }

    if (unique.size === 0 && warnings.length) {
      return { source: "Adzuna", jobs: [], error: warnings[0] };
    }

    const jobs: NormalizedJob[] = Array.from(unique.values()).map((job) => {
      const description = cleanText(job.description);
      return {
        source: "Adzuna",
        externalId: String(job.id),
        title: cleanText(job.title),
        company: job.company?.display_name || "Unknown company",
        description,
        location: job.location?.display_name || "South Africa",
        jobType: job.contract_type,
        experienceLevel: guessExperience(job.title, description),
        category: job.category?.label,
        salaryMin: job.salary_min ? Math.round(job.salary_min) : undefined,
        salaryMax: job.salary_max ? Math.round(job.salary_max) : undefined,
        currency: "ZAR",
        applyUrl: job.redirect_url,
        sourceUrl: job.redirect_url,
        remote: /remote|work from home/i.test(`${job.title} ${job.description}`),
        postedAt: job.created ? new Date(job.created) : undefined,
        rawData: job as unknown as Record<string, unknown>,
      };
    });

    return {
      source: "Adzuna",
      jobs,
      error: warnings.length
        ? `${warnings.length} Adzuna search request(s) failed; other SA results were still imported.`
        : undefined,
    };
  } catch (error) {
    return {
      source: "Adzuna",
      jobs: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
