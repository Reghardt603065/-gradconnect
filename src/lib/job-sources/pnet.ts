import { cleanText, fetchText, guessExperience } from "./http";
import { isItJob } from "./taxonomy";
import type { JobSourceResult, NormalizedJob } from "./types";

const BASE_URL = "https://www.pnet.co.za";

const CATEGORY_PAGES = [
  { path: "/jobs/software-developer", label: "Software Development" },
  { path: "/jobs/full-stack-developer", label: "Software Development" },
  { path: "/jobs/junior-software-developer", label: "Graduate & Internship" },
  { path: "/jobs/devops", label: "Cloud & DevOps" },
  { path: "/jobs/cloud-engineer", label: "Cloud & DevOps" },
  { path: "/jobs/cybersecurity", label: "Cybersecurity" },
  { path: "/jobs/data-engineer", label: "Data & AI" },
  { path: "/jobs/data-analyst", label: "Data & AI" },
  { path: "/jobs/qa-engineer", label: "QA & Testing" },
  { path: "/jobs/software-tester", label: "QA & Testing" },
  { path: "/jobs/it-support", label: "IT Support & Infrastructure" },
  { path: "/jobs/network-engineer", label: "IT Support & Infrastructure" },
  { path: "/jobs/business-systems-analyst", label: "Business & Systems Analysis" },
] as const;

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&#(\d+);/g, (_match, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : " ";
    });
}

function stripHtml(value: string) {
  return cleanText(
    decodeHtml(
      value
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " "),
    ),
  );
}

function htmlLines(value: string) {
  return decodeHtml(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<(?:br|hr)\b[^>]*>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6]|section|article|a|span)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isNoiseLine(value: string) {
  return (
    value.length > 180 ||
    /^(?:more|new|save|apply|easy apply|send me new job matches|create job agent|jobs by email)$/i.test(value) ||
    /^(?:\d+\s+)?(?:minutes?|hours?|days?|weeks?|months?) ago$/i.test(value) ||
    /^published:/i.test(value)
  );
}

function looksLikeLocation(value: string) {
  return /\b(?:south africa|gauteng|western cape|eastern cape|northern cape|kwazulu|kzn|free state|limpopo|mpumalanga|north west|johannesburg|pretoria|tshwane|centurion|midrand|sandton|randburg|roodepoort|cape town|stellenbosch|paarl|bellville|durban|umhlanga|pietermaritzburg|bloemfontein|gqeberha|port elizabeth|east london|polokwane|mbombela|nelspruit|rustenburg|potchefstroom|klerksdorp|remote|hybrid|home office)\b/i.test(value);
}

function parseRelativeDate(value: string) {
  const text = value.trim().toLowerCase();
  const now = new Date();
  if (/just now|today|new/.test(text)) return now;
  if (/yesterday/.test(text)) {
    now.setDate(now.getDate() - 1);
    return now;
  }

  const match = text.match(/(\d+)\s+(minute|hour|day|week|month)s?\s+ago/);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount)) return undefined;

  if (unit === "minute") now.setMinutes(now.getMinutes() - amount);
  else if (unit === "hour") now.setHours(now.getHours() - amount);
  else if (unit === "day") now.setDate(now.getDate() - amount);
  else if (unit === "week") now.setDate(now.getDate() - amount * 7);
  else if (unit === "month") now.setMonth(now.getMonth() - amount);
  return now;
}

