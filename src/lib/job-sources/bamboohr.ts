import { cleanText, fetchJson, guessExperience } from "./http";
import { isSouthAfricanLocation } from "./south-africa";
import type { JobSourceResult, NormalizedJob } from "./types";
import { isItJob } from "./taxonomy";

type BambooLocation = {
  city?: string | null;
  state?: string | null;
  province?: string | null;
  country?: string | null;
};

type BambooJob = {
  id: string;
  jobOpeningName: string;
  departmentLabel?: string | null;
  employmentStatusLabel?: string | null;
  employmentType?: string | null;
  location?: BambooLocation | string | null;
  atsLocation?: BambooLocation | null;
  isRemote?: boolean | null;
  locationType?: string | null;
};

type BambooList = {
  result: BambooJob[];
};

type Board = {
  subdomain: string;
  source: string;
  company: string;
};

const BOARDS: Board[] = [
  { subdomain: "peachpayments", source: "Peach Payments", company: "Peach Payments" },
  { subdomain: "kurtosys", source: "Kurtosys", company: "Kurtosys" },
];


function locationObjectText(location?: BambooLocation | string | null) {
  if (!location) return "";
  if (typeof location === "string") return location;
  return [location.city, location.state || location.province, location.country]
    .filter(Boolean)
    .join(", ");
}

function locationText(job: BambooJob) {
  const primary = locationObjectText(job.location);
  const fallback = locationObjectText(job.atsLocation);
  const value = primary || fallback;
  if (value) return value;
  if (job.isRemote || job.locationType === "1") return "Remote, South Africa";
  return "South Africa";
}

async function fetchBoard(board: Board): Promise<JobSourceResult> {
  try {
    const base = `https://${board.subdomain}.bamboohr.com`;
    const payload = await fetchJson<BambooList>(`${base}/careers/list`, 8_000);

    const jobs: NormalizedJob[] = payload.result
      .filter((job) => {
        const location = locationText(job);
        return isSouthAfricanLocation(location) || /\bZA\b/i.test(location);
      })
      .filter((job) =>
        isItJob({
          title: job.jobOpeningName,
          category: job.departmentLabel,
        }),
      )
      .slice(0, 20)
      .map((job) => {
        const title = cleanText(job.jobOpeningName);
        const location = locationText(job);
        const applyUrl = `${base}/careers/${job.id}`;

        return {
          source: board.source,
          externalId: String(job.id),
          title,
          company: board.company,
          // Keep refreshes light: the list endpoint is enough for the card. Full
          // requirements load from the official employer page when Apply is clicked.
          description: `${title} opportunity at ${board.company}. Open the listing for the full role description and requirements.`,
          location,
          jobType: job.employmentType || job.employmentStatusLabel || undefined,
          experienceLevel: guessExperience(title, ""),
          category: job.departmentLabel || "Technology",
          currency: "ZAR",
          applyUrl,
          sourceUrl: applyUrl,
          remote: Boolean(job.isRemote) || job.locationType === "1" || /remote/i.test(location),
          rawData: job as unknown as Record<string, unknown>,
        };
      });

    return { source: board.source, jobs };
  } catch (error) {
    return {
      source: board.source,
      jobs: [],
      error: error instanceof Error ? error.message : "Unknown BambooHR error",
    };
  }
}

export async function fetchSouthAfricanBambooJobs(): Promise<JobSourceResult[]> {
  return Promise.all(BOARDS.map(fetchBoard));
}
