import { cleanText, fetchJson, guessExperience } from "./http";
import { isSouthAfricanLocation } from "./south-africa";
import { isItJob } from "./taxonomy";
import type { JobSourceResult, NormalizedJob } from "./types";

type AshbyLocation = {
  location?: string;
  address?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
};

type AshbyJob = {
  id?: string;
  title?: string;
  location?: string;
  secondaryLocations?: AshbyLocation[];
  department?: string;
  team?: string;
  employmentType?: string;
  isRemote?: boolean;
  workplaceType?: string;
  publishedAt?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
};

type AshbyResponse = {
  jobs?: AshbyJob[];
};

type Board = {
  slug: string;
  company: string;
};

const BOARDS: Board[] = [
  { slug: "primer.io", company: "Primer" },
  { slug: "tillo", company: "Tillo" },
  { slug: "boam", company: "Boam AI" },
  { slug: "share", company: "Share" },
  { slug: "M-KOPA", company: "M-KOPA" },
  { slug: "kraken.com", company: "Kraken" },
  { slug: "block-labs", company: "Block Labs" },
  { slug: "uipath", company: "UiPath" },
  { slug: "Scale Army Careers", company: "Scale Army" },
  { slug: "the-flex", company: "The Flex" },
  { slug: "hirehangar", company: "Hire Hangar" },
];

function locationText(job: AshbyJob) {
  const locations = [
    job.location,
    ...(job.secondaryLocations || []).flatMap((item) => [
      item.location,
      item.address?.addressLocality,
      item.address?.addressRegion,
      item.address?.addressCountry,
    ]),
  ]
    .map((value) => cleanText(value))
    .filter(Boolean);

  return [...new Set(locations)].join(", ") || "South Africa";
}

async function fetchBoard(board: Board): Promise<JobSourceResult> {
  try {
    const url = new URL(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.slug)}`,
    );
    const payload = await fetchJson<AshbyResponse>(url.toString(), 7_000);

    const jobs: NormalizedJob[] = (payload.jobs || [])
      .filter((job) => isSouthAfricanLocation(locationText(job)))
      .filter((job) =>
        isItJob({
          title: job.title,
          category: `${job.department || ""} ${job.team || ""}`,
          description: job.descriptionPlain || job.descriptionHtml,
        }),
      )
      .slice(0, 20)
      .map((job) => {
        const title = cleanText(job.title);
        const description = cleanText(job.descriptionPlain || job.descriptionHtml);
        const location = locationText(job);
        const applyUrl = job.applyUrl || job.jobUrl || "";
        const postedAt = job.publishedAt ? new Date(job.publishedAt) : undefined;

        return {
          source: `Ashby · ${board.company}`,
          externalId: job.id || applyUrl,
          title,
          company: board.company,
          description: description || `${title} opportunity at ${board.company}.`,
          location,
          jobType: job.employmentType,
          experienceLevel: guessExperience(title, description),
          category: job.department || job.team || "Technology",
          currency: "ZAR",
          applyUrl,
          sourceUrl: job.jobUrl || applyUrl,
          remote: Boolean(job.isRemote || /remote/i.test(job.workplaceType || "")),
          postedAt:
            postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : undefined,
          rawData: job as unknown as Record<string, unknown>,
        };
      })
      .filter((job) => Boolean(job.externalId && job.title && job.applyUrl));

    return { source: `Ashby · ${board.company}`, jobs };
  } catch (error) {
    return {
      source: `Ashby · ${board.company}`,
      jobs: [],
      error: error instanceof Error ? error.message : "Unknown Ashby error",
    };
  }
}

export async function fetchSouthAfricanAshbyJobs(): Promise<JobSourceResult[]> {
  return Promise.all(BOARDS.map(fetchBoard));
}