function parseSalary(text: string) {
  const amounts = [...text.matchAll(/R\s*([\d][\d\s,.]{2,})/gi)]
    .map((match) => Number(match[1].replace(/[^\d]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 100);

  if (!amounts.length) return {};
  return {
    salaryMin: Math.min(...amounts),
    salaryMax: Math.max(...amounts),
    currency: "ZAR",
  };
}

function normalizedHref(href: string) {
  try {
    return new URL(decodeHtml(href), BASE_URL).toString();
  } catch {
    return "";
  }
}

export function parsePNetPage(html: string, category: string): NormalizedJob[] {
  const anchorRegex = /<a\b[^>]*href=["']([^"']*\/jobs--[^"']*--\d+-inline\.html(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const anchors = [...html.matchAll(anchorRegex)];
  const seenIds = new Set<string>();
  const jobs: NormalizedJob[] = [];

  for (let index = 0; index < anchors.length; index += 1) {
    const match = anchors[index];
    const href = normalizedHref(match[1]);
    const title = stripHtml(match[2]);
    const externalId = href.match(/--(\d+)-inline\.html/i)?.[1];

    if (!href || !externalId || !title || isNoiseLine(title) || seenIds.has(externalId)) continue;

    const start = (match.index || 0) + match[0].length;
    const nextIndex = anchors[index + 1]?.index;
    const end = Math.min(nextIndex ?? start + 14_000, start + 14_000);
    const lines = htmlLines(html.slice(start, end));

    const locationIndex = lines.findIndex(
      (line, lineIndex) => lineIndex < 12 && looksLikeLocation(line),
    );
    const companyCandidates = lines.slice(0, locationIndex >= 0 ? locationIndex : 5);
    const company = companyCandidates.find(
      (line) =>
        !isNoiseLine(line) &&
        line.toLowerCase() !== title.toLowerCase() &&
        !/^R\s*[\d]/i.test(line),
    );

    if (!company) continue;
    const location = locationIndex >= 0 ? lines[locationIndex] : "South Africa";

    const contentStart = locationIndex >= 0 ? locationIndex + 1 : 1;
    const contentLines: string[] = [];
    for (const line of lines.slice(contentStart, contentStart + 14)) {
      if (/^more$/i.test(line)) break;
      if (/^(?:\d+\s+)?(?:minutes?|hours?|days?|weeks?|months?) ago$/i.test(line)) break;
      if (/^(?:just now|today|yesterday|new)$/i.test(line)) break;
      if (isNoiseLine(line) || /^R\s*[\d]/i.test(line)) continue;
      if (!contentLines.includes(line)) contentLines.push(line);
    }

    const description =
      contentLines.join(" ").slice(0, 1800) || `${title} opportunity at ${company}.`;
    const dateLine = lines.find((line) => /(?:ago|just now|today|yesterday)/i.test(line));
    const jobTypeLine = lines.find((line) =>
      /\b(?:full[ -]?time|part[ -]?time|permanent|contract|internship|learnership|temporary)\b/i.test(line),
    );
    const salary = parseSalary(lines.slice(0, 12).join(" "));

    const normalized: NormalizedJob = {
      source: "PNet",
      externalId,
      title,
      company,
      description,
      location,
      jobType: jobTypeLine,
      experienceLevel: guessExperience(title, description),
      category,
      ...salary,
      applyUrl: href,
      sourceUrl: href,
      remote: /\b(?:remote|work from home|home office)\b/i.test(`${location} ${description}`),
      postedAt: dateLine ? parseRelativeDate(dateLine) : undefined,
      rawData: { marketplace: "PNet", categoryPage: category },
    };

    if (isItJob(normalized)) {
      seenIds.add(externalId);
      jobs.push(normalized);
    }
  }

  return jobs;
}

async function fetchCategory(path: string, category: string): Promise<JobSourceResult> {
  const source = `PNet · ${category}`;
  try {
    const html = await fetchText(`${BASE_URL}${path}`, 10_000, {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; GradConnect-Academic-Project/1.0)",
      "X-GradConnect-Purpose": "academic job discovery",
    });
    return { source, jobs: parsePNetPage(html, category) };
  } catch (error) {
    return {
      source,
      jobs: [],
      error: error instanceof Error ? error.message : "Unknown PNet error",
    };
  }
}

export async function fetchPNetJobs(): Promise<JobSourceResult[]> {
  return Promise.all(CATEGORY_PAGES.map((page) => fetchCategory(page.path, page.label)));
}
