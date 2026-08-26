import { cleanText, fetchJson, guessExperience } from "./http";
import { isSouthAfricanLocation } from "./south-africa";
import type { JobSourceResult, NormalizedJob } from "./types";
import { isItJob } from "./taxonomy";

type BreezyPosition = {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  url?: string;
  friendly_id?: string;
  published_date?: string;
  creation_date?: string;
  type?: string;
  department?: string;
  category?: string;
  experience?: string;
  description?: string;
  is_remote?: boolean;
  location?: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

type BreezyResponse = BreezyPosition[] | { positions?: BreezyPosition[] };


function locationText(job: BreezyPosition) {
  return (
    job.location?.name ||
    [job.location?.city, job.location?.state, job.location?.country]
      .filter(Boolean)
      .join(", ") ||
    "South Africa"
  );
}

export async function fetchMukuruJobs(): Promise<JobSourceResult> {
  try {
    const payload = await fetchJson<BreezyResponse>(
      "https://mukuru.breezy.hr/json",
      10_000,
    );
    const positions = Array.isArray(payload) ? payload : payload.positions || [];

    const jobs: NormalizedJob[] = positions
      .filter((job) => isSouthAfricanLocation(locationText(job)))
      .filter((job) =>
        isItJob({
          title: job.name || job.title,
          category: `${job.department || ""} ${job.category || ""}`,
          description: cleanText(job.description),
        }),
      )
      .map((job) => {
        const title = cleanText(job.name || job.title || "Technology opportunity");
        const description = cleanText(job.description);
        const id = job._id || job.id || job.friendly_id || job.url || title;
        const url =
          job.url ||
          (job.friendly_id
            ? `https://mukuru.breezy.hr/p/${job.friendly_id}`
            : "https://mukuru.breezy.hr/");

        return {
          source: "Mukuru",
          externalId: String(id),
          title,
          company: "Mukuru",
          description: description || `${title} opportunity at Mukuru.`,
          location: locationText(job),
          jobType: job.type,
          experienceLevel: job.experience || guessExperience(title, description),
          category: job.department || job.category || "Technology",
          currency: "ZAR",
          applyUrl: url,
          sourceUrl: url,
          remote: Boolean(job.is_remote) || /remote/i.test(locationText(job)),
          postedAt: job.published_date
            ? new Date(job.published_date)
            : job.creation_date
              ? new Date(job.creation_date)
              : undefined,
          rawData: job as unknown as Record<string, unknown>,
        };
      });

    return { source: "Mukuru", jobs };
  } catch (error) {
    return {
      source: "Mukuru",
      jobs: [],
      error: error instanceof Error ? error.message : "Unknown Breezy error",
    };
  }
}
