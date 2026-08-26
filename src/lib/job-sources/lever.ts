import { cleanText, fetchJson, guessExperience } from "./http";
import { isSouthAfricanLocation } from "./south-africa";
import type { JobSourceResult, NormalizedJob } from "./types";
import { isItJob } from "./taxonomy";

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  descriptionPlain?: string;
  additionalPlain?: string;
  workplaceType?: string;
  categories?: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
  };
};

type Board = {
  token: string;
  source: string;
  company: string;
};

const BOARDS: Board[] = [
  { token: "theodo", source: "Theodo", company: "Theodo" },
  { token: "mamamoney", source: "Mama Money", company: "Mama Money" },
  { token: "dlocal", source: "dLocal", company: "dLocal" },
  { token: "Yassir", source: "Yassir", company: "Yassir" },
  { token: "freebalance.com", source: "FreeBalance", company: "FreeBalance" },
  { token: "moo", source: "MOO", company: "MOO" },
  { token: "titanwh", source: "Titan Wealth", company: "Titan Wealth" },
  { token: "binance", source: "Binance", company: "Binance" },
];


async function fetchBoard(board: Board): Promise<JobSourceResult> {
  try {
    const payload = await fetchJson<LeverJob[]>(
      `https://api.lever.co/v0/postings/${encodeURIComponent(board.token)}?mode=json`,
      8_000,
    );

    const jobs: NormalizedJob[] = payload
      .filter((job) => isSouthAfricanLocation(job.categories?.location))
      .filter((job) =>
        isItJob({
          title: job.text,
          category: `${job.categories?.team || ""} ${job.categories?.department || ""}`,
          description: `${job.descriptionPlain || ""} ${job.additionalPlain || ""}`,
        }),
      )
      .slice(0, 20)
      .map((job) => {
        const description = cleanText(
          `${job.descriptionPlain || ""} ${job.additionalPlain || ""}`,
        );
        const location = job.categories?.location || "South Africa";

        return {
          source: board.source,
          externalId: job.id,
          title: cleanText(job.text),
          company: board.company,
          description: description || `${job.text} opportunity at ${board.company}.`,
          location,
          jobType: job.categories?.commitment,
          experienceLevel: guessExperience(job.text, description),
          category:
            job.categories?.team ||
            job.categories?.department ||
            "Technology",
          currency: "ZAR",
          applyUrl: job.applyUrl || job.hostedUrl,
          sourceUrl: job.hostedUrl,
          remote: /remote/i.test(`${job.workplaceType || ""} ${location}`),
          postedAt: job.createdAt ? new Date(job.createdAt) : undefined,
          rawData: job as unknown as Record<string, unknown>,
        };
      });

    return { source: board.source, jobs };
  } catch (error) {
    return {
      source: board.source,
      jobs: [],
      error: error instanceof Error ? error.message : "Unknown Lever error",
    };
  }
}

export async function fetchSouthAfricanLeverJobs(): Promise<JobSourceResult[]> {
  return Promise.all(BOARDS.map(fetchBoard));
}
