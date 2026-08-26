import { cleanText, fetchJson, guessExperience } from "./http";
import { isSouthAfricanLocation } from "./south-africa";
import { isItJob } from "./taxonomy";
import type { JobSourceResult, NormalizedJob } from "./types";

type WorkableLocation = {
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  fullLocation?: string;
  location_str?: string;
};

type WorkableJob = {
  uuid?: string;
  id?: string;
  shortcode?: string;
  code?: string;
  title?: string;
  companyName?: string;
  company_name?: string;
  companySlug?: string;
  city?: string;
  state?: string;
  country?: string;
  company?: {
    name?: string;
    slug?: string;
    website?: string;
  };
  department?: string;
  function?: string;
  industry?: string;
  employmentType?: string;
  employment_type?: string;
  experienceLevel?: string;
  experience?: string;
  workplace?: string;
  isRemote?: boolean;
  telecommuting?: boolean;
  location?: WorkableLocation | string;
  locations?: WorkableLocation[];
  url?: string;
  shortlink?: string;
  applyUrl?: string;
  application_url?: string;
  linkoutUrl?: string;
  publishedAt?: string;
  published_on?: string;
  createdAt?: string;
  created_at?: string;
  descriptionHtml?: string;
  descriptionText?: string;
  description?: string;
  full_description?: string;
  requirementsHtml?: string;
  benefitsHtml?: string;
};

type WorkableSearchResponse = {
  jobs?: WorkableJob[];
  results?: WorkableJob[];
  nextPageToken?: string;
  next_page_token?: string;
};

const SEARCHES = [
  "software engineer",
  "software developer",
  "data engineer",
  "data analyst",
  "devops cloud",
  "cybersecurity",
  "qa engineer",
  "IT graduate",
] as const;

type DirectBoard = { slug: string; company: string };

const DIRECT_BOARDS: DirectBoard[] = [
  { slug: "electrum", company: "Electrum" },
  { slug: "vista-group", company: "Vista Group" },
  { slug: "clickatell", company: "Clickatell" },
  { slug: "upstream", company: "Upstream" },
  { slug: "kingmakers", company: "KingMakers" },
  { slug: "deployteq", company: "Deployteq" },
  { slug: "huzzle", company: "Huzzle" },
  { slug: "vivo-energy", company: "Vivo Energy" },
  { slug: "opsfi", company: "OpsFi" },
  { slug: "remote-recruitment", company: "Remote Recruitment" },
  { slug: "sihamco", company: "SIHAMCO" },
];

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function companyName(job: WorkableJob, fallbackCompany?: string) {
  return cleanText(
    job.companyName ||
      job.company_name ||
      job.company?.name ||
      job.companySlug ||
      fallbackCompany ||
      "",
  );
}

function locationParts(location?: WorkableLocation | string) {
  if (!location) return [];
  if (typeof location === "string") return [location];
  return [
    location.fullLocation,
    location.location_str,
    location.city,
    location.region,
    location.country,
    location.countryCode?.toUpperCase() === "ZA" ? "South Africa" : undefined,
  ].filter((value): value is string => Boolean(value));
}

function locationText(job: WorkableJob) {
  const values = [
    ...locationParts(job.location),
    job.city,
    job.state,
    job.country,
    ...(job.locations || []).flatMap(locationParts),
  ];
  const unique = [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];
  return unique.join(", ") || "South Africa";
}

function descriptionText(job: WorkableJob) {
  return cleanText(
    [
      job.descriptionText,
      job.description,
      job.full_description,
      job.descriptionHtml,
      job.requirementsHtml,
      job.benefitsHtml,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function normalizeJob(job: WorkableJob, fallbackCompany?: string): NormalizedJob | null {
  const title = cleanText(job.title);
  const company = companyName(job, fallbackCompany);
  const location = locationText(job);
  const description = descriptionText(job);
  const applyUrl = cleanText(
    job.linkoutUrl || job.applyUrl || job.application_url || job.url || job.shortlink,
  );

  if (!title || !company || !applyUrl) return null;
  if (!isSouthAfricanLocation(location)) return null;
  if (
    !isItJob({
      title,
      category: `${job.department || ""} ${job.function || ""} ${job.industry || ""}`,
      description,
    })
  ) {
    return null;
  }

  const externalId = cleanText(job.uuid || job.id || job.shortcode || job.code) ||
    `workable-${hashText(`${company}|${title}|${location}|${applyUrl}`)}`;

  const postedValue = job.publishedAt || job.published_on || job.createdAt || job.created_at;
  const postedAt = postedValue ? new Date(postedValue) : undefined;

  return {
    source: "Workable",
    externalId,
    title,
    company,
    description: description || `${title} opportunity at ${company}.`,
    location,
    jobType: job.employmentType || job.employment_type,
    experienceLevel:
      job.experienceLevel || job.experience || guessExperience(title, description),
    category: job.department || job.function || "Technology",
    currency: "ZAR",
    applyUrl,
    sourceUrl: job.url || job.shortlink || applyUrl,
    remote: Boolean(
      job.isRemote ||
        job.telecommuting ||
        /remote/i.test(`${job.workplace || ""} ${location}`),
    ),
    postedAt:
      postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : undefined,
    rawData: job as unknown as Record<string, unknown>,
  };
}

async function fetchSearch(query: string): Promise<JobSourceResult> {
  const source = `Workable · ${query}`;

  try {
    const url = new URL("https://jobs.workable.com/api/v1/jobs");
    // Workable has used both query and q on versions of the public search
    // endpoint. Supplying both is harmless and keeps the adapter resilient.
    url.searchParams.set("query", query);
    url.searchParams.set("q", query);
    url.searchParams.set("location", "South Africa");
    url.searchParams.set("limit", "20");

    const payload = await fetchJson<WorkableSearchResponse>(url.toString(), 7_000);
    const rows = payload.jobs || payload.results || [];
    const jobs = rows
      .map((job) => normalizeJob(job))
      .filter((job): job is NormalizedJob => Boolean(job));

    return { source, jobs };
  } catch (error) {
    return {
      source,
      jobs: [],
      error: error instanceof Error ? error.message : "Unknown Workable error",
    };
  }
}


async function fetchDirectBoard(board: DirectBoard): Promise<JobSourceResult> {
  const source = `Workable · ${board.company}`;

  try {
    const url = new URL(
      `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(board.slug)}`,
    );
    url.searchParams.set("details", "true");

    const payload = await fetchJson<{ name?: string; jobs?: WorkableJob[] }>(
      url.toString(),
      7_000,
    );
    const fallbackCompany = cleanText(payload.name) || board.company;
    const jobs = (payload.jobs || [])
      .map((job) => normalizeJob(job, fallbackCompany))
      .filter((job): job is NormalizedJob => Boolean(job))
      .slice(0, 30);

    return { source, jobs };
  } catch (error) {
    return {
      source,
      jobs: [],
      error: error instanceof Error ? error.message : "Unknown Workable board error",
    };
  }
}

/**
 * Workable's public marketplace gives GradConnect broad employer variety while
 * still linking users to Workable/employer application pages rather than an
 * intermediary job board that may block deep links.
 */
export async function fetchSouthAfricanWorkableJobs(): Promise<JobSourceResult[]> {
  const [searchResults, boardResults] = await Promise.all([
    Promise.all(SEARCHES.map(fetchSearch)),
    Promise.all(DIRECT_BOARDS.map(fetchDirectBoard)),
  ]);
  return [...searchResults, ...boardResults];
}
