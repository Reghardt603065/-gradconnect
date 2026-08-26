import { cleanText, fetchJson, guessExperience } from "./http";
import { isSouthAfricanLocation } from "./south-africa";
import type { JobSourceResult, NormalizedJob } from "./types";
import { isItJob } from "./taxonomy";

type GreenhouseResponse = {
  jobs: Array<{
    id: number;
    title: string;
    absolute_url: string;
    updated_at?: string;
    location?: { name?: string };
    content?: string;
    departments?: Array<{ name?: string }>;
    offices?: Array<{ name?: string }>;
  }>;
};

type Board = {
  token: string;
  source: string;
  company: string;
};

// Public Greenhouse boards with South African tech hiring. A board can stay in
// this list even when it has no suitable vacancy today; future refreshes will
// automatically pick up new SA IT roles without another code change.
const BOARDS: Board[] = [
  { token: "takealotcom", source: "Takealot Group", company: "Takealot Group" },
  { token: "luno", source: "Luno", company: "Luno" },
  { token: "ozow", source: "Ozow", company: "Ozow" },
  { token: "impact", source: "impact.com", company: "impact.com" },
  { token: "paystack", source: "Paystack", company: "Paystack" },
  { token: "2u", source: "2U", company: "2U" },
  { token: "bcbgroup", source: "BCB Group", company: "BCB Group" },
  { token: "bashdotcom", source: "Bash.com", company: "Bash.com" },
  { token: "entersekt", source: "Entersekt", company: "Entersekt" },
  { token: "jumo", source: "JUMO", company: "JUMO" },
  { token: "kerv", source: "Kerv", company: "Kerv" },
  { token: "hyperiondev", source: "HyperionDev", company: "HyperionDev" },
  { token: "bvnk", source: "BVNK", company: "BVNK" },
  { token: "livescore9", source: "LiveScore Group", company: "LiveScore Group" },
  { token: "equalexperts", source: "Equal Experts", company: "Equal Experts" },
  { token: "canonical", source: "Canonical", company: "Canonical" },
  { token: "root", source: "Root", company: "Root" },
  { token: "sonataone", source: "Sonata One", company: "Sonata One" },
  { token: "doxim", source: "Doxim", company: "Doxim" },
  { token: "sandtechholdingslimited", source: "Sand Technologies", company: "Sand Technologies" },
  { token: "wppmedia", source: "WPP Media", company: "WPP Media" },
  { token: "vmlenterprisesolutions", source: "VML", company: "VML" },
  { token: "workwize", source: "Workwize", company: "Workwize" },
  { token: "verifone", source: "Verifone", company: "Verifone" },
];

function isRelevantTechJob(job: GreenhouseResponse["jobs"][number]) {
  const departments = job.departments?.map((item) => item.name).join(" ") || "";
  return isItJob({
    title: job.title,
    category: departments,
    description: cleanText(job.content),
  });
}


async function fetchBoard(board: Board): Promise<JobSourceResult> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`;
    const payload = await fetchJson<GreenhouseResponse>(url, 8_000);

    const jobs: NormalizedJob[] = payload.jobs
      .filter((job) => isSouthAfricanLocation(job.location?.name))
      .filter(isRelevantTechJob)
      // A single large employer should not dominate each refresh. The Jobs page
      // does another company rotation when displaying results.
      .slice(0, 20)
      .map((job) => {
        const description = cleanText(job.content);
        const departments = job.departments?.map((item) => item.name).filter(Boolean).join(", ");

        return {
          source: board.source,
          externalId: String(job.id),
          title: cleanText(job.title),
          company: board.company,
          description: description || `${job.title} opportunity at ${board.company}.`,
          location: job.location?.name || "South Africa",
          jobType: undefined,
          experienceLevel: guessExperience(job.title, description),
          category: departments || "Technology",
          currency: "ZAR",
          applyUrl: job.absolute_url,
          sourceUrl: job.absolute_url,
          remote: /remote/i.test(`${job.location?.name || ""} ${description}`),
          postedAt: job.updated_at ? new Date(job.updated_at) : undefined,
          rawData: job as unknown as Record<string, unknown>,
        };
      });

    return { source: board.source, jobs };
  } catch (error) {
    return {
      source: board.source,
      jobs: [],
      error: error instanceof Error ? error.message : "Unknown Greenhouse error",
    };
  }
}

export async function fetchSouthAfricanGreenhouseJobs(): Promise<JobSourceResult[]> {
  return Promise.all(BOARDS.map(fetchBoard));
}
